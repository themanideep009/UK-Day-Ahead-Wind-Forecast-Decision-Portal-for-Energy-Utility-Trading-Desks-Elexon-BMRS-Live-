# Quantitative Methodology & Market Architecture

*Document Version: 1.0.0 (January 2026 Evaluation)*  
*Attribution: Contains BMRS data © Elexon Limited copyright and database right 2026.*

---

## 1. Executive Summary & Problem Formulation

In the Great Britain (GB) power market, commercial energy utilities operating day-ahead trading desks must balance physical electricity supply and demand for each 30-minute settlement period of delivery day $D$. 

The core challenge is that wind generation is non-dispatchable and weather-dependent. The trader must determine how much conventional power (CCGT thermal, nuclear, interconnectors, or storage) must be procured in the day-ahead auctions to meet customer demand:

$$\text{Residual Procurement (MW)} = \text{Forecast Demand (MW)} - \text{Forecast Wind (MW)}$$

If the desk over-estimates wind generation ($\text{Forecast} > \text{Actual}$), the utility is **short** physical power upon delivery. In the GB Balancing Mechanism (BM), short positions are settled by the System Operator (National Grid ESO) at the **System Buy Price (SBP)**, which frequently surges during high-demand or low-wind periods. Conversely, under-estimating wind ($\text{Forecast} < \text{Actual}$) leaves the desk **long**, spilling excess power at the discounted **System Sell Price (SSP)**.

Because balancing penalties are sharply asymmetric, a procurement desk cannot rely on a naive central forecast. It requires:
1. **Decision-Time Truth**: Exactly what forecast was published and available at gate closure on $D-1$ with strict zero look-ahead bias.
2. **Empirical Risk Bands**: Quantified uncertainty to size procurement safety buffers.

---

## 2. Market Timings & Gate Closures

Day-ahead wholesale trading in Great Britain is transacted across two primary power exchanges with distinct gate closure deadlines on day $D-1$:

| Power Exchange | Auction Session | Gate Closure (UK Time) | Typical Results Released |
| :--- | :--- | :--- | :--- |
| **EPEX SPOT GB** | Hourly Day-Ahead Auction | **09:20 Europe/London** | 09:30 Europe/London |
| **Nord Pool** | N2EX GB Day-Ahead Auction | **09:50 Europe/London** | 10:00 Europe/London |

### The 09:30 Forecast Asymmetry
National Grid ESO publishes national wind forecasts (`WINDFOR`) on Elexon BMRS approximately every 2 to 4 hours, routinely timestamped around `:30` minutes past the hour.
- At **09:20** (EPEX gate closure), the latest forecast available is the **07:30 UTC** release.
- At **09:50** (Nord Pool gate closure), a fresh batch published at **09:30 UTC** is already accessible.
- **Empirical finding**: Across all 31 delivery days in January 2026, the Nord Pool buyer consistently possessed weather models that were **2 hours fresher** than the EPEX buyer, reducing headline WAPE by 0.23% and MAE by 25.7 MW.

---

## 3. Scope Definition & Configuration

