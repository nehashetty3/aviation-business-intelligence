"""
Aviation BI — pytest test suite  (35 tests)
Run: pytest tests/ -v
"""
import pytest, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


@pytest.fixture(scope="session")
def client():
    if not os.path.exists("data/sales.parquet"):
        from backend.generate_data import generate
        generate()
    from fastapi.testclient import TestClient
    from backend.main import app
    with TestClient(app) as c:
        yield c


# ── Health & filters ──────────────────────────────────────────────────────────

def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "ok"
    assert d["rows"] == 10500

def test_filters(client):
    d = client.get("/api/filters").json()
    assert set(d["years"]) == {2022, 2023, 2024}
    assert "Engine" in d["categories"]
    assert len(d["categories"]) == 6
    assert len(d["regions"]) == 4


# ── KPIs ──────────────────────────────────────────────────────────────────────

def test_kpis_all_fields(client):
    d = client.get("/api/kpis").json()
    for k in ["total_revenue","total_units","total_transactions",
              "avg_order_value","unique_customers","yoy_growth"]:
        assert k in d, f"Missing: {k}"

def test_kpis_values(client):
    d = client.get("/api/kpis").json()
    assert d["total_revenue"] > 0
    assert d["total_transactions"] == 10500
    assert d["unique_customers"] == 48

def test_kpis_year_filter(client):
    d_all  = client.get("/api/kpis").json()
    d_2022 = client.get("/api/kpis?year=2022").json()
    assert d_2022["total_revenue"] < d_all["total_revenue"]
    assert d_2022["total_transactions"] > 0

def test_kpis_region_filter(client):
    d = client.get("/api/kpis?region=Asia").json()
    assert d["total_revenue"] > 0


# ── Revenue ───────────────────────────────────────────────────────────────────

def test_revenue_by_category(client):
    data = client.get("/api/revenue/by-category").json()
    assert len(data) == 6
    pcts = sum(d["pct"] for d in data)
    assert abs(pcts - 100.0) < 0.5
    for item in data:
        assert "name" in item and "revenue" in item and "pct" in item

def test_revenue_by_region(client):
    data = client.get("/api/revenue/by-region").json()
    assert {d["name"] for d in data} == {"Middle East","Asia","Europe","Americas"}


# ── Products ──────────────────────────────────────────────────────────────────

def test_products_top(client):
    data = client.get("/api/products/top").json()
    assert len(data) == 10
    assert data[0]["rank"] == 1

def test_products_all_abc(client):
    data = client.get("/api/products/all").json()
    assert len(data) == 20
    assert all(p["abc"] in ("A","B","C") for p in data)


# ── ABC ───────────────────────────────────────────────────────────────────────

def test_abc_pareto(client):
    d = client.get("/api/abc").json()
    assert d["summary"]["A"]["revenue_pct"] >= 60

def test_abc_cumulative_monotone(client):
    prods = client.get("/api/abc").json()["products"]
    cpcts = [p["cumulative_pct"] for p in prods]
    assert cpcts == sorted(cpcts)


# ── RFM ───────────────────────────────────────────────────────────────────────

def test_rfm_count(client):
    assert len(client.get("/api/rfm").json()) == 48

def test_rfm_segments_valid(client):
    valid = {"Champions","Loyal Customers","Potential Loyalists","At Risk","Lost"}
    for c in client.get("/api/rfm").json():
        assert c["segment"] in valid
        assert c["recency"] > 0
        assert c["frequency"] >= 1


# ── Cohort ────────────────────────────────────────────────────────────────────

def test_cohort_18_cohorts(client):
    d = client.get("/api/cohort").json()
    assert len(d["cohorts"]) == 18

def test_cohort_month_zero_100(client):
    d = client.get("/api/cohort").json()
    for cohort, ages in d["matrix"].items():
        if 0 in ages:
            assert ages[0] == 100.0


# ── Forecast (Prophet) ────────────────────────────────────────────────────────

def test_forecast_prophet_model(client):
    d = client.get("/api/forecast").json()
    assert "Prophet" in d["model"]
    assert len(d["history"]) == 30
    assert len(d["forecast"]) == 12

