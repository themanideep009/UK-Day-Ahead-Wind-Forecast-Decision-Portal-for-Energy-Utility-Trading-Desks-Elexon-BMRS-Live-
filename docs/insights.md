# Verified Empirical Market Insights (January 2026)

*Generated from live Elexon BMRS data snapshot (FUELHH and WINDFOR).*
*Evaluation window: 2026-01-02 to 2026-02-01 (31 delivery days, 1,488 half-hours).*

## 1. Headline Accuracy Metrics (Cutoff 09:20 EPEX SPOT)

| Metric | Value | Interpretation |
| :--- | :--- | :--- |
| **Headline WAPE** | **18.10%** | Overall volume-weighted forecast error rate across GB |
| **MAE** | **2042.0 MW** | Average linear deviation per 30-min settlement period |
| **RMSE** | **2509.1 MW** | Quadratic penalty reflecting higher imbalance risk |
| **Mean Bias** | **+1747.9 MW** | Over-forecast: net short position exposed to balancing purchases |
| **Guarded MAPE** | **22.11%** | Mean percentage error guarded against zero/near-zero actuals (&ge;100 MW) |
| **P50 Absolute Error** | **1688.0 MW** | Median error magnitude |
| **P90 Absolute Error** | **4140.1 MW** | 90% of all half-hours experienced deviations within this magnitude |
| **P95 Absolute Error** | **5310.0 MW** | Extreme 95th percentile risk tail |
| **Over vs Under Share**| **84.7% / 15.3%** | Share of periods where forecast &gt; actual vs forecast &lt; actual |

### Extreme Outturn Excursions
- **Largest Over-Forecast**: **+6,894 MW** on `2026-01-12` (Period 3). Forecast was 20,942 MW vs actual 14,048 MW.
- **Largest Under-Forecast**: **-3,835 MW** on `2026-01-08` (Period 38). Forecast was 5,349 MW vs actual 9,184 MW.

---

## 2. Gate Closure Comparison: 09:20 EPEX vs 09:50 Nord Pool

National Grid ESO regularly publishes an updated wind forecast batch at **09:30 UTC**.

| Dimension | 09:20 EPEX Cutoff | 09:50 Nord Pool Cutoff | Net Improvement |
| :--- | :--- | :--- | :--- |
| **Days with Updated Batch** | — | **31 / 31 (100.0%)** | 100% of days had fresh data |
| **Average Decision Horizon** | ~16.5h to 39.5h | ~14.5h to 37.5h | **2 hours fresher** |
| **Headline WAPE** | **18.10%** | **17.87%** | **0.23% improvement** |
| **MAE** | **2042.0 MW** | **2016.3 MW** | **25.7 MW reduction** |
| **RMSE** | **2509.1 MW** | **2510.2 MW** | **-1.1 MW reduction** |

---

## 3. Daily & Intraday Error Dynamics

### Day-Ahead Volatility Extremes
- **Best Day**: `2026-01-20` with **7.00% WAPE** (MAE 1058.5 MW).
- **Worst Day**: `2026-01-28` with **93.32% WAPE** (MAE 5374.8 MW).

### Diurnal Profile (Hour of Day UK Time)
- **Peak Error Hour**: Hour `05:00` UK with MAE **2436.1 MW** (P90 error +4881.6 MW).
- **Lowest Error Hour**: Hour `21:00` UK with MAE **1788.5 MW**.

---

## 4. Empirical Risk Buffers

To be approximately 90% confident of avoiding a short position on delivery day D:
- **Low Wind Day (2026-01-08)**:
  - Forecast Energy: 128,948 MWh
  - Actual Outturn: 108,674 MWh
  - **P10 Risk Buffer**: **97,094 MWh**
- **High Wind Day (2026-01-27)**:
  - Forecast Energy: 477,303 MWh
  - Actual Outturn: 393,804 MWh
  - **P10 Risk Buffer**: **97,094 MWh**

---

## 5. Accuracy by Forecast Horizon

| Horizon Bucket | Vintages Evaluated | MAE (MW) | WAPE (%) |
| :--- | :--- | :--- | :--- |
| **0-6h** | 1,488 | 1660.0 MW | 14.76% |
| **6-12h** | 1,488 | 1734.5 MW | 15.32% |
| **12-24h** | 2,976 | 1893.2 MW | 16.78% |
| **24-36h** | 2,976 | 2018.8 MW | 17.89% |
| **36-48h** | 2,945 | 2249.8 MW | 19.95% |
| **48h+** | 2,510 | 2317.3 MW | 20.35% |
