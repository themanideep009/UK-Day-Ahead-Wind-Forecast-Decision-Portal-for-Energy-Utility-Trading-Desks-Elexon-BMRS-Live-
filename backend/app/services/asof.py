"""
Pure-function service for computing decision-time ("as-of") wind forecasts.
Applies the decision cutoff on D-1 to select the latest forecast vintage published <= cutoff,
maps hourly WINDFOR forecasts to 48 half-hour settlement periods, calculates horizons,
and optionally joins with outturn actuals (FUELHH).
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple

import numpy as np
import pandas as pd

from backend.app.config import TZ_LONDON, TZ_UTC
from backend.app.data_access import load_fuelhh, load_windfor, parse_uk_local_to_utc


def get_delivery_day_range_utc(delivery_date_str: str) -> Tuple[pd.Timestamp, pd.Timestamp]:
    """
    Returns (start_utc, end_utc) for delivery day D (00:00 to 23:30 UK local time).
    """
    y, m, d = [int(x) for x in delivery_date_str.split("-")]
    start_local = datetime(y, m, d, 0, 0, 0, tzinfo=TZ_LONDON)
    end_local = datetime(y, m, d, 23, 30, 0, tzinfo=TZ_LONDON)
    return pd.Timestamp(start_local.astimezone(TZ_UTC)), pd.Timestamp(end_local.astimezone(TZ_UTC))


def compute_asof_forecast(
    delivery_date: str,
    cutoff: str = "09:20",
    include_actuals: bool = True,
    wind_df: Optional[pd.DataFrame] = None,
    fuel_df: Optional[pd.DataFrame] = None,
) -> Tuple[pd.DataFrame, pd.Timestamp]:
    """
    Computes the 48-period as-of forecast for delivery_date.
    Returns (result_df, cutoff_utc).
    """
    if wind_df is None:
        wind_df = load_windfor()
    if fuel_df is None and include_actuals:
        fuel_df = load_fuelhh()

    # D-1 decision date
    d_dt = datetime.strptime(delivery_date, "%Y-%m-%d").date()
    decision_date_str = (d_dt - timedelta(days=1)).strftime("%Y-%m-%d")

    # Cutoff in UTC
    cutoff_utc = parse_uk_local_to_utc(decision_date_str, cutoff)

    # Delivery day range (00:00 to 23:30 UK time in UTC)
    start_utc, end_utc = get_delivery_day_range_utc(delivery_date)

    # 1. Filter WINDFOR: strictly no look-ahead (publishTime <= cutoff_utc)
    # Target hours are within [start_utc, end_utc + 30m)
    target_max = end_utc + pd.Timedelta(minutes=30)
    avail = wind_df[
        (wind_df["publishTime"] <= cutoff_utc)
        & (wind_df["startTime"] >= start_utc)
        & (wind_df["startTime"] < target_max)
    ]

    # 2. For each hourly startTime, select row with greatest publishTime <= cutoff_utc
    asof_hourly = avail.sort_values("publishTime").groupby("startTime").last().reset_index()

    # 3. Build full 48 half-hourly grid for day D
    half_hours = pd.date_range(start_utc, end_utc, freq="30min")
    grid = pd.DataFrame({"startTime": half_hours})
    grid["settlementPeriod"] = list(range(1, len(grid) + 1))
    grid["hour_start"] = grid["startTime"].dt.floor("h")

    # Merge hourly forecasts into the 48 half-hours
    merged = pd.merge(
        grid,
        asof_hourly.rename(columns={"startTime": "hour_start", "generation": "forecast_mw"}),
        on="hour_start",
        how="left",
    )

    # Horizon in hours: target half-hour startTime - publishTime
    merged["horizon_hours"] = (
        merged["startTime"] - merged["publishTime"]
    ).dt.total_seconds() / 3600.0
    merged["forecast_energy_mwh"] = merged["forecast_mw"] * 0.5

    # 4. If actuals requested, join with FUELHH
    if include_actuals and fuel_df is not None:
        actuals = fuel_df[(fuel_df["startTime"] >= start_utc) & (fuel_df["startTime"] <= end_utc)][
            ["startTime", "generation"]
        ].rename(columns={"generation": "actual_mw"})

        merged = pd.merge(merged, actuals, on="startTime", how="left")
        merged["actual_energy_mwh"] = merged["actual_mw"] * 0.5
        merged["error_mw"] = merged["forecast_mw"] - merged["actual_mw"]
    else:
        merged["actual_mw"] = np.nan
        merged["actual_energy_mwh"] = np.nan
        merged["error_mw"] = np.nan

    # Drop temporary column
    merged = merged.drop(columns=["hour_start"])
    return merged, cutoff_utc
