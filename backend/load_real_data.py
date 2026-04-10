import os
import json
import pandas as pd
from datetime import datetime

# Load price proxy (average unit price per category)
PRICE_PROXY_PATH = os.path.join(os.path.dirname(__file__), "price_proxy.json")
with open(PRICE_PROXY_PATH, "r") as f:
    PRICE_PROXY = json.load(f)

# Mapping from common real‑data column names to the dashboard schema
COLUMN_MAP = {
    "transaction_id": "Transaction_ID",
    "txn_id": "Transaction_ID",
    "id": "Transaction_ID",
    "date": "Date",
    "transaction_date": "Date",
    "product": "Product_Name",
    "product_name": "Product_Name",
    "category": "Category",
    "region": "Region",
    "customer": "Customer",
    "client": "Customer",
    "units": "Units_Sold",
    "quantity": "Units_Sold",
    "unit_price": "Unit_Price",
    "price": "Unit_Price",
}

def _apply_mapping(df: pd.DataFrame) -> pd.DataFrame:
    """Rename columns according to COLUMN_MAP and drop any unknown columns."""
    rename_dict = {orig: new for orig, new in COLUMN_MAP.items() if orig in df.columns}
    df = df.rename(columns=rename_dict)
    return df

def _ensure_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Add any missing required columns using sensible defaults or the price proxy."""
    required = [
        "Transaction_ID",
        "Date",
        "Year",
        "Month",
        "Month_Name",
        "Quarter",
        "Product_Name",
        "Category",
        "Region",
        "Customer",
        "Units_Sold",
        "Unit_Price",
        "Revenue",
        "ABC_Class",
    ]
    for col in required:
        if col not in df.columns:
            if col == "Transaction_ID":
                df[col] = [f"TXN-{i+1:05d}" for i in range(len(df))]
            elif col == "Date":
                start = datetime(2022, 1, 1)
                df[col] = [start + pd.Timedelta(days=i) for i in range(len(df))]
            elif col == "Year":
                df[col] = pd.to_datetime(df["Date"]).dt.year
            elif col == "Month":
                df[col] = pd.to_datetime(df["Date"]).dt.month
            elif col == "Month_Name":
                df[col] = pd.to_datetime(df["Date"]).dt.strftime("%b")
            elif col == "Quarter":
                df[col] = pd.to_datetime(df["Date"]).dt.quarter.apply(lambda q: f"Q{q}")
            elif col == "Product_Name":
                df[col] = "Unknown Product"
            elif col == "Category":
                df[col] = "Other"
            elif col == "Region":
                df[col] = "Other"
            elif col == "Customer":
                df[col] = "Unknown Customer"
            elif col == "Units_Sold":
                df[col] = 1
            elif col == "Unit_Price":
                # Use price proxy based on Category, fallback to average proxy price
                cat = df.get("Category", ["Other"])[0]
                df[col] = PRICE_PROXY.get(cat, sum(PRICE_PROXY.values())/len(PRICE_PROXY))
            elif col == "Revenue":
                df[col] = df["Units_Sold"] * df["Unit_Price"]
            elif col == "ABC_Class":
                df[col] = None
    return df

def _compute_abc_class(df: pd.DataFrame) -> pd.DataFrame:
    """Assign ABC class based on cumulative revenue share (same logic as synthetic data)."""
    rev = df.groupby("Product_Name")["Revenue"].sum().sort_values(ascending=False)
    cum = rev.cumsum() / rev.sum()
    abc_map = {p: ("A" if c <= 0.70 else "B" if c <= 0.90 else "C") for p, c in cum.items()}
    df["ABC_Class"] = df["Product_Name"].map(abc_map)
    return df

def load_and_save_real_data(csv_path: str) -> None:
    """Load a real CSV (or Parquet) file, map/clean it, and write the canonical parquet used by the app.
    The function writes to `data/sales.parquet` in the project root.
    """
    ext = os.path.splitext(csv_path)[1].lower()
    if ext == ".parquet":
        df = pd.read_parquet(csv_path)
    else:
        df = pd.read_csv(csv_path)
    df = _apply_mapping(df)
    df = _ensure_columns(df)
    df = _compute_abc_class(df)
    df["Date"] = pd.to_datetime(df["Date"])
    os.makedirs("data", exist_ok=True)
    df.to_parquet("data/sales.parquet", index=False)
    print(f"[data] Real data loaded and saved to data/sales.parquet ({len(df)} rows)")
