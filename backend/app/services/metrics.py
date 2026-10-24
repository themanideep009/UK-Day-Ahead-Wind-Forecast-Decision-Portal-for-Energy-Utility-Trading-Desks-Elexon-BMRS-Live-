"""
Pure-function service for computing forecast accuracy metrics, breakdowns,
error distribution histograms, and plain-English trading insights.
"""

from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from backend.app.config import HORIZON_BUCKETS, TZ_LONDON


def compute_metrics(
    errors: np.ndarray,
    actuals: np.ndarray,
    forecasts: np.ndarray,
    timestamps: Optional[pd.Series] = None,
    settlement_periods: Optional[pd.Series] = None,
) -> Dict[str, Any]:
    """
    Computes all MUST accuracy metrics on paired forecast/actual arrays.
    Error = forecast - actual (MW).
    Positive = over-forecast (short position, risky).
    Negative = under-forecast (long position).
    """
    n = len(errors)
    if n == 0:
        return {
            "n": 0,
            "mae": 0.0,
            "rmse": 0.0,
            "bias": 0.0,
            "wape": 0.0,
            "mape": None,
            "p50_abs_error": 0.0,
            "p90_abs_error": 0.0,
            "p95_abs_error": 0.0,
            "largest_over": None,
            "largest_under": None,
            "share_over": 0.0,
            "share_under": 0.0,
            "share_exact": 0.0,
        }

    abs_errors = np.abs(errors)
    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(errors**2)))
    bias = float(np.mean(errors))

    # WAPE = sum(|error|) / sum(actual) * 100%
    sum_actual = float(np.sum(actuals))
    wape = float((np.sum(abs_errors) / sum_actual * 100.0)) if sum_actual > 0 else 0.0

    # MAPE: Guard against near-zero actuals by filtering out actuals < 100 MW (GB national wind capacity > 28GW)
    valid_mape_mask = actuals >= 100.0
    if np.any(valid_mape_mask):
        mape = float(np.mean(abs_errors[valid_mape_mask] / actuals[valid_mape_mask]) * 100.0)
    else:
        mape = None

    # Quantiles of absolute error
    p50_abs = float(np.percentile(abs_errors, 50))
    p90_abs = float(np.percentile(abs_errors, 90))
    p95_abs = float(np.percentile(abs_errors, 95))

    # Shares of over / under
    over_count = int(np.sum(errors > 0))
    under_count = int(np.sum(errors < 0))
    exact_count = int(np.sum(errors == 0))
    share_over = float(over_count / n * 100.0)
    share_under = float(under_count / n * 100.0)
    share_exact = float(exact_count / n * 100.0)

    # Largest over- and under-forecast
    largest_over = None
    largest_under = None

    if timestamps is not None and settlement_periods is not None and n > 0:
        max_idx = int(np.argmax(errors))
        if errors[max_idx] > 0:
            largest_over = {
                "error_mw": round(float(errors[max_idx]), 1),
                "timestamp": str(timestamps.iloc[max_idx]),
                "settlementPeriod": int(settlement_periods.iloc[max_idx]),
                "forecast_mw": round(float(forecasts[max_idx]), 1),
                "actual_mw": round(float(actuals[max_idx]), 1),
            }

        min_idx = int(np.argmin(errors))
        if errors[min_idx] < 0:
            largest_under = {
                "error_mw": round(float(errors[min_idx]), 1),
                "timestamp": str(timestamps.iloc[min_idx]),
                "settlementPeriod": int(settlement_periods.iloc[min_idx]),
                "forecast_mw": round(float(forecasts[min_idx]), 1),
                "actual_mw": round(float(actuals[min_idx]), 1),
            }

    return {
        "n": n,
        "mae": round(mae, 1),
        "rmse": round(rmse, 1),
        "bias": round(bias, 1),
        "wape": round(wape, 2),
        "mape": round(mape, 2) if mape is not None else None,
        "p50_abs_error": round(p50_abs, 1),
        "p90_abs_error": round(p90_abs, 1),
        "p95_abs_error": round(p95_abs, 1),
        "largest_over": largest_over,
        "largest_under": largest_under,
        "share_over": round(share_over, 1),
        "share_under": round(share_under, 1),
        "share_exact": round(share_exact, 1),
    }


