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
  const [metricView, setMetricView] = useState<'wape' | 'mae' | 'bias'>('wape')
  const [histogramBins, setHistogramBins] = useState(25)

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
    queryKey: ['accuracyDist', dateFrom, dateTo, cutoff, histogramBins],
    queryFn: () => api.getErrorDistribution(dateFrom, dateTo, cutoff, histogramBins),
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
      {/* Header & Interactive Window Controls */}
      <div className="card-trading-glow p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>QUANTITATIVE ERROR BENCHMARKING</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
              Forecast Accuracy & Error Distribution Analysis
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Empirical validation across all 31 delivery days in January 2026. Evaluate multi-dimensional error breakdowns.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Window selector */}
            <div className="flex items-center gap-2 bg-[#060911] border border-[#1b2742] rounded-xl px-3 py-1.5 text-xs text-slate-300 shadow-inner">
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
            <div className="flex items-center gap-1 bg-[#060911] border border-[#1b2742] rounded-xl p-1 text-xs shadow-inner">
              <button
                onClick={() => setCutoff('09:20')}
                className={`px-2.5 py-1.5 rounded-lg font-mono font-bold transition-all ${
                  cutoff === '09:20'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                09:20 EPEX
              </button>
              <button
                onClick={() => setCutoff('09:50')}
                className={`px-2.5 py-1.5 rounded-lg font-mono font-bold transition-all ${
                  cutoff === '09:50'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                09:50 N2EX
              </button>
            </div>

            {/* Export CSV button */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#10172a] border border-[#1b2742] hover:bg-[#16223d] text-cyan-300 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Headline WAPE"
          value={formatPercent(m?.wape)}
          subtitle="Σ|e| / Σ Actual"
          badge="Volume Weighted"
          badgeColor="amber"
          highlight
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
          badge="90% Tail Bound"
          badgeColor="indigo"
        />
        <KpiCard
          title="Short vs Long Share"
          value={m ? `${Math.round(m.share_over)}% / ${Math.round(m.share_under)}%` : '—'}
          subtitle="Over (Short) / Under (Long)"
          badge="Asymmetric"
          badgeColor="rose"
        />
        <KpiCard
          title="Guarded MAPE"
          value={formatPercent(m?.mape)}
          subtitle="Filtered: Actuals ≥ 100 MW"
          badge="Guarded"
          badgeColor="emerald"
        />
      </div>

      {/* Extreme Excursions Callouts */}
      {m?.largest_over && m?.largest_under && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-rose-900/50 bg-gradient-to-r from-rose-950/20 to-[#0b101d] flex items-start gap-3.5 shadow-lg">
            <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                Largest Over-Forecast Excursion (Costly Short Imbalance Exposure)
              </div>
              <div className="text-xl font-extrabold text-white font-mono">
                +{formatMW(m.largest_over.error_mw)}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Occurred on <strong>{formatDateUK(m.largest_over.timestamp)}</strong> during Period {m.largest_over.settlementPeriod} ({formatTimeUK(m.largest_over.timestamp)} UK).
                Forecast was {formatMW(m.largest_over.forecast_mw)} vs actual {formatMW(m.largest_over.actual_mw)}.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-cyan-900/50 bg-gradient-to-r from-cyan-950/20 to-[#0b101d] flex items-start gap-3.5 shadow-lg">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Largest Under-Forecast Excursion (Long Power Position)
              </div>
              <div className="text-xl font-extrabold text-white font-mono">
                {formatMW(m.largest_under.error_mw)}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Occurred on <strong>{formatDateUK(m.largest_under.timestamp)}</strong> during Period {m.largest_under.settlementPeriod} ({formatTimeUK(m.largest_under.timestamp)} UK).
                Forecast was {formatMW(m.largest_under.forecast_mw)} vs actual {formatMW(m.largest_under.actual_mw)}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Dimensional Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Daily Breakdown Chart with Metric Switcher */}
        <div className="card-trading p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2742] pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Daily Accuracy Trend</h3>
            </div>

            {/* Metric Switcher Pills */}
            <div className="flex items-center gap-1 bg-[#060911] border border-[#1b2742] rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setMetricView('wape')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  metricView === 'wape' ? 'bg-[#16223d] text-amber-300 font-bold' : 'text-slate-400'
                }`}
              >
                WAPE %
              </button>
              <button
                onClick={() => setMetricView('mae')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  metricView === 'mae' ? 'bg-[#16223d] text-cyan-300 font-bold' : 'text-slate-400'
                }`}
              >
                MAE (MW)
              </button>
              <button
                onClick={() => setMetricView('bias')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  metricView === 'bias' ? 'bg-[#16223d] text-rose-300 font-bold' : 'text-slate-400'
                }`}
              >
                Bias (MW)
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dayData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2742" />
                <XAxis dataKey="delivery_date" stroke="#64748b" fontSize={10} tickFormatter={(d) => d.slice(5)} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  unit={metricView === 'wape' ? '%' : ' MW'}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-[#0b101d] border border-[#2a3a5f] rounded-xl p-3 text-xs font-mono space-y-1 shadow-xl">
                          <div className="text-white font-bold">{formatDateUK(d.delivery_date)}</div>
                          <div className="text-amber-400">WAPE: {formatPercent(d.wape)}</div>
                          <div className="text-cyan-400">MAE: {formatMW(d.mae)}</div>
                          <div className="text-slate-300">RMSE: {formatMW(d.rmse)}</div>
                          <div className={`font-bold ${d.bias > 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                            Bias: {d.bias > 0 ? `+${d.bias}` : d.bias} MW
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend verticalAlign="top" align="right" height={24} iconSize={8} wrapperStyle={{ fontSize: '10px' }} />

                {metricView === 'wape' && (
                  <Line type="monotone" dataKey="wape" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} name="Daily WAPE (%)" />
                )}
                {metricView === 'mae' && (
                  <Bar dataKey="mae" fill="#06b6d4" fillOpacity={0.7} name="Daily MAE (MW)" radius={[3, 3, 0, 0]} />
                )}
                {metricView === 'bias' && (
                  <Bar
                    dataKey="bias"
                    fill="#f43f5e"
                    fillOpacity={0.7}
                    name="Daily Bias (MW)"
                    radius={[3, 3, 0, 0]}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Intraday Diurnal Breakdown (By UK Hour) */}
        <div className="card-trading p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1b2742] pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Intraday Error Profile (Hour of Day UK)</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">00:00 – 23:00 UK Local</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2742" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickFormatter={(h) => `${h}:00`} />
                <YAxis stroke="#64748b" fontSize={11} unit=" MW" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-[#0b101d] border border-[#2a3a5f] rounded-xl p-3 text-xs font-mono space-y-1 shadow-xl">
                          <div className="text-white font-bold">Hour {d.hour}:00 UK Time</div>
                          <div className="text-cyan-400">MAE: {formatMW(d.mae)}</div>
                          <div className="text-slate-400">Bias: {d.bias > 0 ? `+${d.bias}` : d.bias} MW</div>
                          <div className="text-rose-400">P90 Over-Forecast: +{formatMW(d.p90_error)}</div>
                          <div className="text-blue-400">P10 Under-Forecast: {formatMW(d.p10_error)}</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend verticalAlign="top" align="right" height={24} iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="mae" fill="#3b82f6" fillOpacity={0.65} name="MAE (MW)" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="p90_error" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="3 3" name="P90 Risk (+Short)" />
                <Line type="monotone" dataKey="p10_error" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="3 3" name="P10 Risk (-Long)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Horizon Breakdown Chart */}
        <div className="card-trading p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1b2742] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Accuracy by Forecast Horizon Bucket</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">All Published Vintages (0–72h)</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={horizonData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2742" />
                <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit=" MW" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-[#0b101d] border border-[#2a3a5f] rounded-xl p-3 text-xs font-mono space-y-1 shadow-xl">
                          <div className="text-white font-bold">Horizon Bucket: {d.bucket}</div>
                          <div className="text-cyan-400">MAE: {formatMW(d.mae)}</div>
                          <div className="text-amber-400">WAPE: {formatPercent(d.wape)}</div>
                          <div className="text-slate-400">Vintages Evaluated: {d.n.toLocaleString()}</div>
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

        {/* 4. Error Histogram with Interactive Bins */}
        <div className="card-trading p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2742] pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Error Distribution Histogram</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">Bins:</span>
              <div className="flex items-center gap-1 bg-[#060911] border border-[#1b2742] rounded-lg p-0.5 text-xs">
                {[15, 25, 40].map((b) => (
                  <button
                    key={b}
                    onClick={() => setHistogramBins(b)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      histogramBins === b ? 'bg-[#16223d] text-emerald-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2742" />
                <XAxis dataKey="bin_center" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <YAxis stroke="#64748b" fontSize={11} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-[#0b101d] border border-[#2a3a5f] rounded-xl p-3 text-xs font-mono space-y-1 shadow-xl">
                          <div className="text-white font-bold">{d.bin_start} to {d.bin_end} MW</div>
                          <div className="text-emerald-400">Frequency: {d.frequency}%</div>
                          <div className="text-slate-400">Count: {d.count} half-hours</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <ReferenceLine x={0} stroke="#f59e0b" strokeWidth={2} label={{ value: 'Zero Error', fill: '#f59e0b', fontSize: 10 }} />
                <Bar dataKey="frequency" fill="#10b981" fillOpacity={0.75} name="Frequency (%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
