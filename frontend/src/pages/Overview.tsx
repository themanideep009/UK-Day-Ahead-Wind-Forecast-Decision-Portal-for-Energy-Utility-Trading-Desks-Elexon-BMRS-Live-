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
  ReferenceLine,
} from 'recharts'
import {
  Zap,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Eye,
  EyeOff,
  Flame,
  Sparkles,
  Sliders,
  CheckCircle2,
  Calendar,
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
  const [showErrorDeltas, setShowErrorDeltas] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: decisionData, isLoading: loadingDecision } = useQuery({
    queryKey: ['decision', deliveryDate, cutoff, includeActuals],
    queryFn: () => api.getDecisionDesk(deliveryDate, cutoff, includeActuals),
  })

  // Compare query for alternative cutoff
  const altCutoff = cutoff === '09:20' ? '09:50' : '09:20'
  const { data: altDecisionData } = useQuery({
    queryKey: ['decisionAlt', deliveryDate, altCutoff],
    queryFn: () => api.getDecisionDesk(deliveryDate, altCutoff, false),
  })

  const { data: accuracyData, isLoading: loadingAccuracy } = useQuery({
    queryKey: ['accuracySummary', cutoff],
    queryFn: () => api.getAccuracySummary('2026-01-02', '2026-02-01', cutoff),
  })

  const { data: daysData } = useQuery({
    queryKey: ['accuracyByDay', cutoff],
    queryFn: () => api.getAccuracyByDay('2026-01-02', '2026-02-01', cutoff),
  })

  const summary = decisionData?.summary
  const metrics = accuracyData?.metrics

  // Format chart data with comparison
  const altPointsMap = new Map((altDecisionData?.points || []).map((p) => [p.settlementPeriod, p.forecast_mw]))

  const chartData = (decisionData?.points || []).map((p) => {
    const altForecast = altPointsMap.get(p.settlementPeriod)
    const revision = altForecast !== undefined ? Math.round(altForecast - p.forecast_mw) : 0

    return {
      time: formatTimeUK(p.startTime),
      startTime: p.startTime,
      period: p.settlementPeriod,
      forecast: p.forecast_mw,
      altForecast,
      revision,
      actual: p.actual_mw,
      p10_risk: p.risk_p10_mw,
      p90_risk: p.risk_p90_mw,
      error: p.error_mw,
      publishTime: p.publishTime,
      horizon: p.horizon_hours,
    }
  })

  const selectDay = (dateStr: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('delivery_date', dateStr)
    setSearchParams(params)
  }

  return (
    <div className="space-y-6">
      {/* Hero / Pitch Banner with Interactive Elements */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b101d] via-[#0f172a] to-[#082f49]/30 border border-[#1b2742] p-6 lg:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-xs font-mono text-cyan-300 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>UK National Wind Power Procurement Intelligence Desk</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Day-Ahead Wind Forecast Decision Portal
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
            Empowers energy buyers to navigate volatile wind forecasts before day-ahead gate closures.
            Evaluates the exact national wind forecast published by National Grid ESO at{' '}
            <span className="text-amber-400 font-mono font-bold">09:20 EPEX</span> and{' '}
            <span className="text-amber-400 font-mono font-bold">09:50 Nord Pool N2EX</span>, computes empirical
            safety buffers, and shields portfolios from asymmetric Balancing Mechanism cashout risk.
          </p>

          {/* Interactive Gate Closure Switcher Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#060911]/90 border border-[#1b2742] rounded-xl p-1.5 text-xs">
              <span className="text-slate-400 px-2 font-medium">As-Of Gate Closure:</span>
              <button
                onClick={() => setCutoff('09:20')}
                className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all ${
                  cutoff === '09:20'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                09:20 EPEX (07:30 UTC Batch)
              </button>
              <button
                onClick={() => setCutoff('09:50')}
                className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all ${
                  cutoff === '09:50'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                09:50 N2EX (+2h Fresher Batch)
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/80 px-3 py-1.5 rounded-xl font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero Look-Ahead Guaranteed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Delivery Day Timeline Scrubber */}
      <div className="card-trading p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>January 2026 Delivery Calendar (Click any day to inspect):</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            Selected: <strong className="text-cyan-300">{formatDateUK(deliveryDate)}</strong>
          </span>
        </div>

        {/* Scrollable Day Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {(daysData || []).map((d) => {
            const isSelected = d.delivery_date === deliveryDate
            const dayNum = d.delivery_date.slice(8)
            const isWorst = d.wape > 50
            return (
              <button
                key={d.delivery_date}
                onClick={() => selectDay(d.delivery_date)}
                className={`flex flex-col items-center justify-center min-w-[42px] py-1.5 px-1 rounded-xl text-xs font-mono transition-all border ${
                  isSelected
                    ? 'bg-gradient-to-b from-cyan-500 to-cyan-600 text-slate-950 font-bold border-cyan-400 shadow-lg shadow-cyan-500/30 scale-105'
                    : isWorst
                    ? 'bg-rose-950/30 text-rose-300 border-rose-900/60 hover:bg-rose-950/60'
                    : 'bg-[#0b101d] text-slate-300 border-[#1b2742] hover:bg-[#16223d] hover:border-slate-700'
                }`}
                title={`${formatDateUK(d.delivery_date)}: WAPE ${d.wape}%, MAE ${d.mae} MW`}
              >
                <span className="text-[10px] opacity-75">Jan</span>
                <span className="text-sm font-bold">{dayNum}</span>
                <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-slate-950' : 'text-slate-400'}`}>
                  {Math.round(d.wape)}%
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Headline KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Day D Forecast Energy"
          value={formatMWh(summary?.total_forecast_energy_mwh)}
          subtitle={`${formatDateUK(deliveryDate)} • 48 Periods`}
          badge={`Cutoff ${cutoff}`}
          badgeColor="amber"
          icon={Zap}
          highlight
        />
        <KpiCard
          title="Peak Forecast MW"
          value={formatMW(summary?.peak_forecast_mw)}
          subtitle={summary?.peak_forecast_time ? `At ${formatTimeUK(summary.peak_forecast_time)} UK` : '—'}
          badge="Max Dispatch"
          badgeColor="cyan"
          icon={Flame}
        />
        <KpiCard
          title="P10 Safety Buffer"
          value={formatMWh(summary?.daily_buffer_p10_mwh)}
          subtitle="90% Confidence of Not Being Short"
          badge="Reserve"
          badgeColor="indigo"
          icon={ShieldAlert}
        />
        <KpiCard
          title="Monthly WAPE (Scope)"
          value={formatPercent(metrics?.wape)}
          subtitle={`MAE ${formatMW(metrics?.mae)} • ${metrics?.n || 0} Half-Hours`}
          badge={metrics?.bias && metrics.bias > 0 ? '84.7% Short Risk' : 'Net Long'}
          badgeColor={metrics?.bias && metrics.bias > 0 ? 'rose' : 'emerald'}
          icon={TrendingDown}
        />
      </div>

      {/* Main Interactive Chart Section */}
      <div className="card-trading-glow p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#1b2742]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Decision-Time Profile: {formatDateUK(deliveryDate)}
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-300">
                {cutoff} Cutoff
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive 48 settlement periods comparing gate closure forecast against empirical P10/P90 risk bounds
            </p>
          </div>

          {/* Interactive Chart Series Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowErrorDeltas(!showErrorDeltas)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showErrorDeltas
                  ? 'bg-rose-950/70 border-rose-600 text-rose-300 shadow-sm'
                  : 'bg-[#0b101d] border-[#1b2742] text-slate-400 hover:text-slate-200 hover:bg-[#16223d]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showErrorDeltas ? 'Hide Imbalance' : 'Show Imbalance Error'}</span>
            </button>

            <button
              onClick={() => setIncludeActuals(!includeActuals)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                includeActuals
                  ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300 shadow-sm'
                  : 'bg-[#0b101d] border-[#1b2742] text-slate-400 hover:text-slate-200 hover:bg-[#16223d]'
              }`}
            >
              {includeActuals ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{includeActuals ? 'Actuals Revealed' : 'Reveal Actuals'}</span>
            </button>

            <Link
              to={`/decision?${searchParams.toString()}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-600/30 transition-all shadow-sm"
            >
              <span>Decision Desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Recharts Chart */}
        <div className="h-[400px] w-full pt-2">
          {loadingDecision ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">
              Loading interactive forecast data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="forecastGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2742" />
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
                        <div className="bg-[#0b101d]/95 backdrop-blur-md border border-[#2a3a5f] rounded-xl p-3.5 text-xs shadow-2xl space-y-1.5 min-w-[240px]">
                          <div className="font-bold text-white border-b border-[#1b2742] pb-1.5 flex justify-between gap-4">
                            <span>Period {data.period} ({data.time} UK)</span>
                            <span className="text-cyan-400 font-mono font-medium">
                              Horizon: {formatHorizon(data.horizon)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-amber-400 font-mono">
                            <span>As-Of Forecast ({cutoff}):</span>
                            <span className="font-bold">{formatMW(data.forecast)}</span>
                          </div>

                          <div className="flex items-center justify-between text-indigo-300 font-mono">
                            <span>P10 Wind Lower Bound:</span>
                            <span>{formatMW(data.p10_risk)}</span>
                          </div>

                          <div className="flex items-center justify-between text-indigo-300 font-mono">
                            <span>P90 Wind Upper Bound:</span>
                            <span>{formatMW(data.p90_risk)}</span>
                          </div>

                          {data.actual !== null && data.actual !== undefined && (
                            <div className="flex items-center justify-between text-emerald-400 font-mono border-t border-[#1b2742] pt-1">
                              <span>Outturn Actual:</span>
                              <span className="font-bold">{formatMW(data.actual)}</span>
                            </div>
                          )}

                          {data.error !== null && data.error !== undefined && (
                            <div className={`flex items-center justify-between font-mono font-bold ${
                              data.error > 0 ? 'text-rose-400' : 'text-blue-400'
                            }`}>
                              <span>Imbalance Error:</span>
                              <span>
                                {data.error > 0 ? `+${formatMW(data.error)} (Short)` : `${formatMW(data.error)} (Long)`}
                              </span>
                            </div>
                          )}

                          <div className="text-[10px] text-slate-500 pt-1 border-t border-[#1b2742]">
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
                  height={32}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                />

                {/* Shaded risk band */}
                <Area
                  type="monotone"
                  dataKey="p90_risk"
                  stroke="none"
                  fill="url(#riskGradient)"
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

                {/* Central Forecast Line */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                  name={`As-Of Forecast (${cutoff})`}
                />

                {/* Outturn Actual Line */}
                {includeActuals && (
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    name="Outturn Actual (MW)"
                  />
                )}

                {/* Imbalance error line if enabled */}
                {showErrorDeltas && includeActuals && (
                  <Line
                    type="monotone"
                    dataKey="error"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="2 2"
                    name="Error Delta (F - A)"
                  />
                )}
                {showErrorDeltas && includeActuals && (
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Computed Dynamic Trading Insights Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Empirical Trading Insights (January 2026 Evaluation)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Directly derived from live Elexon BMRS dataset
          </span>
        </div>

        {loadingAccuracy ? (
          <div className="text-xs text-slate-400">Computing market insights...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(accuracyData?.callouts || []).map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
