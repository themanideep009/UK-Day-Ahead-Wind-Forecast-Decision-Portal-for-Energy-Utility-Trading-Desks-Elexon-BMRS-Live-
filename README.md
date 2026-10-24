# GB Wind Day-Ahead Forecast Decision Portal

> **Live Production URL:** `https://gb-wind-desk-8f2a.vercel.app` *(or insert your live Vercel URL)*  
> **Interactive API Docs:** `https://gb-wind-desk-8f2a.vercel.app/api/docs`  
> **Attribution:** *Contains BMRS data © Elexon Limited copyright and database right 2026.*

---

## 1. Executive Summary

The **GB Wind Day-Ahead Forecast Decision Portal** is a production-grade analytics and decision-support platform designed for UK electricity trading desks. Commercial power buyers must purchase residual energy prior to day-ahead auction gate closures (EPEX SPOT GB at **09:20** and Nord Pool N2EX at **09:50** UK time) to meet forecast customer demand. 

Because wind generation is weather-dependent and volatile, this portal solves two mission-critical trading problems:
1. **Decision-Time Truth**: Reconstructs the exact national wind forecast that was published and available at gate closure on $D-1$ with strict zero look-ahead bias, displaying the 48 half-hour settlement schedule alongside forecast vintages and horizons.
2. **Empirical Risk Protection**: Quantifies forecast error dynamics across January 2026, derives empirical P10/P90 risk bounds by hour of day, and calculates the exact daily procurement buffer (in MWh) required to guard against asymmetric balancing penalties.

---

## 2. System Architecture

```mermaid
graph TD
    subgraph Data Layer
        Elexon["Elexon BMRS API<br/>(FUELHH & WINDFOR streams)"] --> IngestCLI["Ingestion CLI<br/>(backend/ingest/run.py)"]
        IngestCLI --> FuelSnap["fuelhh_actuals.csv.gz<br/>(14.5 KB, 1,872 rows)"]
        IngestCLI --> WindSnap["windfor_forecasts.csv.gz<br/>(112.8 KB, 22,776 rows)"]
        IngestCLI --> Manifest["manifest.json<br/>(SHA-256 Checksums)"]
    end

    subgraph Backend Engine (FastAPI)
        FuelSnap --> DataAccess["In-Memory Data Loader<br/>(Cached, zoneinfo Europe/London)"]
        WindSnap --> DataAccess
        DataAccess --> AsOf["As-Of Engine<br/>(publishTime <= Cutoff)"]
        DataAccess --> Metrics["Metrics Service<br/>(WAPE, MAE, RMSE, Bias)"]
        DataAccess --> Risk["Risk Service<br/>(Empirical P10/P90 Quantiles)"]
        DataAccess --> Evol["Evolution Service<br/>(Multi-Vintage Tracker)"]
        
        AsOf --> FastAPIRouters["FastAPI Endpoints<br/>(/api/decision, /api/accuracy)"]
        Metrics --> FastAPIRouters
        Risk --> FastAPIRouters
        Evol --> FastAPIRouters
    end

    subgraph Frontend Client (React 18 + TS + Vite)
        FastAPIRouters --> TanStackQuery["TanStack React Query<br/>(Client-Side Caching)"]
        TanStackQuery --> OverviewPage["1. Overview Page<br/>(Executive KPIs & Insights)"]
        TanStackQuery --> DecisionDesk["2. Decision Desk<br/>(48 Periods & Risk Band)"]
        TanStackQuery --> AccuracyPage["3. Forecast Accuracy<br/>(Breakdowns & Histogram)"]
        TanStackQuery --> MethodologyPage["4. Methodology & Data<br/>(Audit & Formulas)"]
    end
```

---

## 3. Directory & File Guide

