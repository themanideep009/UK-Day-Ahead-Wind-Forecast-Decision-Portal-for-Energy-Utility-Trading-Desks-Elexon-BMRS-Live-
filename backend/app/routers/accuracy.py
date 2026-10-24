"""
Forecast Accuracy router.
Provides comprehensive metrics (MAE, RMSE, bias, WAPE, MAPE, P50/90/95, largest over/under),
breakdowns by delivery day, hour of day, and horizon bucket, plus error distribution histograms
and plain-English trading insights.
"""

import re
from datetime import datetime
from typing import List

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from backend.app.config import CUTOFF_DEFAULT, SCOPE_DELIVERY_END, SCOPE_DELIVERY_START
from backend.app.data_access import load_fuelhh, load_windfor
from backend.app.schemas import (
    AccuracyMetrics,
    AccuracySummaryResponse,
    DayBreakdownItem,
    ErrorHistogramBin,
    HorizonBreakdownItem,
    HourBreakdownItem,
    InsightCallout,
)
from backend.app.services.asof import compute_asof_forecast
from backend.app.services.metrics import (
    compute_daily_breakdown,
    compute_error_histogram,
    compute_horizon_breakdown,
    compute_hourly_breakdown,
    compute_metrics,
    generate_insights,
)

router = APIRouter(prefix="/accuracy", tags=["Forecast Accuracy"])

_EVAL_CACHE = {}


def get_asof_dataset_for_window(date_from: str, date_to: str, cutoff: str) -> pd.DataFrame:
    key = (date_from, date_to, cutoff)
    if key not in _EVAL_CACHE:
        dates = pd.date_range(date_from, date_to, freq="D")
        fuel_df = load_fuelhh()
        wind_df = load_windfor()
        all_dfs = []
        for d in dates:
            d_str = d.strftime("%Y-%m-%d")
            df_asof, _ = compute_asof_forecast(
                delivery_date=d_str,
                cutoff=cutoff,
                include_actuals=True,
                wind_df=wind_df,
                fuel_df=fuel_df,
            )
            all_dfs.append(df_asof)
        _EVAL_CACHE[key] = pd.concat(all_dfs, ignore_index=True)
    return _EVAL_CACHE[key]