def compute_daily_breakdown(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Computes daily accuracy metrics for each delivery date."""
    items = []
    df["delivery_date"] = pd.to_datetime(df["startTime"]).dt.date.astype(str)

    for date_str, group in df.groupby("delivery_date"):
        errs = group["error_mw"].dropna().values
        acts = group["actual_mw"].dropna().values
        fcs = group["forecast_mw"].dropna().values
        if len(errs) == 0:
            continue

        m = compute_metrics(errs, acts, fcs)
        items.append(
            {
                "delivery_date": str(date_str),
                "n": int(len(errs)),
                "mae": m["mae"],
                "rmse": m["rmse"],
                "bias": m["bias"],
                "wape": m["wape"],
                "forecast_energy_mwh": round(float(group["forecast_energy_mwh"].sum()), 1),
                "actual_energy_mwh": round(float(group["actual_energy_mwh"].sum()), 1),
            }
        )
    return sorted(items, key=lambda x: x["delivery_date"])


def compute_hourly_breakdown(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Computes accuracy metrics broken down by UK local hour of day (0-23)."""
    items = []
    df["local_time"] = pd.to_datetime(df["startTime"]).dt.tz_convert(TZ_LONDON)
    df["uk_hour"] = df["local_time"].dt.hour

    for hr, group in df.groupby("uk_hour"):
        errs = group["error_mw"].dropna().values
        acts = group["actual_mw"].dropna().values
        fcs = group["forecast_mw"].dropna().values
        if len(errs) == 0:
            continue

        m = compute_metrics(errs, acts, fcs)
        p10_e = float(np.percentile(errs, 10))
        p50_e = float(np.percentile(errs, 50))
        p90_e = float(np.percentile(errs, 90))

        items.append(
            {
                "hour": int(hr),
                "n": int(len(errs)),
                "mae": m["mae"],
                "rmse": m["rmse"],
                "bias": m["bias"],
                "wape": m["wape"],
                "mean_forecast_mw": round(float(np.mean(fcs)), 1),
                "mean_actual_mw": round(float(np.mean(acts)), 1),
                "p10_error": round(p10_e, 1),
                "p50_error": round(p50_e, 1),
                "p90_error": round(p90_e, 1),
            }
        )
    return sorted(items, key=lambda x: x["hour"])


def compute_horizon_breakdown(
    vintages_df: pd.DataFrame, fuel_df: pd.DataFrame
) -> List[Dict[str, Any]]:
    """
    Computes accuracy across ALL forecast vintages matched to outturn actuals,
    bucketed by forecast horizon (hours before delivery).
    """
    # Join vintages with actuals on startTime
    # Note: vintages are hourly; expand or match on hour
    v = vintages_df.copy()
    f = fuel_df.copy()
    # Fuel half-hours to hourly average for fair match against all hourly vintages
    f["hour_start"] = f["startTime"].dt.floor("h")
    f_hourly = (
        f.groupby("hour_start")["generation"]
        .mean()
        .reset_index()
        .rename(columns={"hour_start": "startTime", "generation": "actual_mw"})
    )

    merged = pd.merge(v, f_hourly, on="startTime", how="inner")
    merged["horizon_hours"] = (
        merged["startTime"] - merged["publishTime"]
    ).dt.total_seconds() / 3600.0
    # Keep only positive horizons (true forecasts before delivery)
    merged = merged[merged["horizon_hours"] >= 0.0]
    merged["error_mw"] = merged["generation"] - merged["actual_mw"]

    items = []
    for b in HORIZON_BUCKETS:
        b_min = b["min"]
        b_max = b["max"]
        sub = merged[(merged["horizon_hours"] >= b_min) & (merged["horizon_hours"] < b_max)]
        if len(sub) == 0:
            continue

        errs = sub["error_mw"].values
        acts = sub["actual_mw"].values
        fcs = sub["generation"].values
        m = compute_metrics(errs, acts, fcs)

        items.append(
            {
                "bucket": b["label"],
                "min_horizon": b_min,
                "max_horizon": b_max,
                "n": int(len(sub)),
                "mae": m["mae"],
                "rmse": m["rmse"],
                "bias": m["bias"],
                "wape": m["wape"],
            }
        )
    return items


def compute_error_histogram(errors: np.ndarray, num_bins: int = 30) -> List[Dict[str, Any]]:
    """Computes binned frequency distribution of errors."""
    if len(errors) == 0:
        return []

    counts, bin_edges = np.histogram(errors, bins=num_bins)
    total = len(errors)
    items = []
    for i in range(len(counts)):
        b_start = float(bin_edges[i])
        b_end = float(bin_edges[i + 1])
        b_center = (b_start + b_end) / 2.0
        items.append(
            {
                "bin_start": round(b_start, 1),
                "bin_end": round(b_end, 1),
                "bin_center": round(b_center, 1),
                "count": int(counts[i]),
                "frequency": round(float(counts[i] / total * 100.0), 2),
            }
        )
    return items


def generate_insights(
    metrics: Dict[str, Any],
    day_breakdown: List[Dict[str, Any]],
    hour_breakdown: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Computes dynamic, plain-English insight callouts strictly from real data values.
    """
    insights = []
    # 1. Headline WAPE & bias direction
    bias = metrics["bias"]
    wape = metrics["wape"]
    if bias > 0:
        direction = f"over-forecasts by an average of {bias:.0f} MW, leaving the desk short and exposed to costly system balancing"
        level = "warning"
    else:
        direction = f"under-forecasts by an average of {abs(bias):.0f} MW, creating a long physical position"
        level = "info"

    insights.append(
        {
            "category": "Headline Accuracy",
            "title": f"WAPE {wape:.1f}% with Net {('Over' if bias > 0 else 'Under')}-Forecast Bias",
            "text": f"Across the evaluated delivery window, day-ahead wind forecast error averaged {metrics['mae']:.0f} MW MAE ({wape:.1f}% WAPE). Systematically, the forecast {direction}.",
            "level": level,
        }
    )

    # 2. Best and worst days
    if day_breakdown:
        worst_day = max(day_breakdown, key=lambda x: x["wape"])
        best_day = min(day_breakdown, key=lambda x: x["wape"])
        insights.append(
            {
                "category": "Day-Ahead Volatility",
                "title": f"Peak Error Day: {worst_day['delivery_date']} ({worst_day['wape']:.1f}% WAPE)",
                "text": f"Daily forecast error ranged from {best_day['wape']:.1f}% WAPE on {best_day['delivery_date']} up to {worst_day['wape']:.1f}% WAPE (MAE {worst_day['mae']:.0f} MW) on {worst_day['delivery_date']}, highlighting weather frontal transit uncertainty.",
                "level": "warning" if worst_day["wape"] > 20 else "info",
            }
        )

    # 3. Diurnal pattern / Hour of day
    if hour_breakdown:
        worst_hour = max(hour_breakdown, key=lambda x: x["mae"])
        best_hour = min(hour_breakdown, key=lambda x: x["mae"])
        insights.append(
            {
                "category": "Intraday Profile",
                "title": f"Highest Forecast Risk at Hour {worst_hour['hour']:02d}:00 UK Time",
                "text": f"Error magnitude peaks during hour {worst_hour['hour']:02d}:00 (MAE {worst_hour['mae']:.0f} MW), compared to lowest uncertainty at hour {best_hour['hour']:02d}:00 (MAE {best_hour['mae']:.0f} MW). Traders should size procurement buffers larger during peak error blocks.",
                "level": "info",
            }
        )

    # 4. Tail Risk / P90
    insights.append(
        {
            "category": "Tail Risk Sizing",
            "title": f"P90 Absolute Error at {metrics['p90_abs_error']:.0f} MW",
            "text": f"In 90% of settlement half-hours, forecast deviation was within {metrics['p90_abs_error']:.0f} MW. The largest single delivery excursion reached {metrics['largest_over']['error_mw']:.0f} MW over-forecast on {metrics['largest_over']['timestamp'][:10]}.",
            "level": "info",
        }
    )

    return insights
