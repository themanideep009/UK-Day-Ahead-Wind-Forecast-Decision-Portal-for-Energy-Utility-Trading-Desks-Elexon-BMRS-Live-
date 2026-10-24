# Demo Video Script & Shot List (10-Minute Walkthrough)

*Total Duration: Target 9:00 (Part 1: 4:30, Part 2: 4:30 | Hard cap: 10:00).*  
*Format: Screen recording with spoken audio walkthrough. Every number cited matches the real Elexon BMRS January 2026 data.*

---

## Part 1: Customer Pitch — The Day-Ahead Decision Desk (4:30)

### Segment 1: The Commercial Problem & Gate Closure Deadlines (0:00 – 1:00)
- **Screen**: Overview page (`/`).
- **Click Path**: Hover over the headline banner, point cursor at the `09:20 EPEX` badge and the WAPE KPI card.
- **Numbers on Screen**:
  - Headline WAPE: `18.10%`
  - Systematic Mean Bias: `+1,747.9 MW` (Over-Forecast / Net Short)
  - Short Exposure Share: `84.7%`
- **Spoken Script**:
  > *"Good morning. If you operate a day-ahead power trading desk in Great Britain, your morning comes down to one high-stakes calculation: how much conventional generation must you buy before gate closure to cover your demand, once wind is accounted for?
  >
  > In the GB market, you face a hard deadline: the EPEX SPOT auction closes at 09:20 UK time. But wind forecasts from National Grid ESO aren't static. In January 2026, the headline wind forecast error was 18.10% WAPE, with an average linear error of 2,042 MW per half-hour.
  >
  > Even more critical: the forecast suffered from a systematic positive bias of +1,748 MW. In 84.7% of all settlement periods, wind outturn fell short of what was forecast. That means buying strictly to the central forecast leaves you structurally short in the Balancing Mechanism, forced to buy cashout power at penal System Buy Prices.
  >
  > Today, I'm presenting our Day-Ahead Wind Decision Portal—engineered specifically to solve this operational challenge."*

### Segment 2: Live Demo — The Decision Desk & As-Of Forecaster (1:00 – 2:15)
- **Screen**: Navigate to Decision Desk (`/decision`).
- **Click Path**: Select delivery date `2026-01-12`. Toggle between `09:20 EPEX` and `09:50 N2EX`. Click on Period 3 (01:00 UK time) to open the Vintage Evolution chart.
- **Numbers on Screen**:
  - Delivery Date: `2026-01-12`
  - Cutoff Forecast: `20,942 MW` (Period 3)
  - Outturn Actual: `14,048 MW`
  - Over-forecast excursion: `+6,894 MW`
- **Spoken Script**:
  > *"Let's go to the Decision Desk. Here, the trader selects their target delivery day. Let's look at January 12th.
  >
  > Notice what the portal does: it reconstructs the exact state of knowledge available at 09:20 on D-1. There is zero look-ahead bias. You see the 48 settlement half-hours, the exact vintage publish timestamp used—here published at 07:30 UTC—and the forecast horizon.
  >
  > Now, watch what happens when we switch gate closures to 09:50 Nord Pool N2EX. On all 31 days in January 2026, National Grid ESO released an updated forecast batch at 09:30 UTC. By choosing N2EX or trading across both exchanges, the desk gains access to models that are 2 hours fresher, reducing headline error across the month.
  >
  > If we click on Period 3, the Forecast Evolution Explorer shows the entire history of this half-hour from 72 hours out down to delivery. On this day, the forecast was revised upward too aggressively, creating an over-forecast of nearly 6,900 MW."*

### Segment 3: Sizing the Protection — Empirical Risk Bands (2:15 – 3:30)
- **Screen**: Decision Desk risk band panel.
- **Click Path**: Click "Reveal Outturn Actuals (Back-Test)", then point to the shaded indigo P10/P90 risk band and the Daily Buffer card.
- **Numbers on Screen**:
  - Daily Procurement Buffer: `97,094 MWh`
  - P10 Wind Lower Bound vs Central Forecast
  - Excursions contained within band: `90%`
- **Spoken Script**:
  > *"Because wind errors are non-Gaussian, a central forecast is dangerous. That's why we built our Empirical Risk Engine.
  >
  > Rather than theoretical normal distributions, the system analyzes historical error quantiles by hour of day. Look at this indigo band: it defines the P10 and P90 bounds of expected wind generation.
  >
  > Crucially, it translates this into a single, concrete instruction for the buyer: 'To be about 90% sure of not being short, plan for 97,094 MWh less wind than the central forecast.'
  >
  > When we toggle 'Reveal Actuals', you can see that the outturn green line stays securely above the P10 lower bound 90% of the time. The trader has a statistically grounded safety buffer to hedge balancing price spikes before placing bids."*

### Segment 4: Commercial Value & Next Steps (3:30 – 4:30)
- **Screen**: Forecast Accuracy page (`/accuracy`).
- **Click Path**: Scroll through the diurnal profile and the horizon degradation chart.
- **Numbers on Screen**:
  - Horizon accuracy: `14.76%` at 0-6h up to `20.35%` at 48h+
  - Worst day: `2026-01-28` (93.3% WAPE)
  - Best day: `2026-01-20` (7.0% WAPE)
- **Spoken Script**:
  > *"On the Accuracy page, the desk can dissect performance across any time window. Notice our horizon analysis: as delivery approaches, accuracy improves monotonically from 20.35% WAPE at 48 hours to 14.76% inside 6 hours.
  >
  > In summary, this portal turns unquantified weather forecasts into disciplined procurement decisions:
  > First, zero look-ahead ensures your models reflect real auction cutoffs.
  > Second, empirical P10 risk sizing protects your balance sheet against the 85% short bias.
  > And third, exchange cutoff comparisons allow you to capture information arbitrage between EPEX and Nord Pool.
  >
  > Our next phase integrates live balancing price feeds and solar forecasts. Thank you."*

