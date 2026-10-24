import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import {
  Zap,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Eye,
  EyeOff,
  Flame,
} from 'lucide-react'
import { api } from '../api/client'
import { KpiCard } from '../components/KpiCard'
import { InsightCard } from '../components/InsightCard'
import {
  formatMW,
  formatMWh,
  formatPercent,
  formatTimeUK,
  formatDateUK,
  formatHorizon,
} from '../lib/formatters'
import { Link, useSearchParams } from 'react-router-dom'

interface OverviewProps {
  deliveryDate: string
  cutoff: string
  setCutoff: (c: string) => void
}

export const Overview: React.FC<OverviewProps> = ({
  deliveryDate,
  cutoff,
  setCutoff,
}) => {
  const [includeActuals, setIncludeActuals] = useState(true)
  const [searchParams] = useSearchParams()

  const { data: decisionData, isLoading: loadingDecision } = useQuery({
    queryKey: ['decision', deliveryDate, cutoff, includeActuals],
    queryFn: () => api.getDecisionDesk(deliveryDate, cutoff, includeActuals),
  })

  const { data: accuracyData, isLoading: loadingAccuracy } = useQuery({
    queryKey: ['accuracySummary', cutoff],
    queryFn: () => api.getAccuracySummary('2026-01-02', '2026-02-01', cutoff),
  })

  const summary = decisionData?.summary
  const metrics = accuracyData?.metrics

  // Format chart data
  const chartData = (decisionData?.points || []).map((p) => ({
    time: formatTimeUK(p.startTime),
    startTime: p.startTime,
    period: p.settlementPeriod,
    forecast: p.forecast_mw,
    actual: p.actual_mw,
    p10_risk: p.risk_p10_mw,
    p90_risk: p.risk_p90_mw,
    error: p.error_mw,
    publishTime: p.publishTime,
    horizon: p.horizon_hours,
  }))

  return (
    <div className="space-y-6">
      {/* Hero / Pitch Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 p-6 md:p-8">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-[11px] font-mono text-cyan-300">
            <Zap className="w-3.5 h-3.5" />
            <span>UK Day-Ahead Energy Procurement Decision Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Wind Power Decision Desk & Forecast Risk Portal
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            GB energy buyers must procure residual power before day-ahead gate closure. This portal
            delivers the exact wind forecast available at decision cutoffs (<span className="text-amber-400 font-mono">09:20 EPEX</span> and <span className="text-amber-400 font-mono">09:50 N2EX</span>),
            quantifies historic error risks, and computes empirical safety buffers.
          </p>
        </div>

        {/* Quick Cutoff Context Badge */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Current As-Of Gate Closure:</span>
            <span className="font-mono px-2 py-1 rounded bg-slate-800 text-amber-300 border border-slate-700 font-bold">
              {cutoff} UK Local Time
            </span>
            <span className="text-slate-400 hidden sm:inline">
              (D-1 Decision: {decisionData?.decision_date || '—'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCutoff(cutoff === '09:20' ? '09:50' : '09:20')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>Compare with {cutoff === '09:20' ? '09:50 N2EX' : '09:20 EPEX'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Headline KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Forecast Energy (Day D)"
          value={formatMWh(summary?.total_forecast_energy_mwh)}
          subtitle={`${formatDateUK(deliveryDate)} • 48 Periods`}
          badge={cutoff}
          badgeColor="amber"
          icon={Zap}
        />
        <KpiCard
          title="Peak Forecast MW"
          value={formatMW(summary?.peak_forecast_mw)}
          subtitle={summary?.peak_forecast_time ? `At ${formatTimeUK(summary.peak_forecast_time)} UK` : '—'}
          badge="Max Demand"
          badgeColor="cyan"
          icon={Flame}
        />
        <KpiCard
          title="P10 Procurement Buffer"
          value={formatMWh(summary?.daily_buffer_p10_mwh)}
          subtitle="90% Confidence of Not Being Short"
          badge="Risk Guard"
          badgeColor="indigo"
          icon={ShieldAlert}
        />
        <KpiCard
          title="Headline WAPE (Scope)"
          value={formatPercent(metrics?.wape)}
          subtitle={`MAE ${formatMW(metrics?.mae)} • ${metrics?.n || 0} Half-Hours`}
          badge={metrics?.bias && metrics.bias > 0 ? 'Net Short Risk' : 'Net Long'}
          badgeColor={metrics?.bias && metrics.bias > 0 ? 'rose' : 'emerald'}
          icon={TrendingDown}
        />
      </div>

      {/* Main Interactive Chart Section */}
      <div className="card-trading p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Decision-Time Profile for {formatDateUK(deliveryDate)}</span>
              <span className="text-xs font-mono font-normal text-slate-400">
                (Cutoff: {cutoff} Europe/London on D-1)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Latest forecast available at gate closure vs. P10/P90 empirical risk bounds
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIncludeActuals(!includeActuals)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                includeActuals
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {includeActuals ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{includeActuals ? 'Outturn Revealed' : 'Reveal Outturn Actuals'}</span>
            </button>

            <Link
              to={`/decision?${searchParams.toString()}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 transition-all"
            >
              <span>Decision Desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Recharts Chart */}
        <div className="h-[380px] w-full pt-2">
          {loadingDecision ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">
              Loading decision forecast data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  unit=" MW"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl space-y-1.5">
                          <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between gap-4">
                            <span>Period {data.period} ({data.time} UK)</span>
                            <span className="text-slate-400 font-mono font-normal">
                              Horizon: {formatHorizon(data.horizon)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-amber-400">
                            <span>As-Of Forecast:</span>
                            <span className="font-mono font-bold">{formatMW(data.forecast)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-indigo-300">
                            <span>P10 Wind Bound:</span>
                            <span className="font-mono">{formatMW(data.p10_risk)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-indigo-300">
                            <span>P90 Wind Bound:</span>
                            <span className="font-mono">{formatMW(data.p90_risk)}</span>
                          </div>
                          {data.actual !== null && data.actual !== undefined && (
                            <div className="flex items-center justify-between gap-4 text-emerald-400 border-t border-slate-800 pt-1">
                              <span>Outturn Actual:</span>
                              <span className="font-mono font-bold">{formatMW(data.actual)}</span>
                            </div>
                          )}
                          {data.error !== null && data.error !== undefined && (
                            <div className={`flex items-center justify-between gap-4 pt-0.5 ${
                              data.error > 0 ? 'text-rose-400' : 'text-cyan-400'
                            }`}>
                              <span>Error (F - A):</span>
                              <span className="font-mono">
                                {data.error > 0 ? `+${formatMW(data.error)} (Short)` : `${formatMW(data.error)} (Long)`}
                              </span>
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 pt-1">
                            Published: {new Date(data.publishTime).toUTCString().slice(17, 22)} UTC
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                />

                {/* Shaded risk band between P10 and P90 */}
                <Area
                  type="monotone"
                  dataKey="p90_risk"
                  stroke="none"
                  fill="#6366f1"
                  fillOpacity={0.12}
                  name="Risk Band (P10–P90)"
                />
                <Area
                  type="monotone"
                  dataKey="p10_risk"
                  stroke="#818cf8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  fill="none"
                  name="P10 Lower Bound"
                />

                {/* Forecast Line */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                  name="As-Of Forecast (MW)"
                />

                {/* Actuals Line (Revealed) */}
                {includeActuals && (
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                    name="Outturn Actual (MW)"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Computed Plain-English Insight Callouts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Empirical Trading Insights (Jan 2026 Evaluation)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Computed live from Elexon BMRS dataset
          </span>
        </div>

        {loadingAccuracy ? (
          <div className="text-xs text-slate-400">Computing market insights...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(accuracyData?.callouts || []).map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
