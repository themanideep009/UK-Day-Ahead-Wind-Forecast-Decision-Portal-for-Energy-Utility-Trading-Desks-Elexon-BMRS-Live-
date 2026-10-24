# Elexon BMRS Data Reconnaissance & Findings (Phase 0)

*Reconnaissance conducted on live Elexon BMRS API endpoints.*
*Attribution: Contains BMRS data © Elexon Limited copyright and database right 2026.*

## 1. Executive Summary

- **API Connectivity & Stability**: Both `/datasets/FUELHH/stream` and `/datasets/WINDFOR/stream` endpoints respond reliably without authentication or rate limits (under 3 concurrent requests).
- **Scope Ingested**: Ingested full evaluation buffer spanning **2025-12-28 to 2026-02-04** (39 calendar days).
- **FUELHH Actuals**:
  - Exactly **48 half-hours per day** across all 39 days (total 1,872 records).
  - Zero duplicate timestamps on `startTime`.
  - Zero null or missing `generation` values.
  - Wind generation ranged from **1,695 MW** to **17,805 MW** (mean: **11,076 MW**).
- **WINDFOR Forecasts**:
  - Total deduplicated records across buffer: **22,776 rows**.
  - **Cadence**: Published every 2 to 4 hours (predominantly 2h, 3h, and 4h cycles, typical release at `:30` minutes past the hour, e.g. 01:30, 04:30, 07:30, 09:30, 11:30 UTC).
  - **Target Resolution**: Forecast target `startTime` is **hourly** (`:00` minutes).
  - **Horizon Span**: Each batch covers targets from past hours (re-analysis / back-casts) up to ~**66.5h to 72h ahead**.
- **Decision Desk Coverage**:
  - Every single delivery day for decisions made in January 2026 (2026-01-02 to 2026-02-01) achieves **100% coverage (24/24 hours = 48/48 half-hours)** under both **09:20** and **09:50** cutoffs.
  - On **31 of the 31 delivery days (100.0%)**, an updated forecast vintage was published at **09:30 UTC**, directly impacting the trader's information set between the EPEX SPOT 09:20 auction and the Nord Pool N2EX 09:50 auction!

---

## 2. Dataset Structure & Key Schema Facts

### Actuals: `FUELHH`
- **Endpoint**: `GET https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
- **Key Parameters**: `settlementDateFrom`, `settlementDateTo`, `fuelType=WIND`.
- **Primary Key**: `startTime` (ISO-8601 UTC string, 30-min cadence).
- **Fields retained**: `startTime`, `settlementDate`, `settlementPeriod`, `generation` (MW).
- **Cadence**: 48 periods per calendar day (periods 1 to 48).
- **Energy conversion**: $\text{Energy (MWh)} = \text{generation (MW)} \times 0.5\,\text{h}$.

### Forecasts: `WINDFOR`
- **Endpoint**: `GET https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
- **Key Parameters**: `publishDateTimeFrom`, `publishDateTimeTo` (chunked by week).
- **Composite Key**: `(publishTime, startTime)`.
- **Fields retained**: `publishTime`, `startTime`, `generation` (MW).
- **Granularity**: Hourly `startTime` (`00:00`, `01:00`, ..., `23:00`).
- **Half-hour expansion**: To compare against 48-period settlement actuals, each hourly forecast applies to both settlement periods of that hour (`:00` and `:30`). For example, the forecast for `14:00` provides the forecast MW for both `14:00-14:30` (period 29) and `14:30-15:00` (period 30).

---

## 3. Data Quality & Hygiene Findings

| Dimension | FUELHH (Actuals) | WINDFOR (Forecasts) |
| :--- | :--- | :--- |
| **Date Range Tested** | 2025-12-28 to 2026-02-04 | 2025-12-27 to 2026-02-04 |
| **Row Count** | 1,872 | 22,776 |
| **Expected Half-Hours** | 1,872 (39 days × 48) | N/A (Continuous multi-vintage batches) |
| **Found Half-Hours** | 1,872 (100.0%) | 100% of target hours covered |
| **Duplicates** | 0 on `startTime` | 0 on `(publishTime, startTime)` |
| **Gaps** | 0 | 0 for all D-1 decision cutoffs |
| **Negative Generation** | 0 (Min: 1,695 MW) | 0 (Min: 1,981 MW) |
| **Max Generation** | 17,805 MW | 21,353 MW |

---

## 4. Cutoff Behavior: EPEX (09:20) vs Nord Pool (09:50)

In the GB day-ahead power market:
- **EPEX SPOT GB Hourly Day-Ahead** gate closure is at **09:20 Europe/London**.
- **Nord Pool N2EX GB Day-Ahead** gate closure is at **09:50 Europe/London**.

Empirical findings from the live dataset:
1. National Grid ESO frequently publishes an updated wind forecast batch at **09:30 UTC**.
2. Consequently, a buyer submitting orders at 09:20 receives the **07:30 UTC** forecast batch (decision horizon ~16.5h to 39.5h).
3. A buyer submitting orders at 09:50 receives the fresh **09:30 UTC** forecast batch (decision horizon ~14.5h to 37.5h).
4. This occurred on **31 out of 31 days** in January 2026. This dynamic makes the comparison toggle between 09:20 and 09:50 a powerful demonstration of market information asymmetry.

---

## 5. Storage & Performance Budget

- **Snapshot File Design**:
  - `fuelhh_actuals.csv.gz` (~25 KB compressed)
  - `windfor_forecasts.csv.gz` (~650 KB compressed)
  - `manifest.json` (metadata, checksums, source URLs, timestamps)
- Total compressed snapshot size is **< 1 MB**, well within the Vercel 500 MB serverless function limit and GitHub repository best practices.
- Python runtime loads the gzipped CSV directly via `pandas.read_csv(..., compression='gzip')` in < 25ms, avoiding any heavy `pyarrow` dependency.

---

## 6. Confirmation of Core Assumptions

1. **Scope Reading**: "Decisions made in January 2026" corresponds to decision dates **2026-01-01 through 2026-01-31**, corresponding to delivery dates **2026-01-02 through 2026-02-01**. The backend configuration `SCOPE_MODE` allows switching between `decision_month` (Jan 2 - Feb 1) and `delivery_month` (Jan 1 - Jan 31) with a single flag.
2. **As-Of Selection Rule**: For each target half-hour in day D, take the WINDFOR row with $\max(\text{publishTime}) \le \text{cutoff}$. No look-ahead is strictly guaranteed.
3. **Hourly to Half-Hourly Alignment**: WINDFOR forecasts are hourly; each hour's forecast applies to both 30-minute settlement periods ($h:00$ and $h:30$), yielding 48 periods with Energy = $\text{MW} \times 0.5\,\text{h}$.
4. **Horizon Analysis**: Horizons range up to 72 hours. Horizon buckets: `[0, 6h)`, `[6, 12h)`, `[12, 24h)`, `[24, 36h)`, `[36, 48h)`, `[48, 72h)`.
