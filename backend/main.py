"""
Aviation BI v3.0 — FastAPI Backend
All original endpoints + Prophet forecast, XGBoost+SHAP churn,
ALS recommendations, price elasticity, NL→SQL, insight narratives,
PDF/Excel export, PostgreSQL star schema.
"""
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import numpy as np
import os, sys, io
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

app = FastAPI(title="Aviation BI API v3", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Global state ──────────────────────────────────────────────────────────────
df: pd.DataFrame             = None
rfm: pd.DataFrame            = None
monthly_anom: pd.DataFrame   = None
churn_prob_arr               = None
shap_importance              = []
customer_shap                = []
rec_model                    = None
rec_matrix                   = None
rec_customers                = []
rec_products                 = []
rec_cust_idx                 = {}
rec_prod_idx                 = {}
elasticity_cache             = None
SNAPSHOT = pd.Timestamp("2024-07-01")
USE_PG   = os.getenv("DATABASE_URL", "").startswith("postgresql")


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    global df, rfm, monthly_anom, churn_prob_arr, shap_importance, customer_shap
    global rec_model, rec_matrix, rec_customers, rec_products, rec_cust_idx, rec_prod_idx
    global elasticity_cache

    # Load data
    if USE_PG:
        from backend.database import get_df, load_from_df
        try:
            df = get_df()
            if len(df) < 100:
                raise Exception("empty")
            print(f"[db] Loaded {len(df):,} rows from PostgreSQL")
        except Exception:
            _gen_and_load(load_from_df)
    else:
        # Load data only once; guard against repeated execution
        if not globals().get("_DATA_LOADED", False):
            real_path = os.path.join("public_data", "real_data.csv")
            if os.path.exists(real_path):
                from backend.load_real_data import load_and_save_real_data
                load_and_save_real_data(real_path)
            else:
                from backend.generate_data import generate
                generate()
            globals()["_DATA_LOADED"] = True
        df = pd.read_parquet("data/sales.parquet")

    df["Date"] = pd.to_datetime(df["Date"])
    _build_rfm()
    _train_churn()
    _detect_anomaly()
    _train_recommender()
    print("[api] Ready — all models loaded.")


def _gen_and_load(load_fn):
    global df
    from backend.generate_data import generate
    df = generate()
    load_fn(df)
    df = df  # already set


def _build_rfm():
    global rfm
    rfm = (
        df.groupby("Customer")
        .agg(
            Region    =("Region","first"),
            Recency   =("Date", lambda x: (SNAPSHOT - x.max()).days),
            Frequency =("Transaction_ID","count"),
            Monetary  =("Revenue","sum"),
        ).reset_index()
    )
    for col, asc in [("Recency",True),("Frequency",False),("Monetary",False)]:
        labels = [4,3,2,1] if asc else [1,2,3,4]
        n = len(rfm[col].unique())
        q = min(4, n)
        try:
            rfm[f"{col}_Score"] = pd.qcut(rfm[col], q=q, labels=labels[:q], duplicates="drop").astype(int)
        except Exception:
            ranked = rfm[col].rank(pct=True)
            rfm[f"{col}_Score"] = ((1-ranked if asc else ranked)*3.99).astype(int).clip(1,4)
    rfm["RFM_Score"] = rfm["Recency_Score"]+rfm["Frequency_Score"]+rfm["Monetary_Score"]
    rfm["Segment"] = rfm["RFM_Score"].apply(
        lambda s: "Champions" if s>=10 else "Loyal Customers" if s>=8
        else "Potential Loyalists" if s>=6 else "At Risk" if s>=4 else "Lost"
    )


def _train_churn():
    global churn_prob_arr, shap_importance, customer_shap
    from backend.ml.churn import train_xgb_churn
    churn_prob_arr, shap_importance, customer_shap, _, _ = train_xgb_churn(rfm)
    rfm["Churn_Prob"] = churn_prob_arr


def _detect_anomaly():
    global monthly_anom
    from sklearn.ensemble import IsolationForest
    mo = df.copy()
    mo["YM"] = mo["Date"].dt.to_period("M")
    agg = mo.groupby("YM").agg(Revenue=("Revenue","sum"),Units=("Units_Sold","sum")).reset_index()
    agg["Month"] = agg["YM"].astype(str)
    iso = IsolationForest(contamination=0.10, random_state=42)
    agg["Is_Anomaly"]    = iso.fit_predict(agg[["Revenue","Units"]].values)==-1
    agg["Anomaly_Score"] = np.round(-iso.score_samples(agg[["Revenue","Units"]].values),4)
    monthly_anom = agg.drop(columns=["YM"])


def _train_recommender():
    global rec_model, rec_matrix, rec_customers, rec_products, rec_cust_idx, rec_prod_idx
    from backend.ml.recommend import train_recommender
    rec_model, rec_matrix, rec_customers, rec_products, rec_cust_idx, rec_prod_idx = train_recommender(df)


# ── Helpers ───────────────────────────────────────────────────────────────────
def filt(year=None, category=None, region=None):
    d = df.copy()
    if year and year!="all":    d=d[d["Year"]==int(year)]
    if category and category!="all": d=d[d["Category"]==category]
    if region and region!="all":    d=d[d["Region"]==region]
    return d

def fmt(v): return round(float(v),2)


# ── Core endpoints (unchanged) ────────────────────────────────────────────────
@app.get("/api/health")
def health(): return {"status":"ok","rows":len(df),"version":"3.0"}

@app.get("/api/filters")
def filters():
    return {"years":sorted(df["Year"].unique().tolist()),
            "categories":sorted(df["Category"].unique().tolist()),
            "regions":sorted(df["Region"].unique().tolist())}

@app.get("/api/kpis")
def kpis(year:Optional[str]=None,category:Optional[str]=None,region:Optional[str]=None):
    d   = filt(year,category,region)
    rev = d["Revenue"].sum()
    cur = df[df["Year"]==2023]["Revenue"].sum()
    prv = df[df["Year"]==2022]["Revenue"].sum()
    yoy = (cur-prv)/prv if prv else 0
    return {"total_revenue":fmt(rev),"total_units":int(d["Units_Sold"].sum()),
            "total_transactions":int(len(d)),"avg_order_value":fmt(d["Revenue"].mean()),
            "unique_customers":int(d["Customer"].nunique()),"yoy_growth":fmt(yoy)}

@app.get("/api/revenue/by-category")
def rev_by_category(year:Optional[str]=None,region:Optional[str]=None):
    d=filt(year,None,region)
    grp=d.groupby("Category").agg(Revenue=("Revenue","sum"),Units=("Units_Sold","sum")).reset_index()
    grp=grp.rename(columns={"Category":"name","Revenue":"revenue","Units":"units"})
    tot=grp["revenue"].sum(); grp["pct"]=(grp["revenue"]/tot*100).round(1)
    return grp.sort_values("revenue",ascending=False).to_dict(orient="records")

@app.get("/api/revenue/by-region")
def rev_by_region(year:Optional[str]=None,category:Optional[str]=None):
    d=filt(year,category,None)
    grp=d.groupby("Region").agg(Revenue=("Revenue","sum"),Units=("Units_Sold","sum")).reset_index()
    grp=grp.rename(columns={"Region":"name","Revenue":"revenue","Units":"units"})
    tot=grp["revenue"].sum(); grp["pct"]=(grp["revenue"]/tot*100).round(1)
    return grp.sort_values("revenue",ascending=False).to_dict(orient="records")

@app.get("/api/trend/monthly")
def trend_monthly(category:Optional[str]=None,region:Optional[str]=None):
    d=filt(None,category,region).copy()
    d["YM"]=d["Date"].dt.to_period("M").astype(str)
    grp=d.groupby("YM").agg(Revenue=("Revenue","sum"),Units=("Units_Sold","sum")).reset_index()
    return grp.rename(columns={"YM":"month","Revenue":"revenue","Units":"units"}).sort_values("month").to_dict(orient="records")

@app.get("/api/products/top")
def products_top(n:int=10,by:str="revenue",year:Optional[str]=None):
    d=filt(year)
    col="Revenue" if by=="revenue" else "Units_Sold"
    grp=(d.groupby(["Product_Name","Category","ABC_Class"])
         .agg(Revenue=("Revenue","sum"),Units=("Units_Sold","sum"))
         .reset_index().sort_values(col,ascending=False).head(n))
    grp["rank"]=range(1,len(grp)+1)
    return grp.rename(columns={"Product_Name":"name","Category":"category","ABC_Class":"abc","Units":"units"}).to_dict(orient="records")

@app.get("/api/products/all")
def products_all(year:Optional[str]=None):
    d=filt(year)
    grp=(d.groupby(["Product_Name","Category","ABC_Class"])
         .agg(Revenue=("Revenue","sum"),Units=("Units_Sold","sum"),AvgPrice=("Unit_Price","mean"))
         .reset_index().sort_values("Revenue",ascending=False))
    grp.columns=["name","category","abc","revenue","units","avg_price"]
    grp["avg_price"]=grp["avg_price"].round(0)
    return grp.to_dict(orient="records")

@app.get("/api/abc")
def abc_analysis(year:Optional[str]=None):
    d=filt(year)
    rev=d.groupby("Product_Name")["Revenue"].sum().sort_values(ascending=False)
    tot=rev.sum(); cum=(rev.cumsum()/tot*100).round(2)
    abc_map={p:("A" if c<=70 else "B" if c<=90 else "C") for p,c in cum.items()}
    products=[{"name":p,"revenue":fmt(rev[p]),"cumulative_pct":float(cum[p]),"abc":abc_map[p]} for p in rev.index]
    summary={}
    for cls in ["A","B","C"]:
        names=[p for p,c in abc_map.items() if c==cls]
        r=sum(rev[n] for n in names)
        summary[cls]={"count":len(names),"revenue":fmt(r),"revenue_pct":round(r/tot*100,1)}
    return {"products":products,"summary":summary}

@app.get("/api/rfm")
def rfm_data():
    out=rfm.copy(); out["Monetary"]=out["Monetary"].round(0)
    return out.rename(columns=str.lower).to_dict(orient="records")

@app.get("/api/cohort")
def cohort():
    d=df.copy(); d["YM"]=d["Date"].dt.to_period("M")
    first=d.groupby("Customer")["YM"].min().rename("Cohort")
    d=d.join(first,on="Customer"); d["Age"]=(d["YM"]-d["Cohort"]).apply(lambda x:x.n)
    cg=d.groupby(["Cohort","Age"])["Customer"].nunique().reset_index().rename(columns={"Customer":"active"})
    sz=d.groupby("Cohort")["Customer"].nunique().rename("size")
    cg=cg.join(sz,on="Cohort"); cg["retention"]=(cg["active"]/cg["size"]*100).round(1)
    cohorts=sorted(cg["Cohort"].unique().astype(str).tolist())
    matrix={}
    for _,row in cg.iterrows():
        matrix.setdefault(str(row["Cohort"]),{})[int(row["Age"])]=float(row["retention"])
    return {"cohorts":cohorts,"max_age":int(cg["Age"].max()),"matrix":matrix}

@app.get("/api/matrix/region-category")
def matrix_rc(year:Optional[str]=None):
    d=filt(year)
    pivot=d.pivot_table(values="Revenue",index="Region",columns="Category",aggfunc="sum",fill_value=0)
    regions=pivot.index.tolist(); cats=pivot.columns.tolist()
    data={r:{c:fmt(pivot.loc[r,c]) for c in cats} for r in regions}
    return {"regions":regions,"categories":cats,"data":data}

@app.get("/api/customers")
def customers(year:Optional[str]=None,region:Optional[str]=None):
    d=filt(year,None,region)
    grp=(d.groupby(["Customer","Region"])
         .agg(Revenue=("Revenue","sum"),Transactions=("Transaction_ID","count"),Units=("Units_Sold","sum"))
         .reset_index().sort_values("Revenue",ascending=False))
    grp.columns=["customer","region","revenue","transactions","units"]
    return grp.to_dict(orient="records")

@app.get("/api/anomaly")
def anomaly():
    return monthly_anom.rename(columns={"Month":"month","Revenue":"revenue","Units":"units",
        "Is_Anomaly":"is_anomaly","Anomaly_Score":"anomaly_score"}).to_dict(orient="records")


# ── New: Prophet Forecast ─────────────────────────────────────────────────────
@app.get("/api/forecast")
def forecast(periods:int=12):
    from backend.ml.forecast import run_prophet
    return run_prophet(df, periods=periods)


# ── New: XGBoost + SHAP Churn ─────────────────────────────────────────────────
@app.get("/api/churn")
def churn():
    out=rfm[["Customer","Region","Recency","Frequency","Monetary","Segment","Churn_Prob"]].copy()
    out["Risk"]=out["Churn_Prob"].apply(lambda p:"High" if p>=0.65 else "Medium" if p>=0.35 else "Low")
    out["Churn_Prob"]=out["Churn_Prob"].round(3); out["Monetary"]=out["Monetary"].round(0)
    out=out.sort_values("Churn_Prob",ascending=False)
    return {
        "customers":         out.rename(columns=str.lower).to_dict(orient="records"),
        "feature_importance": shap_importance,
        "customer_shap":     customer_shap[:10],
        "high_risk_count":   int((out["Risk"]=="High").sum()),
        "medium_risk_count": int((out["Risk"]=="Medium").sum()),
        "model":             "XGBoost + SHAP TreeExplainer",
    }

@app.get("/api/churn/shap/{customer_name}")
def churn_shap(customer_name:str):
    for rec in customer_shap:
        if rec["customer"]==customer_name:
            return rec
    raise HTTPException(404,"Customer not found")


# ── New: Recommendations ──────────────────────────────────────────────────────
@app.get("/api/recommend")
def recommend(customer:Optional[str]=None, n:int=5):
    from backend.ml.recommend import get_recommendations
    customers_list = rec_customers
    if customer:
        recs = get_recommendations(customer, rec_model, rec_matrix, rec_customers, rec_products, rec_cust_idx, n)
        # Also return what they already bought
        bought = df[df["Customer"]==customer].groupby("Product_Name")["Revenue"].sum().sort_values(ascending=False).head(5)
        return {"customer":customer,"recommendations":recs,
                "already_purchased":[{"product":p,"revenue":fmt(r)} for p,r in bought.items()]}
    # Top overall popular products per region
    pop = df.groupby(["Region","Product_Name"])["Revenue"].sum().reset_index()
    pop = pop.sort_values("Revenue",ascending=False)
    out = {}
    for region in df["Region"].unique():
        top = pop[pop["Region"]==region].head(n)[["Product_Name","Revenue"]].to_dict(orient="records")
        out[region] = [{"product":r["Product_Name"],"revenue":fmt(r["Revenue"])} for r in top]
    return {"popular_by_region":out,"customers":customers_list}


# ── New: Price Elasticity ─────────────────────────────────────────────────────
@app.get("/api/elasticity")
def elasticity():
    global elasticity_cache
    if elasticity_cache is None:
        from backend.ml.elasticity import compute_elasticity
        elasticity_cache = compute_elasticity(df)
    return elasticity_cache


# ── New: NL → SQL ─────────────────────────────────────────────────────────────
class NLQuery(BaseModel):
    question: str

@app.post("/api/nlsql")
def nlsql(body: NLQuery):
    # Use Gemini by default unless Anthropic key is explicitly provided
    import os
    if os.getenv("ANTHROPIC_API_KEY"):
        from backend.ml.nlsql import nl_to_sql_and_run as nlsql_func
    else:
        from backend.ml.gemini_client import nl_to_sql_and_run as nlsql_func
    flat = df.rename(columns={
        "Transaction_ID":"txn_code","Product_Name":"product_name",
        "ABC_Class":"abc_class","Units_Sold":"units_sold",
        "Unit_Price":"unit_price","Month_Name":"month_name",
    })
    return nlsql_func(body.question, flat)


# ── New: Insight narratives ───────────────────────────────────────────────────
class InsightRequest(BaseModel):
    chart: str
    data: list
    context: str = ""

@app.post("/api/insight")
def insight(body: InsightRequest):
    # Use Gemini by default unless Anthropic key is explicitly provided
    import os
    if os.getenv("ANTHROPIC_API_KEY"):
        from backend.ml.insights import generate_insight as insight_func
    else:
        from backend.ml.gemini_client import generate_insight as insight_func
    text = insight_func(body.chart, body.data, body.context)
    return {"insight": text}


# ── New: Export PDF / Excel ───────────────────────────────────────────────────
@app.get("/api/export/{page}")
def export_page(page:str, fmt_:str=Query("xlsx", alias="format"),
                year:Optional[str]=None, category:Optional[str]=None, region:Optional[str]=None):
    from backend.ml.export_utils import to_excel, to_pdf
    d = filt(year, category, region)

    pages = {
        "kpis": lambda: {"KPIs": pd.DataFrame([{
            "Metric":["Total Revenue","Total Units","Transactions","Avg Order Value","Customers"],
            "Value":[f"${d['Revenue'].sum()/1e6:.1f}M",
                     f"{d['Units_Sold'].sum():,}",
                     f"{len(d):,}",
                     f"${d['Revenue'].mean():,.0f}",
                     str(d['Customer'].nunique())]
        }])},
        "products": lambda: {"Products": (
            d.groupby(["Product_Name","Category","ABC_Class"])
             .agg(Revenue=("Revenue","sum"),Units=("Units_Sold","sum"),AvgPrice=("Unit_Price","mean"))
             .reset_index().sort_values("Revenue",ascending=False)
        )},
        "customers": lambda: {"Customers": (
            d.groupby(["Customer","Region"])
             .agg(Revenue=("Revenue","sum"),Transactions=("Transaction_ID","count"))
             .reset_index().sort_values("Revenue",ascending=False)
        )},
        "rfm": lambda: {"RFM": rfm.copy()},
        "elasticity": lambda: {"Elasticity": pd.DataFrame([
            {k:v for k,v in e.items() if k!="data"}
            for e in (elasticity_cache or [])
        ])},
    }

    if page not in pages:
        raise HTTPException(400, f"Unknown page '{page}'. Options: {list(pages.keys())}")

    sheets = pages[page]()

    if fmt_ == "pdf":
        key = list(sheets.keys())[0]
        rows = sheets[key].head(100).to_dict(orient="records")
        pdf_bytes = to_pdf(f"Aviation BI — {key}", rows, f"Filtered export · {year or 'All years'}")
        return StreamingResponse(io.BytesIO(pdf_bytes),
                                 media_type="application/pdf",
                                 headers={"Content-Disposition":f"attachment; filename=avbi_{page}.pdf"})
    else:
        xlsx_bytes = to_excel(sheets)
        return StreamingResponse(io.BytesIO(xlsx_bytes),
                                 media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                 headers={"Content-Disposition":f"attachment; filename=avbi_{page}.xlsx"})


# ── New: Star schema info ─────────────────────────────────────────────────────
@app.get("/api/schema")
def schema():
    from backend.database import SCHEMA_DESCRIPTION
    return {"schema": SCHEMA_DESCRIPTION, "source": "PostgreSQL" if USE_PG else "Parquet"}
