# Aviation BI Dashboard v3.0

Full-stack BI + ML platform for aviation MRO product sales analysis.

**Stack:** FastAPI · PostgreSQL (star schema) · React + Recharts · Prophet · XGBoost + SHAP · ALS · DuckDB · Airflow · Docker

---


## Screenshots

> Add screenshots after deploying — see `docs/screenshots/README.md` for instructions.
> Place images in `docs/screenshots/` and they'll render here automatically on GitHub.

| Page | What it shows |
|------|---------------|
| `overview.png` | Executive KPIs, revenue trend, regional breakdown |
| `forecast.png` | Prophet model with changepoint annotations |
| `churn-shap.png` | XGBoost churn table + per-customer SHAP waterfall |
| `nlquery.png` | NL query with auto-rendered bar chart |
| `elasticity.png` | Price elasticity scatter + interpretation cards |

---

## Deploy (one command)

```bash
cp .env.example .env          # add ANTHROPIC_API_KEY to enable AI features
docker compose up --build
```

- **Dashboard** → http://localhost:3000
- **API docs**  → http://localhost:8000/docs

The 10,500-row dataset generates automatically on first startup and loads into PostgreSQL. Nothing else to configure.

---

## What's inside

### ML Models
| Model | Library | What it does |
|-------|---------|--------------|
| Demand Forecast | **Prophet (Meta)** | Yearly seasonality + automatic changepoint detection |
| Churn Prediction | **XGBoost + SHAP** | Classifies at-risk accounts; SHAP waterfall per customer |
| Recommendations | **ALS (implicit)** | Collaborative filtering on customer × product matrix |
| Anomaly Detection | **IsolationForest** | Flags statistically unusual demand months |
| Price Elasticity | **SciPy OLS** | Log-log regression: % demand change per % price change |

### AI Features (requires ANTHROPIC_API_KEY)
- **Ask the Data** — natural language → Claude → SQL → DuckDB → live results
- **AI Insight narratives** — 2-sentence "so what" generated below each chart on demand

### Data Layer
- **PostgreSQL star schema**: `fact_sales` → `dim_product`, `dim_customer`, `dim_date`, `dim_region`
- **DuckDB** in-memory layer for NL→SQL ad-hoc queries
- **Airflow DAG** (`airflow/dags/aviation_pipeline.py`): nightly batch ingestion with 3 tasks: `generate_batch → validate_schema → load_to_db`

### Exports
- Every page has **Excel (.xlsx)** and **PDF** download buttons
- Formatted headers, auto-widths, proper column types

---

## Dashboard Pages (13 total)

| Page | Route | Key features |
|------|-------|--------------|
| Executive Overview | `/` | 5 KPIs, trend, region bar, category donut, AI insight |
| Product Performance | `/products` | Top 10 chart, sortable table, Excel/PDF export |
| Demand Trends | `/demand` | Monthly area, YoY bars, category breakdown |
| ABC Classification | `/abc` | Pareto curve + class summary + ranked table |
| RFM Segmentation | `/rfm` | Scatter, 5 segments, customer table |
| Cohort Retention | `/cohort` | 18-cohort blue heatmap, 29-month window |
| Demand Forecast | `/forecast` | Prophet model, changepoint annotations, confidence band |
| Customer Analysis | `/customers` | Revenue rank, region×category heatmap |
| Churn Prediction | `/churn` | XGBoost risk table, SHAP waterfall per customer |
| Anomaly Detection | `/anomaly` | IsolationForest flagged months, score chart |
| Recommendations | `/recommend` | ALS per-customer recs, popular by region |
| Price Elasticity | `/elasticity` | OLS scatter per category, elasticity bar |
| Ask the Data | `/nlquery` | NL→SQL→chart, history, example queries |

---

## API Endpoints (20 total)

```
GET  /api/health                    Health check + row count
GET  /api/filters                   Years, categories, regions
GET  /api/kpis                      Executive KPIs (filterable)
GET  /api/revenue/by-category       Revenue per category
GET  /api/revenue/by-region         Revenue per region
GET  /api/trend/monthly             Monthly revenue + units
GET  /api/products/top              Top N by revenue or units
GET  /api/products/all              All 20 products with ABC class
GET  /api/abc                       Full ABC + Pareto data
GET  /api/rfm                       RFM scores + segments
GET  /api/cohort                    18-cohort retention matrix
GET  /api/matrix/region-category    Revenue pivot table
GET  /api/customers                 Revenue by customer
GET  /api/forecast                  Prophet forecast + changepoints
GET  /api/churn                     XGBoost churn probs + SHAP importance
GET  /api/churn/shap/{customer}     Per-customer SHAP waterfall
GET  /api/anomaly                   IsolationForest flagged months
GET  /api/recommend                 ALS recommendations
GET  /api/elasticity                Price elasticity per category
GET  /api/schema                    Star schema documentation
POST /api/nlsql                     NL → SQL → results (Claude + DuckDB)
POST /api/insight                   AI narrative for a chart (Claude)
GET  /api/export/{page}?format=xlsx|pdf   Export any page
```

