# Deployment Guide

## Render.com (free tier, recommended)

1. Push project to GitHub
2. Go to https://render.com → New → **PostgreSQL**
   - Name: `avbi-db`, Plan: Free
   - Copy the **Internal Database URL** after it provisions

3. New → **Web Service**
   - Connect your GitHub repo
   - Environment: **Docker**
   - Dockerfile path: `Dockerfile.backend`
   - Add environment variables:
     ```
     DATABASE_URL=<paste internal DB URL from step 2>
     ANTHROPIC_API_KEY=<your key, optional>
     ```

4. New → **Static Site** (for frontend)
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/dist`
   - Add env var: `VITE_API_URL=https://<your-backend-url>`

   Or use **Web Service** with Dockerfile.frontend instead.

> Free tier spins down after 15 min inactivity — first request takes ~30s to wake up.

---

## Railway (free tier, simpler)

1. Push to GitHub
2. https://railway.app → New Project → Deploy from GitHub repo
3. Railway auto-detects docker-compose.yml and runs everything including Postgres
4. Add `ANTHROPIC_API_KEY` in the Variables tab
5. Set a custom domain under Settings → Domains

Railway is the easiest option — one click, it reads docker-compose.yml directly.

---

## VPS (DigitalOcean / Hetzner)

```bash
# On the server
git clone <your-repo> && cd aviation_project
cp .env.example .env && nano .env   # add ANTHROPIC_API_KEY
docker compose up -d --build

# Point your domain to the server IP
# Set up nginx + certbot for HTTPS
```

---

## After deploying

1. Run the test suite against the live URL:
   ```bash
   BASE_URL=https://your-app.onrender.com pytest tests/ -v
   ```

2. Take 4–5 screenshots of the dashboard for your README:
   ```
   docs/screenshots/overview.png
   docs/screenshots/forecast.png
   docs/screenshots/churn-shap.png
   docs/screenshots/nlquery.png
   docs/screenshots/elasticity.png
   ```

3. Add to README.md:
   ```markdown
   ## Screenshots
   ![Overview](docs/screenshots/overview.png)
   ![Churn SHAP](docs/screenshots/churn-shap.png)
   ```

4. Add the live URL to your resume and LinkedIn.
