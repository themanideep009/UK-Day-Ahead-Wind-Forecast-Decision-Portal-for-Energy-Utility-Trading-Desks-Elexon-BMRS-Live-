import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import {
  ShieldAlert,
  Calendar,
  Download,
  Clock,
  TrendingDown,
  BarChart3,
  Layers,
  Activity,
  AlertTriangle,
} from 'lucide-react'
import { api } from '../api/client'
import { KpiCard } from '../components/KpiCard'
import {
  formatMW,
  formatPercent,
  formatDateUK,
  formatTimeUK,
} from '../lib/formatters'

interface ForecastAccuracyProps {
  cutoff: string
  setCutoff: (c: string) => void
}

export const ForecastAccuracy: React.FC<ForecastAccuracyProps> = ({
  cutoff,
  setCutoff,
}) => {
  const [dateFrom, setDateFrom] = useState('2026-01-02')
  const [dateTo, setDateTo] = useState('2026-02-01')

  // Summary query
  const { data: summaryData } = useQuery({
    queryKey: ['accuracySummary', dateFrom, dateTo, cutoff],
    queryFn: () => api.getAccuracySummary(dateFrom, dateTo, cutoff),
  })

  // By-Day query
  const { data: dayData } = useQuery({
    queryKey: ['accuracyByDay', dateFrom, dateTo, cutoff],
    queryFn: () => api.getAccuracyByDay(dateFrom, dateTo, cutoff),
  })

  // By-Hour query
  const { data: hourData } = useQuery({
    queryKey: ['accuracyByHour', dateFrom, dateTo, cutoff],
    queryFn: () => api.getAccuracyByHour(dateFrom, dateTo, cutoff),
  })

  // By-Horizon query
  const { data: horizonData } = useQuery({
    queryKey: ['accuracyByHorizon', dateFrom, dateTo],
    queryFn: () => api.getAccuracyByHorizon(dateFrom, dateTo),
  })

  // Distribution query
  const { data: distData } = useQuery({
    queryKey: ['accuracyDist', dateFrom, dateTo, cutoff],
    queryFn: () => api.getErrorDistribution(dateFrom, dateTo, cutoff, 25),
  })

  const m = summaryData?.metrics

  const handleExportCsv = () => {
    if (!dayData || !m) return
    let csv = 'DeliveryDate,HalfHours,MAE_MW,RMSE_MW,Bias_MW,WAPE_pct,Forecast_Energy_MWh,Actual_Energy_MWh\n'
    dayData.forEach((row) => {
      csv += `${row.delivery_date},${row.n},${row.mae},${row.rmse},${row.bias},${row.wape},${row.forecast_energy_mwh},${row.actual_energy_mwh}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `wind_forecast_accuracy_${dateFrom}_${dateTo}_cutoff_${cutoff.replace(':', '')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header & Window Controls */}
      <div className="card-trading p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>FORECAST PERFORMANCE & MODEL BENCHMARKING</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              Forecast Accuracy & Error Quantification
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Empirical validation of GB wind forecasts across delivery windows, intraday hours, and horizons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Window selector */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <input
                type="date"
                value={dateFrom}
                min="2026-01-02"
                max="2026-02-01"
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={dateTo}
                min="2026-01-02"
                max="2026-02-01"
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              />
            </div>

            {/* Cutoff switcher */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => setCutoff('09:20')}
                className={`px-2.5 py-1.5 rounded font-mono font-medium transition-all ${
                  cutoff === '09:20'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                09:20 EPEX
              </button>
              <button
                onClick={() => setCutoff('09:50')}
                className={`px-2.5 py-1.5 rounded font-mono font-medium transition-all ${
                  cutoff === '09:50'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                09:50 N2EX
              </button>
            </div>

            {/* Export CSV button */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Headline WAPE"
          value={formatPercent(m?.wape)}
          subtitle="Σ|e| / Σ Actual"
          badge="Primary"
          badgeColor="amber"
        />
        <KpiCard
          title="MAE (Mean |Error|)"
          value={formatMW(m?.mae)}
          subtitle={`RMSE: ${formatMW(m?.rmse)}`}
          badge="Dispersion"
          badgeColor="cyan"
        />
        <KpiCard
          title="Systematic Bias"
          value={m?.bias !== undefined ? `${m.bias > 0 ? '+' : ''}${Math.round(m.bias)} MW` : '—'}
          subtitle={m?.bias && m.bias > 0 ? 'Over-Forecast (Short)' : 'Under-Forecast (Long)'}
          badge={m?.bias && m.bias > 0 ? 'Short Risk' : 'Long Position'}
          badgeColor={m?.bias && m.bias > 0 ? 'rose' : 'emerald'}
        />
        <KpiCard
          title="P90 |Error|"
          value={formatMW(m?.p90_abs_error)}
          subtitle={`P50: ${formatMW(m?.p50_abs_error)}`}
          badge="Tail Risk"
          badgeColor="indigo"
        />
        <KpiCard
          title="Over vs Under Share"
          value={m ? `${Math.round(m.share_over)}% / ${Math.round(m.share_under)}%` : '—'}
          subtitle="Over (Short) / Under (Long)"
          badge="Direction"
          badgeColor="cyan"
        />
        <KpiCard
          title="Guarded MAPE"
          value={formatPercent(m?.mape)}
          subtitle="Actuals ≥ 100 MW"
          badge="Filtered"
          badgeColor="emerald"
        />
      </div>

      {/* Extreme Excursions Callouts */}
      {m?.largest_over && m?.largest_under && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-rose-900/40 bg-rose-950/10 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase text-rose-400 font-bold">
                Largest Over-Forecast Excursion (Costly Short Exposure)
              </div>
              <div className="text-base font-bold text-white font-mono">
                +{formatMW(m.largest_over.error_mw)}
              </div>
              <p className="text-xs text-slate-300">
                Occurred on <strong>{formatDateUK(m.largest_over.timestamp)}</strong> during Period {m.largest_over.settlementPeriod} ({formatTimeUK(m.largest_over.timestamp)} UK).
                Forecast: {formatMW(m.largest_over.forecast_mw)}, Actual: {formatMW(m.largest_over.actual_mw)}.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-cyan-900/40 bg-cyan-950/10 flex items-start gap-3">
            <TrendingDown className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold">
                Largest Under-Forecast Excursion (Long Position)
              </div>
              <div className="text-base font-bold text-white font-mono">
                {formatMW(m.largest_under.error_mw)}
              </div>
              <p className="text-xs text-slate-300">
                Occurred on <strong>{formatDateUK(m.largest_under.timestamp)}</strong> during Period {m.largest_under.settlementPeriod} ({formatTimeUK(m.largest_under.timestamp)} UK).
                Forecast: {formatMW(m.largest_under.forecast_mw)}, Actual: {formatMW(m.largest_under.actual_mw)}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Daily Breakdown Chart */}
        <div className="card-trading p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Daily Accuracy Trend (WAPE & MAE)</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">31 Delivery Days</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dayData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="delivery_date" stroke="#64748b" fontSize={10} tickFormatter={(d) => d.slice(5)} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} unit=" MW" />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono space-y-1 shadow-lg">
                          <div className="text-white font-bold">{formatDateUK(d.delivery_date)}</div>
                          <div className="text-amber-400">WAPE: {formatPercent(d.wape)}</div>
                          <div className="text-cyan-400">MAE: {formatMW(d.mae)}</div>
                          <div className="text-slate-300">RMSE: {formatMW(d.rmse)}</div>
                          <div className="text-slate-400">Bias: {d.bias > 0 ? `+${d.bias}` : d.bias} MW</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend verticalAlign="top" align="right" height={24} iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Bar yAxisId="left" dataKey="mae" fill="#06b6d4" fillOpacity={0.6} name="MAE (MW)" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="wape" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} name="WAPE (%)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Intraday Diurnal Breakdown (By UK Hour) */}
        <div className="card-trading p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Intraday Error Profile (Hour of Day UK)</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">00:00 – 23:00 UK Time</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickFormatter={(h) => `${h}:00`} />
                <YAxis stroke="#64748b" fontSize={11} unit=" MW" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono space-y-1 shadow-lg">
                          <div className="text-white font-bold">Hour {d.hour}:00 UK Local</div>
                          <div className="text-cyan-400">MAE: {formatMW(d.mae)}</div>
                          <div className="text-slate-400">Bias: {d.bias > 0 ? `+${d.bias}` : d.bias} MW</div>
                          <div className="text-indigo-300">P90 Error: +{formatMW(d.p90_error)}</div>
                          <div className="text-indigo-300">P10 Error: {formatMW(d.p10_error)}</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend verticalAlign="top" align="right" height={24} iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="mae" fill="#3b82f6" fillOpacity={0.6} name="MAE (MW)" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="p90_error" stroke="#f43f5e" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="P90 Error (+Short)" />
                <Line type="monotone" dataKey="p10_error" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="P10 Error (-Long)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Horizon Breakdown Chart */}
        <div className="card-trading p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Accuracy by Forecast Horizon Bucket</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">All Published Vintages (0–72h)</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={horizonData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit=" MW" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono space-y-1 shadow-lg">
                          <div className="text-white font-bold">Horizon {d.bucket}</div>
                          <div className="text-cyan-400">MAE: {formatMW(d.mae)}</div>
                          <div className="text-amber-400">WAPE: {formatPercent(d.wape)}</div>
                          <div className="text-slate-400">Vintages: {d.n.toLocaleString()}</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend verticalAlign="top" align="right" height={24} iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="mae" fill="#818cf8" fillOpacity={0.8} name="MAE (MW)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Error Histogram */}
        <div className="card-trading p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Error Distribution Histogram</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Error = Forecast - Actual (MW)</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="bin_center" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <YAxis stroke="#64748b" fontSize={11} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono space-y-1 shadow-lg">
                          <div className="text-white font-bold">{d.bin_start} to {d.bin_end} MW</div>
                          <div className="text-emerald-400">Frequency: {d.frequency}%</div>
                          <div className="text-slate-400">Count: {d.count} periods</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <ReferenceLine x={0} stroke="#f59e0b" strokeWidth={1.5} label={{ value: 'Zero Error', fill: '#f59e0b', fontSize: 10 }} />
                <Bar dataKey="frequency" fill="#10b981" fillOpacity={0.7} name="Frequency (%)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
