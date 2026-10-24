"""
Pydantic v2 schemas for all API requests and responses.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"
    timestamp: str
    version: str = "1.0.0"
    snapshot_loaded: bool = True


class DataQualityItem(BaseModel):
    dataset: str
    total_rows: int
    completeness_pct: float
    duplicates: int
    gaps: int
    min_mw: float
    max_mw: float


class ScopeInfo(BaseModel):
    mode: str
    delivery_start: str
    delivery_end: str
    decision_start: str
    decision_end: str
    total_days: int


class MetaResponse(BaseModel):
    scope: ScopeInfo
    defaults: Dict[str, str]
    presets: Dict[str, str]
    attribution: str
    data_quality: List[DataQualityItem]
    manifest: Dict[str, Any]


class DecisionDeskPoint(BaseModel):
    startTime: str
    settlementPeriod: int
    forecast_mw: float
    forecast_energy_mwh: float
    publishTime: str
    horizon_hours: float
    actual_mw: Optional[float] = None
    actual_energy_mwh: Optional[float] = None
    error_mw: Optional[float] = None
    risk_p10_mw: Optional[float] = None
    risk_p90_mw: Optional[float] = None


class DecisionDeskSummary(BaseModel):
    total_forecast_energy_mwh: float
    total_actual_energy_mwh: Optional[float] = None
    peak_forecast_mw: float
    peak_forecast_time: str
    min_forecast_mw: float
    min_forecast_time: str
    latest_publish_used: str
    min_horizon_hours: float
    max_horizon_hours: float
    daily_buffer_p10_mwh: Optional[float] = None
    daily_buffer_p90_mwh: Optional[float] = None


class DecisionDeskResponse(BaseModel):
    delivery_date: str
    decision_date: str
    cutoff: str
    cutoff_utc: str
    include_actuals: bool
    summary: DecisionDeskSummary
    points: List[DecisionDeskPoint]


class LargestErrorItem(BaseModel):
    error_mw: float
    timestamp: str
    settlementPeriod: int
    forecast_mw: float
    actual_mw: float


class AccuracyMetrics(BaseModel):
    n: int
    mae: float
    rmse: float
    bias: float
    wape: float
    mape: Optional[float]
    p50_abs_error: float
    p90_abs_error: float
    p95_abs_error: float
    largest_over: Optional[LargestErrorItem] = None
    largest_under: Optional[LargestErrorItem] = None
    share_over: float
    share_under: float
    share_exact: float


class InsightCallout(BaseModel):
    category: str
    title: str
    text: str
    level: str = "info"  # "info", "warning", "success"


class AccuracySummaryResponse(BaseModel):
    date_from: str
    date_to: str
    cutoff: str
    metrics: AccuracyMetrics
    callouts: List[InsightCallout]


class DayBreakdownItem(BaseModel):
    delivery_date: str
    n: int
    mae: float
    rmse: float
    bias: float
    wape: float
    forecast_energy_mwh: float
    actual_energy_mwh: float


class HourBreakdownItem(BaseModel):
    hour: int
    n: int
    mae: float
    rmse: float
    bias: float
    wape: float
    mean_forecast_mw: float
    mean_actual_mw: float
    p10_error: float
    p50_error: float
    p90_error: float


class HorizonBreakdownItem(BaseModel):
    bucket: str
    min_horizon: float
    max_horizon: float
    n: int
    mae: float
    rmse: float
    bias: float
    wape: float


class ErrorHistogramBin(BaseModel):
    bin_start: float
    bin_end: float
    bin_center: float
    count: int
    frequency: float


class EvolutionPoint(BaseModel):
    publishTime: str
    forecast_mw: float
    horizon_hours: float
    is_asof: bool


class EvolutionResponse(BaseModel):
    target_startTime: str
    delivery_date: str
    cutoff: str
    cutoff_utc: str
    actual_mw: Optional[float]
    asof_publishTime: str
    asof_forecast_mw: float
    final_publishTime: str
    final_forecast_mw: float
    revision_mw: float
    vintages: List[EvolutionPoint]