```text
.
├── backend/
│   ├── app/
│   │   ├── config.py             # Scope definitions, timezone setup, cutoffs
│   │   ├── data_access.py        # In-memory snapshot caching & zoneinfo helpers
│   │   ├── main.py               # FastAPI app, CORS, router mounts
│   │   ├── schemas.py            # Pydantic v2 typed models
│   │   ├── routers/
│   │   │   ├── accuracy.py       # /api/accuracy (summary, by-day, by-hour, by-horizon, dist)
│   │   │   ├── decision.py       # /api/decision (48-period as-of forecast & risk band)
│   │   │   ├── evolution.py      # /api/evolution (multi-vintage forecast trajectory)
│   │   │   ├── health.py         # /api/health check
│   │   │   └── meta.py           # /api/meta (scope info & data hygiene audit)
│   │   └── services/
│   │       ├── asof.py           # Pure as-of forecast calculation (zero look-ahead)
│   │       ├── evolution.py      # Historical vintage trajectory builder
│   │       ├── metrics.py        # Pure math: MAE, RMSE, bias, WAPE, MAPE, insights
│   │       └── risk.py           # Empirical P10/P90 error quantiles & daily MWh buffer
│   ├── data/
│   │   ├── fuelhh_actuals.csv.gz # Gzipped actual outturn wind generation
│   │   ├── manifest.json         # SHA-256 hashes, row counts, source endpoints
│   │   └── windfor_forecasts.csv.gz # Gzipped multi-vintage wind forecasts
│   ├── Dockerfile                # Slim Python 3.11 image with non-root user & healthcheck
│   ├── ingest/
│   │   └── run.py                # Standalone ingestion CLI for live Elexon BMRS API
│   └── tests/
│       ├── test_api.py           # Integration contract tests on FastAPI endpoints
│       ├── test_asof.py          # Boundary inclusive & look-ahead prevention tests
│       ├── test_metrics.py       # Hand-computed verification of all error metrics
│       └── test_risk.py          # Quantile & procurement buffer calculation tests
├── frontend/
│   ├── src/
│   │   ├── api/client.ts         # TypeScript API client & interface types
│   │   ├── components/
│   │   │   ├── Footer.tsx        # Attribution footer
│   │   │   ├── InsightCard.tsx   # Dynamic insight badge card
│   │   │   ├── KpiCard.tsx       # Standardized KPI card
│   │   │   └── Navbar.tsx        # Global header with date picker & cutoff switcher
│   │   ├── lib/
│   │   │   ├── formatters.ts     # MW, MWh, %, and UK time formatters
│   │   │   └── formatters.test.ts # Vitest unit tests for formatters
│   │   ├── pages/
│   │   │   ├── DecisionDesk.tsx  # Requirement 1: 48-period desk, evolution, table
│   │   │   ├── ForecastAccuracy.tsx # Requirement 2: Metric cards, breakdowns, histogram
│   │   │   ├── Methodology.tsx   # Formulas, domain rules, data quality audit
│   │   │   └── Overview.tsx      # Executive pitch page, KPIs, dynamic insights
│   │   ├── App.tsx               # Root routing & TanStack Query provider
│   │   ├── index.css             # Tailwind base & custom trading styles
│   │   └── main.tsx              # React DOM entrypoint
│   ├── Dockerfile                # Multi-stage: Node build -> Nginx serving & proxying
│   ├── nginx.conf                # Nginx proxy config (/api -> backend, SPA fallback)
│   ├── package.json              # React 18, Vite, Recharts, Lucide, Tailwind
│   ├── tailwind.config.js        # Energy trading color theme
│   └── vite.config.ts            # Vite dev proxy configuration & Vitest setup
├── api/
│   └── index.py                  # Vercel Serverless Function entrypoint
├── docs/
│   ├── ARCHITECTURE.md           # Deep-dive architecture and technical design decisions
│   ├── DATA_NOTES.md             # Empirical Phase 0 reconnaissance findings
│   ├── METHODOLOGY.md            # Mathematical formulas and trading interpretations
│   ├── SUBMISSION_CHECKLIST.md   # Step-by-step verification checklist
│   ├── VIDEO_SCRIPT.md           # Timed demo video scripts (Part 1 Pitch, Part 2 Tech)
│   ├── insights.json             # Structured empirical numbers from real dataset
│   └── insights.md               # Markdown summary of verified market statistics
├── scripts/
│   ├── generate_insights.py      # Produces docs/insights.json and docs/insights.md
│   ├── recon_phase0.py           # Phase 0 Elexon API recon script
│   ├── smoke_test.ps1            # PowerShell smoke test script (Windows)
│   └── smoke_test.sh             # Bash smoke test script (Linux/macOS)
├── docker-compose.yml            # One-liner orchestration (frontend:3000, backend:8000)
├── pyproject.toml                # Pytest, ruff, and mypy configuration
├── requirements.txt              # Pinned Python dependencies
└── vercel.json                   # Vercel native deployment configuration
```

---

## 4. How to Run Locally

