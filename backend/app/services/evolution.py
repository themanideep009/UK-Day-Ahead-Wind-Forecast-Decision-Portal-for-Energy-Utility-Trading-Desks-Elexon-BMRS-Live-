"""
Service for exploring forecast evolution across all publish vintages for a target half-hour.
Shows how the forecast developed from 72h out, marks the D-1 decision cutoff vintage,
identifies the final pre-delivery vintage, and calculates revision size.
"""

from datetime import timedelta
from typing import Any, Dict, Optional

import pandas as pd

from backend.app.config import TZ_LONDON
from backend.app.data_access import load_fuelhh, load_windfor, parse_uk_local_to_utc


def get_forecast_evolution(
    target_startTime: str,
    cutoff: str = "09:20",
    wind_df: Optional[pd.DataFrame] = None,
    fuel_df: Optional[pd.DataFrame] = None,
) -> Dict[str, Any]:
    if wind_df is None:
        wind_df = load_windfor()
    if fuel_df is None:
        fuel_df = load_fuelhh()

    target_ts = pd.to_datetime(target_startTime, utc=True)
    # Target in WINDFOR is hourly (floor to hour)
    target_hour = target_ts.floor("h")

    # Delivery date and D-1 decision date
    target_local = target_ts.tz_convert(TZ_LONDON)
    delivery_date_str = target_local.strftime("%Y-%m-%d")
    d_dt = target_local.date()
    decision_date_str = (d_dt - timedelta(days=1)).strftime("%Y-%m-%d")
    cutoff_utc = parse_uk_local_to_utc(decision_date_str, cutoff)

    # All vintages predicting this target hour
    vintages = wind_df[wind_df["startTime"] == target_hour].sort_values("publishTime").copy()
    if len(vintages) == 0:
        raise ValueError(f"No forecast vintages found for target time {target_startTime}")

    # Identify as-of vintage
    asof_vintages = vintages[vintages["publishTime"] <= cutoff_utc]
    if len(asof_vintages) == 0:
        asof_row = vintages.iloc[0]
    else:
        asof_row = asof_vintages.iloc[-1]

    asof_publish = asof_row["publishTime"]
    asof_mw = float(asof_row["generation"])

    # Final pre-delivery vintage
    pre_delivery = vintages[vintages["publishTime"] <= target_ts]
    if len(pre_delivery) == 0:
        final_row = vintages.iloc[-1]
    else:
        final_row = pre_delivery.iloc[-1]

    final_publish = final_row["publishTime"]
    final_mw = float(final_row["generation"])
    revision_mw = round(final_mw - asof_mw, 1)

    # Actual outturn from FUELHH
    actual_rows = fuel_df[fuel_df["startTime"] == target_ts]
    actual_mw = float(actual_rows["generation"].iloc[0]) if len(actual_rows) > 0 else None

    # Vintage points
    points = []
    for _, row in vintages.iterrows():
        pub = row["publishTime"]
        horiz = (target_ts - pub).total_seconds() / 3600.0
        points.append(
            {
                "publishTime": pub.isoformat(),
                "forecast_mw": round(float(row["generation"]), 1),
                "horizon_hours": round(float(horiz), 1),
                "is_asof": (pub == asof_publish),
            }
        )

    return {
        "target_startTime": target_ts.isoformat(),
        "delivery_date": delivery_date_str,
        "cutoff": cutoff,
        "cutoff_utc": cutoff_utc.isoformat(),
        "actual_mw": round(actual_mw, 1) if actual_mw is not None else None,
        "asof_publishTime": asof_publish.isoformat(),
        "asof_forecast_mw": round(asof_mw, 1),
        "final_publishTime": final_publish.isoformat(),
        "final_forecast_mw": round(final_mw, 1),
        "revision_mw": revision_mw,
        "vintages": points,
    }
