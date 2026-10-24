"""
Risk band and daily buffer service.
Computes empirical error quantiles (P10/P90) by hour of day from historical outturn data,
applies them to the decision-time forecast to produce risk-adjusted wind profiles,
and computes the daily MWh buffer needed to guard against short positions.
"""

from typing import Dict, Tuple

import numpy as np
import pandas as pd

from backend.app.config import TZ_LONDON


def compute_hourly_error_quantiles(
    historical_df: pd.DataFrame, lower_quantile: float = 0.10, upper_quantile: float = 0.90
) -> Dict[int, Dict[str, float]]:
    """
    Computes empirical error quantiles by hour of day (0-23 UK time) from historical data.
    Error = Forecast - Actual (MW).
    """
    df = historical_df.copy()
    if "uk_hour" not in df.columns:
        df["local_time"] = pd.to_datetime(df["startTime"]).dt.tz_convert(TZ_LONDON)
        df["uk_hour"] = df["local_time"].dt.hour

    hourly_quantiles = {}
    for hr, group in df.groupby("uk_hour"):
        errs = group["error_mw"].dropna().values
        if len(errs) > 0:
            q_low = float(np.percentile(errs, lower_quantile * 100))
            q_high = float(np.percentile(errs, upper_quantile * 100))
            hourly_quantiles[int(hr)] = {
                "q_low": round(q_low, 1),
                "q_high": round(q_high, 1),
                "p50": round(float(np.percentile(errs, 50)), 1),
            }
        else:
            hourly_quantiles[int(hr)] = {"q_low": 0.0, "q_high": 0.0, "p50": 0.0}

    # Ensure all 24 hours exist
    for h in range(24):
        if h not in hourly_quantiles:
            hourly_quantiles[h] = {"q_low": 0.0, "q_high": 0.0, "p50": 0.0}

    return hourly_quantiles


def apply_risk_band_to_forecast(
    asof_df: pd.DataFrame,
    hourly_quantiles: Dict[int, Dict[str, float]],
    lower_quantile: float = 0.10,
    upper_quantile: float = 0.90,
) -> Tuple[pd.DataFrame, Dict[str, float]]:
    """
    Applies empirical error quantiles to an as-of forecast.
    Since Error E = Forecast F - Actual A:
      Lower bound of wind (p10 actual wind): F - E_p90
      Upper bound of wind (p90 actual wind): F - E_p10
    Clip lower bound at 0 MW (wind generation cannot be negative).
    Daily buffer = sum(E_p90 * 0.5) MWh:
      "To be ~90% sure of not being short, plan for X MWh less wind than forecast."
    """
    df = asof_df.copy()
    df["local_time"] = pd.to_datetime(df["startTime"]).dt.tz_convert(TZ_LONDON)
    df["uk_hour"] = df["local_time"].dt.hour

    p10_wind = []
    p90_wind = []
    buffer_mwh_list = []

    for _, row in df.iterrows():
        hr = int(row["uk_hour"])
        f_mw = float(row["forecast_mw"])
        q = hourly_quantiles.get(hr, {"q_low": 0.0, "q_high": 0.0})

        # Wind lower bound (actual exceeded 90% of the time)
        # When E is at q_high (over-forecast), actual is f_mw - q_high
        w_low = max(0.0, f_mw - q["q_high"])
        # Wind upper bound (actual reached 10% of the time)
        w_high = max(0.0, f_mw - q["q_low"])

        p10_wind.append(round(w_low, 1))
        p90_wind.append(round(w_high, 1))
        buffer_mwh_list.append(max(0.0, q["q_high"] * 0.5))

    df["risk_p10_mw"] = p10_wind
    df["risk_p90_mw"] = p90_wind

    daily_buffer_p10_mwh = round(float(sum(buffer_mwh_list)), 1)
    daily_buffer_p90_mwh = round(
        float(
            sum(
                [
                    max(0.0, -hourly_quantiles.get(int(row["uk_hour"]), {}).get("q_low", 0.0) * 0.5)
                    for _, row in df.iterrows()
                ]
            )
        ),
        1,
    )

    summary = {
        "daily_buffer_p10_mwh": daily_buffer_p10_mwh,
        "daily_buffer_p90_mwh": daily_buffer_p90_mwh,
        "lower_quantile": lower_quantile,
        "upper_quantile": upper_quantile,
        "interpretation": f"To be about {int((1 - lower_quantile) * 100)}% sure of not being short, plan for {daily_buffer_p10_mwh:,.0f} MWh less wind than the central day-ahead forecast.",
    }

    return df.drop(columns=["local_time", "uk_hour"]), summary