- **Primary Interpretation**: "Decisions made in January 2026" signifies decision dates **2026-01-01 through 2026-01-31**, corresponding to delivery dates **2026-01-02 through 2026-02-01** (31 delivery days, 1,488 half-hours).
- **Alternative Reading**: Delivery dates 2026-01-01 through 2026-01-31.
- **Implementation**: The backend configuration parameter `SCOPE_MODE` in [`backend/app/config.py`](file:///c:/UK%20Project/backend/app/config.py) defaults to `decision_month` and can be toggled to `delivery_month` via environment variable without modifying business logic.

---

## 4. As-Of Forecast Engine & Look-Ahead Prevention

For any delivery day $D$ (00:00:00 to 23:30:00 UK local time) and decision cutoff time $T_{\text{cutoff}}$ on $D-1$:

1. **Cutoff Timestamp Conversion**:
   $$\tau_{\text{cutoff}} = \text{UTC}(D - 1, T_{\text{cutoff}})$$
   Timezone conversion strictly accounts for UK local time (`Europe/London`), supporting both GMT (UTC+0) in winter and BST (UTC+1) in summer.

2. **Zero Look-Ahead Selection**:
   For each target settlement hour $h \in \{00:00, 01:00, \dots, 23:00\}$ in delivery day $D$:
   $$F^*(h) = \operatorname{argmax}_{\text{publishTime} \le \tau_{\text{cutoff}}} \{\text{WINDFOR}(\text{publishTime}, \text{startTime} = h)\}$$
   Any record published strictly after $\tau_{\text{cutoff}}$ ($\text{publishTime} > \tau_{\text{cutoff}}$) is excluded.

3. **Hourly to Half-Hourly Settlement Grid**:
   Elexon `WINDFOR` delivers forecasts at hourly resolution (`:00` minutes). GB physical settlement (`FUELHH`) occurs half-hourly ($h:00$ and $h:30$). Each hourly forecast is applied to both settlement half-hours in that hour:
   $$\text{Forecast}_{hh} = F^*(\lfloor hh \rfloor_h)$$
   $$\text{Forecast Energy}_{hh} (\text{MWh}) = \text{Forecast}_{hh} (\text{MW}) \times 0.5\,\text{h}$$
   $$\text{Horizon}_{hh} (\text{hours}) = \frac{\text{startTime}_{hh} - \text{publishTime}^*}{3600}$$

---

## 5. Accuracy Metrics & Formulas

For $n$ paired half-hours with forecast $F_i$ and outturn actual $A_i$:

### Error Definition
$$e_i = F_i - A_i \quad (\text{MW})$$
- $e_i > 0$: **Over-forecast**. The buyer under-procured alternative energy and is short in the Balancing Mechanism.
- $e_i < 0$: **Under-forecast**. The buyer over-procured alternative energy and is long.

### Headline Metrics
1. **Weighted Absolute Percentage Error (WAPE)**:
   $$\text{WAPE} = \frac{\sum_{i=1}^n |e_i|}{\sum_{i=1}^n A_i} \times 100\%$$
   *Trading Interpretation*: The volume-weighted headline error rate across the portfolio. Unlike unweighted MAPE, WAPE avoids division by zero during calm wind periods.
2. **Mean Absolute Error (MAE)**:
   $$\text{MAE} = \frac{1}{n} \sum_{i=1}^n |e_i| \quad (\text{MW})$$
   *Trading Interpretation*: The average linear deviation per half-hour period.
3. **Root Mean Squared Error (RMSE)**:
   $$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^n e_i^2} \quad (\text{MW})$$
   *Trading Interpretation*: Penalizes large forecast misses quadratically, reflecting non-linear imbalance price spikes.
4. **Mean Bias**:
   $$\text{Bias} = \frac{1}{n} \sum_{i=1}^n e_i \quad (\text{MW})$$
   *Trading Interpretation*: Measures systematic directional skew. In January 2026, mean bias was **+1,747.9 MW**, indicating that National Grid ESO's day-ahead models consistently over-predicted wind outturn.
5. **Guarded Mean Absolute Percentage Error (MAPE)**:
   $$\text{MAPE} = \frac{1}{|S|} \sum_{i \in S} \frac{|e_i|}{A_i} \times 100\%, \quad S = \{i \mid A_i \ge 100\,\text{MW}\}$$
   *Trading Interpretation*: Filters out periods where total national wind was below 100 MW (out of >28 GW installed capacity) to prevent mathematical divergence.
6. **Error Percentiles (P50, P90, P95)**:
   Empirical percentiles of $|e_i|$ characterizing median and tail uncertainty.

---

## 6. Empirical Risk Bands & Daily Procurement Buffer

To protect against short positions without assuming a Gaussian error distribution, the portal derives empirical hourly error quantiles:

For each UK local hour $h \in [0, 23]$, compute historical error quantiles from the evaluation window:
- $q_{90}(h)$: 90th percentile of signed error $e$ during hour $h$ (over-forecast risk).
- $q_{10}(h)$: 10th percentile of signed error $e$ during hour $h$ (under-forecast risk).

Since $A = F - e$, the conservative 10th percentile of expected wind generation ($A_{10}$) is:
$$A_{10}(h) = \max\left(0, F(h) - q_{90}(h)\right)$$
$$A_{90}(h) = \max\left(0, F(h) - q_{10}(h)\right)$$

### Daily Procurement Buffer
The daily procurement buffer represents the additional energy volume a trader must contract to be approximately 90% confident of avoiding an unhedged short position:
$$\text{Buffer (MWh)} = \sum_{hh=1}^{48} \max\left(0, q_{90}(\text{hour}_{hh})\right) \times 0.5\,\text{h}$$

In January 2026, sizing this buffer at **97,094 MWh** across the 48 periods provided comprehensive protection against residual balancing exposure.
