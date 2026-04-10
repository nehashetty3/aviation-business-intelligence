"""
NL → SQL interface using Claude API + DuckDB.
User types a plain-English question → Claude generates SQL → DuckDB executes against
an in-memory view of the PostgreSQL data → results returned as JSON.
"""
import duckdb
import pandas as pd
import os

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY","")

NL_SYSTEM = """You are a SQL expert. Convert the user's natural language question into
a valid DuckDB SQL query against an aviation MRO sales database.

Tables available:
  fact_sales(txn_code, date TEXT, year INT, month INT, quarter TEXT, month_name TEXT,
             product_name TEXT, category TEXT, abc_class TEXT,
             customer TEXT, region TEXT, units_sold INT, unit_price REAL, revenue REAL)

Rules:
- Return ONLY the raw SQL query, nothing else — no explanation, no markdown, no backticks.
- Use DuckDB syntax. Use single quotes for strings.
- Limit results to 50 rows unless the user asks for more.
- Always include ORDER BY for aggregations.
- Column names are exactly as listed above (snake_case).
- For revenue use SUM(revenue), for average price use AVG(unit_price).
- Categories: Engine, Airframe, Avionics, Hydraulics, Safety, Interior
- Regions: Middle East, Asia, Europe, Americas
"""

def nl_to_sql_and_run(question: str, df: pd.DataFrame) -> dict:
    import anthropic

    # Register df as DuckDB table
    conn = duckdb.connect()
    conn.register("fact_sales", df)

    # Generate SQL via Claude
    if not ANTHROPIC_API_KEY:
        return {"error": "ANTHROPIC_API_KEY not set", "sql": "", "columns": [], "rows": []}

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    msg = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=400,
        system=NL_SYSTEM,
        messages=[{"role":"user","content": question}],
    )
    sql = msg.content[0].text.strip().strip("`").strip()
    if sql.lower().startswith("sql"):
        sql = sql[3:].strip()

    try:
        result = conn.execute(sql).fetchdf()
        columns = list(result.columns)
        rows = result.head(50).values.tolist()
        # Serialize safely
        rows = [[float(v) if hasattr(v,"item") else v for v in row] for row in rows]
        return {"sql": sql, "columns": columns, "rows": rows, "error": None}
    except Exception as e:
        return {"sql": sql, "columns": [], "rows": [], "error": str(e)}