def validate_dates(date_from: str, date_to: str, cutoff: str):
    try:
        d1 = datetime.strptime(date_from, "%Y-%m-%d").date()
        d2 = datetime.strptime(date_to, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")

    if d1 > d2:
        raise HTTPException(status_code=400, detail="date_from must be <= date_to")

    min_date = datetime.strptime(SCOPE_DELIVERY_START, "%Y-%m-%d").date()
    max_date = datetime.strptime(SCOPE_DELIVERY_END, "%Y-%m-%d").date()
    if d1 < min_date or d2 > max_date:
        raise HTTPException(
            status_code=400,
            detail=f"Requested window ({date_from} to {date_to}) is outside supported scope ({SCOPE_DELIVERY_START} to {SCOPE_DELIVERY_END})",
        )

    if not re.match(r"^\d{2}:\d{2}$", cutoff):
        raise HTTPException(status_code=400, detail="Cutoff must be in HH:MM format")


@router.get("/summary", response_model=AccuracySummaryResponse)
def get_accuracy_summary(
    date_from: str = Query(SCOPE_DELIVERY_START, description="Delivery start date"),
    date_to: str = Query(SCOPE_DELIVERY_END, description="Delivery end date"),
    cutoff: str = Query(CUTOFF_DEFAULT, description="Cutoff time on D-1 (HH:MM)"),
) -> AccuracySummaryResponse:
    validate_dates(date_from, date_to, cutoff)
    df = get_asof_dataset_for_window(date_from, date_to, cutoff)

    errs = df["error_mw"].dropna().values
    acts = df["actual_mw"].dropna().values
    fcs = df["forecast_mw"].dropna().values
    st = df["startTime"].dropna()
    sp = df["settlementPeriod"].dropna()

    m_dict = compute_metrics(errs, acts, fcs, st, sp)
    metrics = AccuracyMetrics(**m_dict)

    day_b = compute_daily_breakdown(df)
    hour_b = compute_hourly_breakdown(df)
    raw_insights = generate_insights(m_dict, day_b, hour_b)
    insights = [InsightCallout(**i) for i in raw_insights]

    return AccuracySummaryResponse(
        date_from=date_from, date_to=date_to, cutoff=cutoff, metrics=metrics, callouts=insights
    )


@router.get("/by-day", response_model=List[DayBreakdownItem])
def get_accuracy_by_day(
    date_from: str = Query(SCOPE_DELIVERY_START, description="Delivery start date"),
    date_to: str = Query(SCOPE_DELIVERY_END, description="Delivery end date"),
    cutoff: str = Query(CUTOFF_DEFAULT, description="Cutoff time on D-1 (HH:MM)"),
) -> List[DayBreakdownItem]:
    validate_dates(date_from, date_to, cutoff)
    df = get_asof_dataset_for_window(date_from, date_to, cutoff)
    items = compute_daily_breakdown(df)
    return [DayBreakdownItem(**x) for x in items]


@router.get("/by-hour", response_model=List[HourBreakdownItem])
def get_accuracy_by_hour(
    date_from: str = Query(SCOPE_DELIVERY_START, description="Delivery start date"),
    date_to: str = Query(SCOPE_DELIVERY_END, description="Delivery end date"),
    cutoff: str = Query(CUTOFF_DEFAULT, description="Cutoff time on D-1 (HH:MM)"),
) -> List[HourBreakdownItem]:
    validate_dates(date_from, date_to, cutoff)
    df = get_asof_dataset_for_window(date_from, date_to, cutoff)
    items = compute_hourly_breakdown(df)
    return [HourBreakdownItem(**x) for x in items]


@router.get("/by-horizon", response_model=List[HorizonBreakdownItem])
def get_accuracy_by_horizon(
    date_from: str = Query(SCOPE_DELIVERY_START, description="Delivery start date"),
    date_to: str = Query(SCOPE_DELIVERY_END, description="Delivery end date"),
) -> List[HorizonBreakdownItem]:
    # Horizon analysis uses all vintages within delivery range
    validate_dates(date_from, date_to, CUTOFF_DEFAULT)
    fuel_df = load_fuelhh()
    wind_df = load_windfor()

    start_ts = pd.to_datetime(f"{date_from} 00:00:00", utc=True)
    end_ts = pd.to_datetime(f"{date_to} 23:30:00", utc=True)

    fuel_window = fuel_df[(fuel_df["startTime"] >= start_ts) & (fuel_df["startTime"] <= end_ts)]
    wind_window = wind_df[(wind_df["startTime"] >= start_ts) & (wind_df["startTime"] <= end_ts)]

    items = compute_horizon_breakdown(wind_window, fuel_window)
    return [HorizonBreakdownItem(**x) for x in items]


@router.get("/distribution", response_model=List[ErrorHistogramBin])
def get_error_distribution(
    date_from: str = Query(SCOPE_DELIVERY_START, description="Delivery start date"),
    date_to: str = Query(SCOPE_DELIVERY_END, description="Delivery end date"),
    cutoff: str = Query(CUTOFF_DEFAULT, description="Cutoff time on D-1 (HH:MM)"),
    bins: int = Query(30, ge=10, le=100, description="Number of histogram bins"),
) -> List[ErrorHistogramBin]:
    validate_dates(date_from, date_to, cutoff)
    df = get_asof_dataset_for_window(date_from, date_to, cutoff)
    errs = df["error_mw"].dropna().values
    items = compute_error_histogram(errs, num_bins=bins)
    return [ErrorHistogramBin(**x) for x in items]
