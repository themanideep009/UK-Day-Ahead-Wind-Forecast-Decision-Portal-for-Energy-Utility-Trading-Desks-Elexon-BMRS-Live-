"""
Unit tests for Risk Band and procurement buffer calculations.
"""

import pandas as pd

from backend.app.services.risk import apply_risk_band_to_forecast, compute_hourly_error_quantiles


def test_hourly_error_quantiles_and_risk_band():
    # Synthetic dataframe with 48 half-hours (2 per hour)
    hours = []
    start_times = []
    errors = []
    for h in range(24):
        for m in (0, 30):
            hours.append(h)
            start_times.append(pd.Timestamp(f"2026-01-02 {h:02d}:{m:02d}:00", tz="UTC"))
            # Error = +200 MW (over-forecast)
            errors.append(200.0)

    df_hist = pd.DataFrame({"startTime": start_times, "uk_hour": hours, "error_mw": errors})

    quantiles = compute_hourly_error_quantiles(df_hist, lower_quantile=0.10, upper_quantile=0.90)
    assert 0 in quantiles
    assert quantiles[0]["q_high"] == 200.0
    assert quantiles[0]["q_low"] == 200.0

    # Apply to a forecast of 5000 MW
    asof_df = pd.DataFrame({"startTime": start_times, "forecast_mw": [5000.0] * 48})

    banded_df, summary = apply_risk_band_to_forecast(asof_df, quantiles, 0.10, 0.90)

    # Lower bound = max(0, 5000 - 200) = 4800 MW
    assert banded_df["risk_p10_mw"].iloc[0] == 4800.0
    # Buffer per period = 200 * 0.5 = 100 MWh. For 48 periods = 4800 MWh.
    assert summary["daily_buffer_p10_mwh"] == 4800.0
    assert "plan for 4,800 MWh less wind" in summary["interpretation"]
