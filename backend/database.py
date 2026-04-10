"""
PostgreSQL star schema + DuckDB in-memory analytics layer.
Star schema: fact_sales → dim_product, dim_customer, dim_date, dim_region
DuckDB used for ad-hoc NL→SQL queries (runs SQL directly on the parquet/pg data).
"""
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Date, ForeignKey, text
)
from sqlalchemy.orm import DeclarativeBase, Session
import os, pandas as pd

DB_URL = os.getenv("DATABASE_URL", "sqlite:///aviation_bi.db")

engine = create_engine(DB_URL, pool_pre_ping=True)

class Base(DeclarativeBase):
    pass

class DimProduct(Base):
    __tablename__ = "dim_product"
    product_id   = Column(Integer, primary_key=True, autoincrement=True)
    product_name = Column(String(120), unique=True)
    category     = Column(String(60))
    base_price   = Column(Float)
    abc_class    = Column(String(1))

class DimCustomer(Base):
    __tablename__ = "dim_customer"
    customer_id   = Column(Integer, primary_key=True, autoincrement=True)
    customer_name = Column(String(120), unique=True)
    region        = Column(String(60))

class DimDate(Base):
    __tablename__ = "dim_date"
    date_id  = Column(Integer, primary_key=True)   # YYYYMMDD
    date     = Column(Date, unique=True)
    year     = Column(Integer)
    month    = Column(Integer)
    quarter  = Column(String(2))
    month_name = Column(String(10))

class FactSales(Base):
    __tablename__ = "fact_sales"
    txn_id      = Column(Integer, primary_key=True, autoincrement=True)
    txn_code    = Column(String(12))
    date_id     = Column(Integer, ForeignKey("dim_date.date_id"))
    product_id  = Column(Integer, ForeignKey("dim_product.product_id"))
    customer_id = Column(Integer, ForeignKey("dim_customer.customer_id"))
    units_sold  = Column(Integer)
    unit_price  = Column(Float)
    revenue     = Column(Float)

def create_schema():
    Base.metadata.create_all(engine)

def load_from_df(df: pd.DataFrame):
    """Load a sales DataFrame into the star schema."""
    from datetime import datetime
    create_schema()

    with Session(engine) as s:
        # Products
        prod_map = {}
        for _, row in df[["Product_Name","Category","ABC_Class"]].drop_duplicates().iterrows():
            p = s.query(DimProduct).filter_by(product_name=row.Product_Name).first()
            if not p:
                p = DimProduct(product_name=row.Product_Name, category=row.Category,
                               base_price=0, abc_class=row.ABC_Class)
                s.add(p)
                s.flush()
            prod_map[row.Product_Name] = p.product_id

        # Customers
        cust_map = {}
        for _, row in df[["Customer","Region"]].drop_duplicates().iterrows():
            c = s.query(DimCustomer).filter_by(customer_name=row.Customer).first()
            if not c:
                c = DimCustomer(customer_name=row.Customer, region=row.Region)
                s.add(c); s.flush()
            cust_map[row.Customer] = c.customer_id

        # Dates
        date_map = {}
        for d in df["Date"].unique():
            dt = pd.Timestamp(d)
            did = int(dt.strftime("%Y%m%d"))
            if not s.query(DimDate).filter_by(date_id=did).first():
                s.add(DimDate(date_id=did, date=dt.date(), year=dt.year,
                              month=dt.month, quarter=f"Q{(dt.month-1)//3+1}",
                              month_name=dt.strftime("%b")))
            date_map[d] = did

        # Facts
        for _, row in df.iterrows():
            s.add(FactSales(
                txn_code=row.Transaction_ID,
                date_id=date_map[row.Date],
                product_id=prod_map[row.Product_Name],
                customer_id=cust_map[row.Customer],
                units_sold=int(row.Units_Sold),
                unit_price=float(row.Unit_Price),
                revenue=float(row.Revenue),
            ))
        s.commit()
    print("[db] Star schema loaded OK")

def get_df() -> pd.DataFrame:
    """Pull full flat fact table back as DataFrame for analytics."""
    query = """
        SELECT f.txn_code AS "Transaction_ID",
               d.date::text AS "Date", d.year AS "Year",
               d.month AS "Month", d.month_name AS "Month_Name",
               d.quarter AS "Quarter",
               p.product_name AS "Product_Name",
               p.category AS "Category", p.abc_class AS "ABC_Class",
               c.customer_name AS "Customer", c.region AS "Region",
               f.units_sold AS "Units_Sold",
               f.unit_price AS "Unit_Price",
               f.revenue AS "Revenue"
        FROM fact_sales f
        JOIN dim_date    d ON f.date_id    = d.date_id
        JOIN dim_product p ON f.product_id = p.product_id
        JOIN dim_customer c ON f.customer_id = c.customer_id
    """
    with engine.connect() as conn:
        return pd.read_sql(text(query), conn)

SCHEMA_DESCRIPTION = """
Star schema tables in PostgreSQL:

fact_sales       — one row per transaction
  txn_code       VARCHAR  (e.g. TXN-00001)
  date_id        INT      FK → dim_date
  product_id     INT      FK → dim_product
  customer_id    INT      FK → dim_customer
  units_sold     INT
  unit_price     FLOAT
  revenue        FLOAT

dim_product
  product_id     INT PK
  product_name   VARCHAR  (e.g. "Turbofan Engine")
  category       VARCHAR  (Engine, Airframe, Avionics, Hydraulics, Safety, Interior)
  base_price     FLOAT
  abc_class      CHAR(1)  (A, B, or C)

dim_customer
  customer_id    INT PK
  customer_name  VARCHAR  (e.g. "Emirates MRO")
  region         VARCHAR  (Middle East, Asia, Europe, Americas)

dim_date
  date_id        INT PK   (YYYYMMDD)
  date           DATE
  year           INT      (2022, 2023, 2024)
  month          INT      (1-12)
  quarter        VARCHAR  (Q1-Q4)
  month_name     VARCHAR  (Jan-Dec)

Common joins:
  fact_sales f
  JOIN dim_date     d ON f.date_id     = d.date_id
  JOIN dim_product  p ON f.product_id  = p.product_id
  JOIN dim_customer c ON f.customer_id = c.customer_id

Example queries:
  -- Monthly revenue
  SELECT d.year, d.month_name, SUM(f.revenue) AS revenue
  FROM fact_sales f JOIN dim_date d ON f.date_id=d.date_id GROUP BY 1,2
  -- Top customers
  SELECT c.customer_name, c.region, SUM(f.revenue) AS revenue
  FROM fact_sales f JOIN dim_customer c ON f.customer_id=c.customer_id
  GROUP BY 1,2 ORDER BY 3 DESC LIMIT 10
"""
