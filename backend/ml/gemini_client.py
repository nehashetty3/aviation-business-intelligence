import os
import json
import pandas as pd
from google.generativeai import configure, GenerativeModel

# Initialize Gemini client lazily
def _get_model():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")
    configure(api_key=api_key)
    return GenerativeModel("gemini-flash-latest")

def nl_to_sql_and_run(question: str, df: pd.DataFrame):
    """Translate a natural‑language question to SQL using Gemini and execute it on the provided DataFrame.
    The function reuses the existing DuckDB helper from backend.ml.nlsql.
    """
    model = _get_model()
    prompt = (
        f"You are given a pandas DataFrame with the following columns: {list(df.columns)}. "
        f"Write a valid SQL query (compatible with DuckDB) that answers the question: '{question}'. "
        "Return only the SQL statement without any explanation."
    )
    response = model.generate_content(prompt)
    sql = response.text.strip()
    # Reuse the existing helper that runs the SQL on DuckDB
    from backend.ml.nlsql import run_sql_on_duckdb
    return run_sql_on_duckdb(sql, df)

def generate_insight(chart: str, data: list, context: str = ""):
    """Generate a short two‑sentence insight using Gemini.
    Returns plain text.
    """
    model = _get_model()
    prompt = (
        f"Provide a concise two‑sentence insight for the following chart type: {chart}. "
        f"Data (JSON): {json.dumps(data)}. "
        f"Context: {context}. "
        "Focus on the most interesting pattern or anomaly."
    )
    response = model.generate_content(prompt)
    return response.text.strip()
