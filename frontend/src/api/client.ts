/**
 * API client and TypeScript interfaces for the UK Wind Forecast Portal.
 * Uses relative /api paths which are proxied in dev by Vite,
 * routed by nginx in Docker, and handled by serverless functions on Vercel.
 */

export interface ScopeInfo {
  mode: string
  delivery_start: string
  delivery_end: string
  decision_start: string
  decision_end: string
  total_days: number
}

export interface DataQualityItem {
  dataset: string
  total_rows: number
  completeness_pct: number
  duplicates: number
  gaps: number
  min_mw: number
  max_mw: number
}

export interface MetaResponse {
  scope: ScopeInfo
  defaults: {
    delivery_date: string
    cutoff: string
    date_from: string
    date_to: string
  }
  presets: Record<string, string>
  attribution: string
  data_quality: DataQualityItem[]
  manifest: Record<string, any>
}

export interface DecisionDeskPoint {
  startTime: string
  settlementPeriod: number
  forecast_mw: number
  forecast_energy_mwh: number
  publishTime: string
  horizon_hours: number
  actual_mw?: number | null
  actual_energy_mwh?: number | null
  error_mw?: number | null
  risk_p10_mw?: number | null
  risk_p90_mw?: number | null
}

export interface DecisionDeskSummary {
  total_forecast_energy_mwh: number
  total_actual_energy_mwh?: number | null
  peak_forecast_mw: number
  peak_forecast_time: string
  min_forecast_mw: number
  min_forecast_time: string
  latest_publish_used: string
  min_horizon_hours: number
  max_horizon_hours: number
  daily_buffer_p10_mwh?: number | null
  daily_buffer_p90_mwh?: number | null
}

export interface DecisionDeskResponse {
  delivery_date: string
  decision_date: string
  cutoff: string
  cutoff_utc: string
  include_actuals: boolean
  summary: DecisionDeskSummary
  points: DecisionDeskPoint[]
}

export interface LargestErrorItem {
  error_mw: number
  timestamp: string
  settlementPeriod: number
  forecast_mw: number
  actual_mw: number
}

export interface AccuracyMetrics {
  n: number
  mae: number
  rmse: number
  bias: number
  wape: number
  mape?: number | null
  p50_abs_error: number
  p90_abs_error: number
  p95_abs_error: number
  largest_over?: LargestErrorItem | null
  largest_under?: LargestErrorItem | null
  share_over: number
  share_under: number
  share_exact: number
}

export interface InsightCallout {
  category: string
  title: string
  text: string
  level: 'info' | 'warning' | 'success'
}

export interface AccuracySummaryResponse {
  date_from: string
  date_to: string
  cutoff: string
  metrics: AccuracyMetrics
  callouts: InsightCallout[]
}

export interface DayBreakdownItem {
  delivery_date: string
  n: number
  mae: number
  rmse: number
  bias: number
  wape: number
  forecast_energy_mwh: number
  actual_energy_mwh: number
}

export interface HourBreakdownItem {
  hour: number
  n: number
  mae: number
  rmse: number
  bias: number
  wape: number
  mean_forecast_mw: number
  mean_actual_mw: number
  p10_error: number
  p50_error: number
  p90_error: number
}

export interface HorizonBreakdownItem {
  bucket: string
  min_horizon: number
  max_horizon: number
  n: number
  mae: number
  rmse: number
  bias: number
  wape: number
}

export interface ErrorHistogramBin {
  bin_start: number
  bin_end: number
  bin_center: number
  count: number
  frequency: number
}

export interface EvolutionPoint {
  publishTime: string
  forecast_mw: number
  horizon_hours: number
  is_asof: boolean
}

export interface EvolutionResponse {
  target_startTime: string
  delivery_date: string
  cutoff: string
  cutoff_utc: string
  actual_mw?: number | null
  asof_publishTime: string
  asof_forecast_mw: number
  final_publishTime: string
  final_forecast_mw: number
  revision_mw: number
  vintages: EvolutionPoint[]
}

const BASE_URL = '/api'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`API Error ${res.status}: ${errorText}`)
  }
  return res.json()
}

export const api = {
  getMeta: () => fetchJson<MetaResponse>(`${BASE_URL}/meta`),

  getDecisionDesk: (
    deliveryDate: string,
    cutoff: string = '09:20',
    includeActuals: boolean = false,
    lowerQ: number = 0.10,
    upperQ: number = 0.90
  ) =>
    fetchJson<DecisionDeskResponse>(
      `${BASE_URL}/decision?delivery_date=${deliveryDate}&cutoff=${cutoff}&include_actuals=${includeActuals}&lower_quantile=${lowerQ}&upper_quantile=${upperQ}`
    ),

  getAccuracySummary: (dateFrom: string, dateTo: string, cutoff: string = '09:20') =>
    fetchJson<AccuracySummaryResponse>(
      `${BASE_URL}/accuracy/summary?date_from=${dateFrom}&date_to=${dateTo}&cutoff=${cutoff}`
    ),

  getAccuracyByDay: (dateFrom: string, dateTo: string, cutoff: string = '09:20') =>
    fetchJson<DayBreakdownItem[]>(
      `${BASE_URL}/accuracy/by-day?date_from=${dateFrom}&date_to=${dateTo}&cutoff=${cutoff}`
    ),

  getAccuracyByHour: (dateFrom: string, dateTo: string, cutoff: string = '09:20') =>
    fetchJson<HourBreakdownItem[]>(
      `${BASE_URL}/accuracy/by-hour?date_from=${dateFrom}&date_to=${dateTo}&cutoff=${cutoff}`
    ),

  getAccuracyByHorizon: (dateFrom: string, dateTo: string) =>
    fetchJson<HorizonBreakdownItem[]>(
      `${BASE_URL}/accuracy/by-horizon?date_from=${dateFrom}&date_to=${dateTo}`
    ),

  getErrorDistribution: (dateFrom: string, dateTo: string, cutoff: string = '09:20', bins: number = 25) =>
    fetchJson<ErrorHistogramBin[]>(
      `${BASE_URL}/accuracy/distribution?date_from=${dateFrom}&date_to=${dateTo}&cutoff=${cutoff}&bins=${bins}`
    ),

  getEvolution: (targetStartTime: string, cutoff: string = '09:20') =>
    fetchJson<EvolutionResponse>(
      `${BASE_URL}/evolution?target_startTime=${encodeURIComponent(targetStartTime)}&cutoff=${cutoff}`
    ),
}