---

## Part 2: Technical Walkthrough — Architecture & Codebase (4:30)

### Segment 1: System Architecture & Data Pipeline (0:00 – 1:00)
- **Screen**: Code editor showing [`docs/ARCHITECTURE.md`](file:///c:/UK%20Project/docs/ARCHITECTURE.md) and directory tree.
- **Click Path**: Show `backend/ingest/run.py` and `backend/data/manifest.json`.
- **Spoken Script**:
  > *"Welcome to Part 2. I'm the technical lead on this build. Let's walk through the architecture, data pipeline, and software engineering practices.
  >
  > Our stack is clean and lightweight: a Python 3.11 FastAPI backend, paired with a React 18 TypeScript frontend built on Vite and Tailwind CSS.
  >
  > For data ingestion, `backend/ingest/run.py` connects to Elexon BMRS's public stream endpoints: FUELHH for actuals and WINDFOR for forecasts. We pull the data in weekly chunks with exponential backoff on 429 and 5xx statuses.
  >
  > Because January 2026 data is immutable, we compile it into compressed CSV snapshots—less than 130 KB in total—accompanied by a cryptographic `manifest.json` containing SHA-256 checksums. This guarantees reproducible, zero-latency in-memory loads under 25 milliseconds, with no pyarrow bloat, staying well inside Vercel's 500 MB serverless ceiling."*

### Segment 2: As-Of Engine & Look-Ahead Prevention (1:00 – 2:00)
- **Screen**: Code editor showing [`backend/app/services/asof.py`](file:///c:/UK%20Project/backend/app/services/asof.py) and [`backend/tests/test_asof.py`](file:///c:/UK%20Project/backend/tests/test_asof.py).
- **Click Path**: Highlight `compute_asof_forecast` function and run `pytest backend/tests/test_asof.py`.
- **Spoken Script**:
  > *"The heart of the backend is our pure-function service layer in `backend/app/services/asof.py`.
  >
  > Look at the core selection logic: we take the delivery date D and cutoff on D-1. We convert the UK local time to UTC using Python's native `zoneinfo` with Europe/London, properly handling winter GMT and summer BST.
  >
  > Then, we filter WINDFOR records with a strict upper bound: `publishTime <= cutoff_utc`. We group by hourly target start time and take the last record.
  >
  > In `backend/tests/test_asof.py`, we test this boundary rigorously. A forecast published exactly at 09:20 is included; a forecast published at 09:20:01 is strictly excluded. We also map the hourly forecasts across both 30-minute settlement periods, ensuring a continuous 48-period schedule with energy computed as MW times 0.5 hours."*

### Segment 3: Accuracy Metrics & Empirical Risk Service (2:00 – 3:00)
- **Screen**: Code editor showing [`backend/app/services/metrics.py`](file:///c:/UK%20Project/backend/app/services/metrics.py) and [`backend/app/services/risk.py`](file:///c:/UK%20Project/backend/app/services/risk.py).
- **Click Path**: Highlight `compute_metrics` and run `pytest backend/tests/test_metrics.py`.
- **Spoken Script**:
  > *"In `backend/app/services/metrics.py`, we compute all headline metrics: MAE, RMSE, signed bias, and WAPE—volume-weighted absolute error. For MAPE, we guard against division by zero during calm periods by filtering out actual generation below 100 MW.
  >
  > In `backend/tests/test_metrics.py`, every single metric is verified against exact hand-calculated synthetic vectors.
  >
  > In `risk.py`, we derive hourly error quantiles. Since error is forecast minus actual, the actual wind lower bound A_10 is simply forecast minus the 90th percentile of error. Summing this across all 48 half-hours produces the exact daily procurement buffer required to cover 90% of outcomes."*

### Segment 4: Frontend Implementation, Docker & Deployment (3:00 – 4:00)
- **Screen**: Terminal and browser showing Docker compose and tests.
- **Click Path**: Run `pytest`, `npm test` in frontend, show `docker-compose.yml` and `vercel.json`.
- **Spoken Script**:
  > *"On the frontend, everything is strictly typed with TypeScript interfaces matching our Pydantic v2 schemas. We use TanStack Query for client-side caching and Recharts for interactive visualization.
  >
  > For containerization, we provide a multi-stage frontend Dockerfile running Nginx that proxies `/api` calls to a slim Python backend container with a non-root user and healthcheck. Running `docker compose up --build` brings up the entire platform on port 3000 in seconds.
  >
  > For serverless hosting on Vercel, `vercel.json` configures the static Vite build alongside our Python function entrypoint in `api/index.py` with SPA rewrite fallbacks."*

### Segment 5: Testing, AI Disclosure & Closing (4:00 – 4:30)
- **Screen**: Terminal showing green test suite and git log.
- **Click Path**: Run `scripts/smoke_test.ps1`.
- **Spoken Script**:
  > *"Our entire test suite—unit tests, API contract tests, and frontend formatters—runs in under two seconds.
  >
  > Disclosure: In accordance with project requirements, AI tools were utilized for rapid code scaffolding, typing, and documentation generation. All domain rules, math, unit tests, and empirical numbers were independently reviewed and verified against live Elexon API data.
  >
  > The repository is fully open-source with an anonymous identity, detailed documentation, and automated smoke test scripts. Thank you."*
