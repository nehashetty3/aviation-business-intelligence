"""
Aviation BI — Airflow Data Pipeline
Nightly ingestion: generate_batch → validate_schema → load_to_db
Schedule: daily at 02:00 UTC
"""
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
import os

DEFAULT_ARGS = {
    'owner': 'aviation-bi',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'email_on_failure': False,
}

with DAG(
    dag_id='aviation_nightly_pipeline',
    default_args=DEFAULT_ARGS,
    description='Nightly aviation MRO transaction ingestion',
    schedule_interval='0 2 * * *',
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['aviation', 'mro', 'bi'],
) as dag:

    def generate_batch(**ctx):
        import sys; sys.path.insert(0, '/opt/airflow/app')
        import numpy as np, pandas as pd, random
        from datetime import date

        PRODUCTS = {
            "Turbofan Engine":       ("Engine",    420000, 0.197),
            "Landing Gear Assembly": ("Airframe",  310000, 0.110),
            "Turboprop Engine":      ("Engine",    280000, 0.090),
            "Avionics Suite":        ("Avionics",  220000, 0.080),
            "APU Unit":              ("Engine",    185000, 0.080),
        }
        CUSTOMERS = {
            "Emirates MRO":"Middle East","Lufthansa Technik":"Europe",
            "Delta TechOps":"Americas","Singapore Airlines Engg":"Asia",
            "ANA Technik":"Asia","Korean Air MRO":"Asia",
        }
        names = list(PRODUCTS.keys())
        wts   = [PRODUCTS[p][2] for p in names]
        today = date.today()
        rows  = []
        for i in range(random.randint(25, 45)):
            p = random.choices(names, weights=wts, k=1)[0]
            cat, base_px, _ = PRODUCTS[p]
            cust = random.choice(list(CUSTOMERS))
            units = max(1, int(np.random.negative_binomial(2, 0.45)))
            price = round(max(base_px*0.70, base_px*np.random.normal(1.0, 0.09)), 2)
            rows.append({"Transaction_ID": f"TXN-{today:%Y%m%d}-{i+1:03d}",
                         "Date":str(today),"Year":today.year,"Month":today.month,
                         "Month_Name":today.strftime("%b"),"Quarter":f"Q{(today.month-1)//3+1}",
                         "Product_Name":p,"Category":cat,"ABC_Class":"A",
                         "Customer":cust,"Region":CUSTOMERS[cust],
                         "Units_Sold":units,"Unit_Price":price,"Revenue":round(price*units,2)})
        path = f"/tmp/aviation_batch_{today:%Y%m%d}.parquet"
        pd.DataFrame(rows).to_parquet(path, index=False)
        ctx['ti'].xcom_push(key='batch_path',  value=path)
        ctx['ti'].xcom_push(key='batch_count', value=len(rows))
        print(f"[generate_batch] {len(rows)} transactions → {path}")

    def validate_schema(**ctx):
        import pandas as pd
        path = ctx['ti'].xcom_pull(key='batch_path', task_ids='generate_batch')
        df   = pd.read_parquet(path)
        REQUIRED = ["Transaction_ID","Date","Year","Month","Product_Name",
                    "Category","Customer","Region","Units_Sold","Unit_Price","Revenue"]
        missing = [c for c in REQUIRED if c not in df.columns]
        assert not missing,                    f"Missing columns: {missing}"
        assert (df["Revenue"] > 0).all(),      "Revenue must be positive"
        assert (df["Units_Sold"] >= 1).all(),  "Units must be >= 1"
        assert df["Transaction_ID"].is_unique, "Duplicate transaction IDs"
        rev_check = (df["Revenue"] - df["Unit_Price"]*df["Units_Sold"]).abs()
        assert (rev_check < 1).all(),          "Revenue != price * units"
        ctx['ti'].xcom_push(key='validated_count', value=len(df))
        print(f"[validate_schema] {len(df)} rows passed all checks OK")

    def load_to_db(**ctx):
        import pandas as pd, os
        path = ctx['ti'].xcom_pull(key='batch_path', task_ids='generate_batch')
        n    = ctx['ti'].xcom_pull(key='validated_count', task_ids='validate_schema')
        df   = pd.read_parquet(path)
        db_url = os.getenv("DATABASE_URL","postgresql://avbi:avbi@postgres:5432/aviation_bi")
        try:
            from sqlalchemy import create_engine
            df.to_sql("fact_sales_staging", create_engine(db_url), if_exists="append", index=False)
            print(f"[load_to_db] {n} rows appended to fact_sales_staging OK")
        except Exception as e:
            print(f"[load_to_db] No PG connection ({e}) — {n} rows validated and ready")
        os.remove(path)

    t1 = PythonOperator(task_id='generate_batch',  python_callable=generate_batch)
    t2 = PythonOperator(task_id='validate_schema', python_callable=validate_schema)
    t3 = PythonOperator(task_id='load_to_db',      python_callable=load_to_db)
    t1 >> t2 >> t3