### Option A: Docker Compose (Recommended One-Liner)
Requires Docker Desktop:
```bash
docker compose up --build
```
- Frontend UI: [http://localhost:3000](http://localhost:3000)
- Backend API Docs (Swagger UI): [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

### Option B: Local Development without Docker

#### 1. Backend (Python 3.11+)
```bash
# From workspace root
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```
API docs available at: [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)

#### 2. Frontend (Node.js 20+)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Running Tests & Quality Checks

### Backend Unit & Integration Tests (Pytest)
```bash
# Runs 14 comprehensive tests (look-ahead, metrics, timezones, API contracts)
pytest -v
```

### Backend Linter & Formatter (Ruff)
```bash
ruff check backend
ruff format --check backend
```

### Frontend Tests & Production Build
```bash
cd frontend
# Run unit tests on formatters
npm test
# Verify TypeScript strict compilation and Vite bundle
npm run build
```

### Automated Smoke Tests
To verify all 5 critical endpoints against any running instance:
```bash
# Against local Docker compose:
bash scripts/smoke_test.sh http://localhost:3000
# Or on Windows PowerShell:
.\scripts\smoke_test.ps1 -BaseUrl "http://localhost:3000"

# Against production Vercel deployment:
bash scripts/smoke_test.sh https://gb-wind-desk-8f2a.vercel.app
```

---

## 6. Refreshing Live Data

The repository includes a committed, verified snapshot from January 2026 (<130 KB). To pull live data directly from Elexon BMRS and regenerate the snapshots:
```bash
python backend/ingest/run.py
python scripts/generate_insights.py
```

---

## 7. Verified Empirical Findings (January 2026 Data)

Every figure below was generated by [`scripts/generate_insights.py`](file:///c:/UK%20Project/scripts/generate_insights.py) directly from real Elexon BMRS outturns:

- **Headline WAPE**: **18.10%** at 09:20 EPEX gate closure (MAE: **2,042.0 MW**, RMSE: **2,509.1 MW**).
- **Systematic Short Bias**: Mean signed error was **+1,747.9 MW**, with **84.7%** of all settlement periods experiencing over-forecasts. Energy buyers who bid purely to central forecasts faced widespread imbalance buy exposure.
- **EPEX (09:20) vs Nord Pool (09:50) Asymmetry**: On **31 out of 31 days (100.0%)**, National Grid ESO published a fresh forecast batch at 09:30 UTC. The Nord Pool N2EX buyer received models that were **2 hours fresher**, reducing monthly WAPE to **17.87%** (a 25.7 MW MAE reduction).
- **Horizon Decay**: Forecast accuracy improves monotonically as delivery approaches:
  - 48h+ Horizon: **20.35% WAPE** (2,317.3 MW MAE)
  - 24–36h Horizon: **17.89% WAPE** (2,018.8 MW MAE)
  - 0–6h Horizon: **14.76% WAPE** (1,660.0 MW MAE)
- **Empirical Risk Buffer**: Sizing a daily procurement reserve at **97,094 MWh** across the 48 settlement half-hours provided 90% confidence against being left short.

---

## 8. Deployment Configuration (Vercel)

The portal is configured for serverless deployment on Vercel from a single repository via [`vercel.json`](file:///c:/UK%20Project/vercel.json):
- Static Vite build served from `frontend/dist`.
- FastAPI backend served as a Python Serverless Function via `api/index.py`.
- Snapshot data bundled via `includeFiles`.
- URL rewrites provide SPA client-side routing while routing `/api/*` to FastAPI.

### Deploying to Vercel
```bash
# 1. Login to Vercel CLI
vercel login

# 2. Deploy project
vercel --prod
```

---

## 9. AI Tools Disclosure

In accordance with project guidelines:
- **AI Tools Used**: Google Antigravity / Gemini Advanced Coding Agent.
- **Tasks Performed**: Autonomous code scaffolding, TypeScript interface generation, Tailwind layout structuring, documentation drafting, and initial test file generation.
- **Independent Verification**: The engineer independently reviewed, audited, and debugged all mathematical implementations (as-of filtering boundary logic, zero look-ahead enforcement, WAPE/MAPE formulations, risk quantiles), verified all unit test assertions against hand-computed matrices, and confirmed that every statistic cited in documentation is produced by code from the live Elexon BMRS dataset.

---

## 10. Limitations & Next Steps

1. **Balancing Cashflow Quantification**: Currently calculates MW and MWh deviations. Integrating outturn System Buy Prices (SBP) and System Sell Prices (SSP) will compute direct financial imbalance penalties (£).
2. **Solar PV & National Demand**: Residual procurement depends on total net load. Adding Elexon solar outturns and national demand (`ND`) will complete the portfolio picture.
3. **Live Operational Streaming**: Adding a scheduled task that executes with `cutoff = now()` to support intraday trading desks right up to settlement period gate closure.
