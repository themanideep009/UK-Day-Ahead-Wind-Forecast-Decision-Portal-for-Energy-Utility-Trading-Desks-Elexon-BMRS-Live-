"""
Decision Desk router.
Returns the 48-period as-of forecast available at decision cutoff on D-1,
including publish times used, horizons, risk-adjusted bands, and optional back-test actuals.
"""

import re
from datetime import datetime, timedelta

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from backend.app.config import CUTOFF_DEFAULT, SCOPE_DELIVERY_END, SCOPE_DELIVERY_START
from backend.app.data_access import load_fuelhh, load_windfor
from backend.app.schemas import DecisionDeskPoint, DecisionDeskResponse, DecisionDeskSummary
from backend.app.services.asof import compute_asof_forecast
from backend.app.services.risk import apply_risk_band_to_forecast, compute_hourly_error_quantiles

router = APIRouter(tags=["Decision Desk"])

# Cache for historical hourly error quantiles per cutoff
_QUANTILES_CACHE = {}


def get_cached_quantiles(cutoff: str, lower_q: float, upper_q: float):
    cache_key = (cutoff, lower_q, upper_q)
    if cache_key not in _QUANTILES_CACHE:
        # Precompute across full in-scope delivery dates
        fuel_df = load_fuelhh()
        wind_df = load_windfor()
        dates = pd.date_range(SCOPE_DELIVERY_START, SCOPE_DELIVERY_END, freq="D")
        all_points = []
        for d in dates:
            d_str = d.strftime("%Y-%m-%d")
            df_asof, _ = compute_asof_forecast(
                delivery_date=d_str,
                cutoff=cutoff,
                include_actuals=True,
                wind_df=wind_df,
                fuel_df=fuel_df,
            )
            all_points.append(df_asof)
        combined = pd.concat(all_points, ignore_index=True)
        q = compute_hourly_error_quantiles(combined, lower_q, upper_q)
        _QUANTILES_CACHE[cache_key] = q
    return _QUANTILES_CACHE[cache_key]


@router.get("/decision", response_model=DecisionDeskResponse)
def get_decision_desk(
    delivery_date: str = Query(
        SCOPE_DELIVERY_START, description="Target delivery date (YYYY-MM-DD)"
    ),
    cutoff: str = Query(
        CUTOFF_DEFAULT, description="Decision cutoff time on D-1 (HH:MM Europe/London)"
    ),
    include_actuals: bool = Query(False, description="Reveal outturn actuals (back-test mode)"),
    lower_quantile: float = Query(
        0.10, ge=0.01, le=0.49, description="Lower risk quantile for wind generation"
    ),
    upper_quantile: float = Query(
        0.90, ge=0.51, le=0.99, description="Upper risk quantile for wind generation"
    ),
) -> DecisionDeskResponse:
    # 1. Validate delivery_date format
    try:
        d_val = datetime.strptime(delivery_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400, detail=f"Invalid date format: {delivery_date}. Expected YYYY-MM-DD"
        )

    min_date = datetime.strptime(SCOPE_DELIVERY_START, "%Y-%m-%d").date()
    max_date = datetime.strptime(SCOPE_DELIVERY_END, "%Y-%m-%d").date()
    if not (min_date <= d_val <= max_date):
        raise HTTPException(
            status_code=400,
            detail=f"delivery_date {delivery_date} is out of scope. Permitted range: {SCOPE_DELIVERY_START} to {SCOPE_DELIVERY_END}",
        )

    # 2. Validate cutoff format
    if not re.match(r"^\d{2}:\d{2}$", cutoff):
        raise HTTPException(
            status_code=400, detail=f"Invalid cutoff format: {cutoff}. Expected HH:MM"
        )

    # 3. Compute as-of forecast (always load actuals internally to compute summary if available, but only expose if include_actuals=True)
    df_asof, cutoff_utc = compute_asof_forecast(
        delivery_date=delivery_date, cutoff=cutoff, include_actuals=True
    )

    if len(df_asof) == 0:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast data available for {delivery_date} at cutoff {cutoff}",
        )

    # 4. Apply risk band
    hourly_quantiles = get_cached_quantiles(cutoff, lower_quantile, upper_quantile)
    df_banded, risk_summary = apply_risk_band_to_forecast(
        df_asof, hourly_quantiles, lower_quantile, upper_quantile
    )

    # 5. Build summary
    total_forecast_energy = round(float(df_banded["forecast_energy_mwh"].sum()), 1)
    peak_idx = int(df_banded["forecast_mw"].argmax())
    min_idx = int(df_banded["forecast_mw"].argmin())

    peak_time_iso = df_banded["startTime"].iloc[peak_idx].isoformat()
    min_time_iso = df_banded["startTime"].iloc[min_idx].isoformat()

    latest_pub_ts = df_banded["publishTime"].max()
    latest_pub = latest_pub_ts.isoformat() if pd.notna(latest_pub_ts) else ""

    summary = DecisionDeskSummary(
        total_forecast_energy_mwh=total_forecast_energy,
        total_actual_energy_mwh=round(float(df_banded["actual_energy_mwh"].sum()), 1)
        if include_actuals
        else None,
        peak_forecast_mw=round(float(df_banded["forecast_mw"].max()), 1),
        peak_forecast_time=peak_time_iso,
        min_forecast_mw=round(float(df_banded["forecast_mw"].min()), 1),
        min_forecast_time=min_time_iso,
        latest_publish_used=latest_pub,
        min_horizon_hours=round(float(df_banded["horizon_hours"].min()), 1),
        max_horizon_hours=round(float(df_banded["horizon_hours"].max()), 1),
        daily_buffer_p10_mwh=risk_summary["daily_buffer_p10_mwh"],
        daily_buffer_p90_mwh=risk_summary["daily_buffer_p90_mwh"],
    )

    # 6. Build points
    points = []
    for _, row in df_banded.iterrows():
        p = DecisionDeskPoint(
            startTime=row["startTime"].isoformat(),
            settlementPeriod=int(row["settlementPeriod"]),
            forecast_mw=round(float(row["forecast_mw"]), 1),
            forecast_energy_mwh=round(float(row["forecast_energy_mwh"]), 1),
            publishTime=row["publishTime"].isoformat() if pd.notna(row["publishTime"]) else "",
            horizon_hours=round(float(row["horizon_hours"]), 1),
            actual_mw=round(float(row["actual_mw"]), 1)
            if include_actuals and pd.notna(row["actual_mw"])
            else None,
            actual_energy_mwh=round(float(row["actual_energy_mwh"]), 1)
            if include_actuals and pd.notna(row["actual_energy_mwh"])
            else None,
            error_mw=round(float(row["error_mw"]), 1)
            if include_actuals and pd.notna(row["error_mw"])
            else None,
            risk_p10_mw=round(float(row["risk_p10_mw"]), 1),
            risk_p90_mw=round(float(row["risk_p90_mw"]), 1),
        )
        points.append(p)

    decision_date = (d_val - timedelta(days=1)).strftime("%Y-%m-%d")

    return DecisionDeskResponse(
        delivery_date=delivery_date,
        decision_date=decision_date,
        cutoff=cutoff,
        cutoff_utc=cutoff_utc.isoformat(),
        include_actuals=include_actuals,
        summary=summary,
        points=points,
    )