---

## Testing

```bash
# Run full test suite (38 tests)
pytest tests/ -v

# With coverage
pytest tests/ -v --cov=backend --cov-report=term-missing
```

CI runs automatically on every push via GitHub Actions (`.github/workflows/ci.yml`).
Tests cover: all 20 endpoints, ML model output shapes, data quality, export formats.

---

## Airflow Pipeline

```bash
# Start Airflow separately (optional)
docker compose -f airflow/docker-compose.airflow.yml up

# Airflow UI → http://localhost:8080
# Login: admin / admin
# DAG: aviation_nightly_pipeline (runs daily at 02:00 UTC)
```

DAG tasks:
1. `generate_batch` — synthetic nightly transactions (25–45 rows)
2. `validate_schema` — asserts dtypes, positive values, no dupes, revenue = price × units
3. `load_to_db` — appends to PostgreSQL `fact_sales_staging`

---

## Local Development (no Docker)

```bash
# Backend
pip install -r backend/requirements.txt
python backend/generate_data.py     # one-time data gen
uvicorn backend.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend && npm install && npm run dev   # → http://localhost:5173
```

---

## Dataset

10,500 synthetic B2B aviation MRO transactions, Jan 2022 – Jun 2024.

Modelled on real B2B wholesale transaction patterns:
- **Unit distributions**: Negative Binomial(n=2, p=0.45) — matches real B2B order clustering
- **Seasonality**: Q4/Q1 peaks (+25% above baseline) — MRO contract renewal cycles
- **Trend**: +8% YoY (2023), +15% (2024), with Q2-2023 supply-chain dip
- **ABC skew**: 3 Class A products → 67% of revenue (Pareto-realistic)
- **Cohorts**: 48 customers with staggered acquisition over 18 months (valid retention analysis)
- **Regions**: Middle East 30.2%, Asia 26.8%, Europe 24.1%, Americas 18.9%

---

## Resume Bullet

> Built a full-stack aviation BI platform on 10,500 MRO transactions — FastAPI (22 endpoints), React (13 pages), PostgreSQL star schema, Airflow ETL pipeline, and 5 ML models: Prophet demand forecasting (changepoint detection), XGBoost churn classification with SHAP explainability, ALS collaborative filtering, IsolationForest anomaly detection, and OLS price elasticity regression. NL→SQL interface powered by Claude + DuckDB. 38 pytest tests with GitHub Actions CI.

---

## Deploy to Render.com (free)

1. Push to GitHub first:
   ```bash
   git init
   git add .
   git commit -m "Aviation BI v3.0"
   gh repo create aviation-bi --public --push
   ```

2. Go to [render.com](https://render.com) → New → Web Service → Connect your repo

3. **Backend service:**
   - Root directory: `.`
   - Dockerfile: `Dockerfile.backend`
   - Environment: add `ANTHROPIC_API_KEY` (optional)

4. **Frontend service:**
   - Dockerfile: `Dockerfile.frontend`
   - No env vars needed

5. **PostgreSQL:** Render → New → PostgreSQL (free tier)
   - Copy the Internal Database URL into the backend's `DATABASE_URL` env var

Alternatively, Railway.app supports `docker compose` natively — push the repo and it auto-deploys everything including Postgres.

---

## Run with Airflow (optional)

The nightly pipeline DAG runs as an optional Docker Compose profile:

```bash
# Start everything including Airflow
docker compose --profile airflow up --build

# Airflow UI → http://localhost:8080  (admin / admin)
# DAG: aviation_nightly_pipeline — runs daily at 02:00 UTC
```

Without the profile, only the dashboard + API + Postgres run.

---

## Screenshots

<!-- After deploying, add screenshots here:
     docs/screenshot-overview.png
     docs/screenshot-forecast.png
     docs/screenshot-churn.png
     docs/screenshot-nlquery.png
-->