def test_forecast_periods_param(client):
    for p in [3, 6, 12]:
        assert len(client.get(f"/api/forecast?periods={p}").json()["forecast"]) == p

def test_forecast_confidence_valid(client):
    for pt in client.get("/api/forecast?periods=6").json()["forecast"]:
        assert pt["lower"] <= pt["predicted"] <= pt["upper"]
        assert pt["predicted"] >= 0


# ── Churn (XGBoost + SHAP) ────────────────────────────────────────────────────

def test_churn_xgboost(client):
    d = client.get("/api/churn").json()
    assert "XGBoost" in d["model"]
    assert "feature_importance" in d
    assert "customer_shap" in d

def test_churn_probabilities(client):
    for c in client.get("/api/churn").json()["customers"]:
        assert 0.0 <= c["churn_prob"] <= 1.0
        assert c["risk"] in ("High","Medium","Low")

def test_churn_importances_sum_to_one(client):
    total = sum(f["importance"] for f in client.get("/api/churn").json()["feature_importance"])
    assert abs(total - 1.0) < 0.01

def test_churn_shap_waterfall(client):
    first = client.get("/api/churn").json()["customers"][0]["customer"]
    shap  = client.get(f"/api/churn/shap/{first}").json()
    assert set(shap["shap"].keys()) == {"Recency","Frequency","Monetary"}

def test_churn_shap_404(client):
    assert client.get("/api/churn/shap/NoSuchCustomerXYZ").status_code == 404


# ── Anomaly ───────────────────────────────────────────────────────────────────

def test_anomaly_30_months(client):
    data = client.get("/api/anomaly").json()
    assert len(data) == 30

def test_anomaly_contamination_rate(client):
    data   = client.get("/api/anomaly").json()
    rate   = sum(1 for d in data if d["is_anomaly"]) / len(data)
    assert 0.05 <= rate <= 0.20


# ── Recommendations ───────────────────────────────────────────────────────────

def test_recommend_overview(client):
    d = client.get("/api/recommend").json()
    assert len(d["popular_by_region"]) == 4

def test_recommend_customer(client):
    d = client.get("/api/recommend?customer=Emirates%20MRO&n=5").json()
    assert d["customer"] == "Emirates MRO"
    assert len(d["recommendations"]) <= 5


# ── Elasticity ────────────────────────────────────────────────────────────────

def test_elasticity_six_categories(client):
    data = client.get("/api/elasticity").json()
    assert len(data) == 6

def test_elasticity_has_values(client):
    for d in client.get("/api/elasticity").json():
        assert d["elasticity"] != 0
        assert "interpretation" in d
        assert "insight" in d

def test_elasticity_r_squared_valid(client):
    for d in client.get("/api/elasticity").json():
        assert 0.0 <= d["r_squared"] <= 1.0


# ── NL → SQL ──────────────────────────────────────────────────────────────────

def test_nlsql_no_api_key(client, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    r = client.post("/api/nlsql", json={"question":"top 5 products"})
    assert r.status_code == 200
    assert "error" in r.json()


# ── Exports ───────────────────────────────────────────────────────────────────

def test_export_xlsx(client):
    r = client.get("/api/export/products?format=xlsx")
    assert r.status_code == 200
    assert "spreadsheet" in r.headers["content-type"]
    assert len(r.content) > 1000

def test_export_pdf_magic_bytes(client):
    r = client.get("/api/export/products?format=pdf")
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"

def test_export_invalid_page(client):
    assert client.get("/api/export/badpage?format=xlsx").status_code == 400


# ── Matrix & customers ────────────────────────────────────────────────────────

def test_matrix_completeness(client):
    d = client.get("/api/matrix/region-category").json()
    assert len(d["regions"]) == 4
    assert len(d["categories"]) == 6

def test_customers_sorted(client):
    data = client.get("/api/customers").json()
    revs = [c["revenue"] for c in data]
    assert revs == sorted(revs, reverse=True)

def test_customers_region_filter(client):
    asia = client.get("/api/customers?region=Asia").json()
    assert all(c["region"] == "Asia" for c in asia)
    assert len(asia) == 12
