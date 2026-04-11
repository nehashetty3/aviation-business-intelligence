# Aviation BI Dashboard v3.0 ✈️

A professional, full-stack Business Intelligence and Machine Learning platform for aviation MRO (Maintenance, Repair, and Overhaul) sales analytics. Capable of ingesting real-world transaction data and providing AI-powered insights.

**Live Demo**: [aviation-ui.onrender.com](https://aviation-ui.onrender.com)  (Free tier, may take 60s to wake up)

---

## 🚀 Professional Stack
- **Backend**: FastAPI (Python 3.11) + PostgreSQL / SQLite fallback
- **Frontend**: React + Vite + Recharts + Lucide
- **Analytics**: DuckDB in-memory SQL engine for NL-to-SQL
- **Machine Learning**: 
    - **Demand Forecast**: Prophet (Meta)
    - **Churn Prediction**: XGBoost + SHAP Explainability
    - **Recommendations**: ALS Collaborative Filtering (Implicit)
    - **Anomaly Detection**: IsolationForest
    - **Price Elasticity**: SciPy OLS Regression

---

## 🤖 AI Features (Powered by Gemini)
This system features a deep integration with **Google Gemini** (Free-tier) for:
- **Ask the Data**: Natural language interface that translates questions directly into SQL queries executed against DuckDB.
- **AI insights**: Automated narrative generation for charts, providing "So-What" analysis on demand.

---

## 📂 Data & Ingestion
The system is designed for both synthetic testing and real-world deployment:
- **Synthetic Mode**: Automatically generates 10,500 realistic MRO transaction rows on first startup.
- **Real Data Mode**: Drop a CSV into `public_data/real_data.csv` to trigger the automated ingestion pipeline.
- **Price Proxy**: Uses a `price_proxy.json` to backfill financial data for external MRO datasets that may only contain unit counts.

---

## 🛠️ Deploy to Render (Cloud-Ready)
This project is configured for **One-Click Deployment** via Render Blueprints.

1. **Push to your GitHub fork.**
2. **Go to Render.com** → New → **Blueprint**.
3. **Connect this repository.**
4. Enter your `GEMINI_API_KEY` when prompted.
5. **Done!** Render will automatically build the heavy ML container and the static UI site, wiring them together natively.

---

## 💻 Local Development
```bash
# Backend
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

---

## 🧪 Testing & Security
- **38 Pytest Tests**: Covering all 22 API endpoints and ML model integrity.
- **Zero-Secret Codebase**: All API keys and DB URLs are managed via Environment Variables.
- **Dockerized Architecture**: Fully containerized for consistent deployment across staging and production.

---

## 📝 Resume Highlight
> Built a professional-grade Aviation BI platform featuring 5 production ML models (XGBoost, Prophet, ALS) and a natural-language SQL interface powered by Gemini AI. Implemented a robust data ingestion pipeline capable of mapping real-world MRO datasets to a PostgreSQL star-schema, deployed via a containerized Docker architecture on Render.

---

*Aviation BI v3.0 — Mission Complete.*
hot-forecast.png
     docs/screenshot-churn.png
     docs/screenshot-nlquery.png
-->
