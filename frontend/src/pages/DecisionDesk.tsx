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
  Eye,
  EyeOff,
  ShieldCheck,
  History,
  Clock,
  Sliders,
  Layers,
} from 'lucide-react'
import { api } from '../api/client'
import {
  formatMW,
  formatMWh,
  formatTimeUK,
  formatDateUK,
  formatHorizon,
} from '../lib/formatters'

interface DecisionDeskProps {
  deliveryDate: string
  cutoff: string
  setCutoff: (c: string) => void
}

export const DecisionDesk: React.FC<DecisionDeskProps> = ({
  deliveryDate,
  cutoff,
  setCutoff,
}) => {
  const [includeActuals, setIncludeActuals] = useState(false)
  const [compareAltCutoff, setCompareAltCutoff] = useState(false)
  const [selectedTargetTime, setSelectedTargetTime] = useState<string | null>(null)
  const [customCutoffInput, setCustomCutoffInput] = useState('')
  const [riskConfidence, setRiskConfidence] = useState(90) // 90% confidence default
  const [tableFilter, setTableFilter] = useState<'all' | 'peak' | 'offpeak'>('all')

  const lowerQ = Math.round((100 - riskConfidence)) / 100
  const upperQ = Math.round(riskConfidence) / 100

  // Primary decision query
  const { data: decisionData, isLoading } = useQuery({
    queryKey: ['decision', deliveryDate, cutoff, includeActuals, lowerQ, upperQ],
    queryFn: () => api.getDecisionDesk(deliveryDate, cutoff, includeActuals, lowerQ, upperQ),
  })

  // Compare query for alternative cutoff
  const altCutoff = cutoff === '09:20' ? '09:50' : '09:20'
  const { data: altDecisionData } = useQuery({
    queryKey: ['decisionAlt', deliveryDate, altCutoff],
    queryFn: () => api.getDecisionDesk(deliveryDate, altCutoff, false),
    enabled: compareAltCutoff,
  })

  // Evolution query for selected target time
  const { data: evolutionData, isLoading: loadingEvolution } = useQuery({
    queryKey: ['evolution', selectedTargetTime, cutoff],
    queryFn: () => (selectedTargetTime ? api.getEvolution(selectedTargetTime, cutoff) : null),
    enabled: !!selectedTargetTime,
  })

  const summary = decisionData?.summary
  const points = decisionData?.points || []

  // Default selected target time to period 25 (12:00 UK) if none selected
  React.useEffect(() => {
    if (!selectedTargetTime && points.length > 24) {
      setSelectedTargetTime(points[24].startTime)
    }
  }, [points, selectedTargetTime])

  const altMap = new Map((altDecisionData?.points || []).map((p) => [p.settlementPeriod, p.forecast_mw]))

  const chartData = points.map((p) => {
    const altFc = altMap.get(p.settlementPeriod)
    return {
      time: formatTimeUK(p.startTime),
      startTime: p.startTime,
      period: p.settlementPeriod,
      forecast: p.forecast_mw,
      altForecast: altFc,
      actual: p.actual_mw,
      p10_risk: p.risk_p10_mw,
      p90_risk: p.risk_p90_mw,
      error: p.error_mw,
      publishTime: p.publishTime,
      horizon: p.horizon_hours,
      isSelected: selectedTargetTime === p.startTime,
    }
  })

  // Filtered table rows
  const filteredPoints = points.filter((p) => {
    if (tableFilter === 'peak') return p.settlementPeriod >= 15 && p.settlementPeriod <= 38 // 07:00 to 19:00
    if (tableFilter === 'offpeak') return p.settlementPeriod < 15 || p.settlementPeriod > 38
    return true
  })

  const handleCustomCutoffSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (/^\d{2}:\d{2}$/.test(customCutoffInput)) {
      setCutoff(customCutoffInput)
    }
  }

  const selectedPoint = points.find((p) => p.startTime === selectedTargetTime)

  return (
    <div className="space-y-6">
      {/* Top Controls & Decision Context Header */}
      <div className="card-trading-glow p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>DAY-AHEAD AUCTION DECISION ENGINE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
              Decision Desk: Exact Information State at Gate Closure
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly filtered to National Grid ESO forecasts published $\le$ {cutoff} Europe/London on D-1 ({decisionData?.decision_date || '—'}).
              Zero look-ahead bias.
            </p>
          </div>

          {/* Interactive Gate Closure Switcher & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Cutoff Selector */}
            <div className="flex items-center gap-1 bg-[#060911] border border-[#1b2742] rounded-xl p-1 text-xs shadow-inner">
              <button
                onClick={() => setCutoff('09:20')}
                className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all ${
                  cutoff === '09:20'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                09:20 EPEX
              </button>
              <button
                onClick={() => setCutoff('09:50')}
                className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all ${
                  cutoff === '09:50'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                09:50 N2EX
              </button>

              <form onSubmit={handleCustomCutoffSubmit} className="flex items-center pl-1">
                <input
                  type="text"
                  placeholder="HH:MM"
                  value={customCutoffInput}
                  onChange={(e) => setCustomCutoffInput(e.target.value)}
                  className="w-16 bg-[#0b101d] border border-slate-700/60 rounded px-1.5 py-1 text-center font-mono text-xs text-white focus:outline-none focus:border-cyan-500"
                  title="Enter custom cutoff time (HH:MM)"
                />
              </form>
            </div>

            {/* Compare Cutoff Overlay Toggle */}
            <button
              onClick={() => setCompareAltCutoff(!compareAltCutoff)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                compareAltCutoff
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-sm'
                  : 'bg-[#060911] border-[#1b2742] text-slate-400 hover:text-slate-200'
              }`}
              title="Overlay the other gate closure forecast on the same chart"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Overlay {altCutoff}</span>
            </button>

            {/* Back-Test Reveal Toggle */}
            <button
              onClick={() => setIncludeActuals(!includeActuals)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                includeActuals
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                  : 'bg-[#060911] border-[#1b2742] text-slate-400 hover:text-slate-200'
              }`}
            >
              {includeActuals ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{includeActuals ? 'Actuals Revealed' : 'Reveal Actuals'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Risk Tolerance Slider & Buffer Bar */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/30 via-[#0b101d] to-cyan-950/20 border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Daily Procurement Risk Buffer:</span>
                <span className="font-mono text-indigo-300 font-extrabold text-base">
                  {formatMWh(summary?.daily_buffer_p10_mwh)}
                </span>
              </h4>
            </div>
            <p className="text-xs text-slate-300">
              To be <strong>{riskConfidence}% confident</strong> of avoiding a short position on {formatDateUK(deliveryDate)},
              contract for {formatMWh(summary?.daily_buffer_p10_mwh)} less wind than the central forecast.
            </p>
          </div>

          {/* Interactive Confidence Level Slider */}
          <div className="flex items-center gap-3 bg-[#060911]/80 px-4 py-2 rounded-xl border border-[#1b2742]">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400">Confidence:</span>
            <input
              type="range"
              min="75"
              max="95"
              step="5"
              value={riskConfidence}
              onChange={(e) => setRiskConfidence(Number(e.target.value))}
              className="w-24 accent-cyan-400 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-cyan-300 w-8">{riskConfidence}%</span>
          </div>
        </div>
      </div>

      {/* Main 48-Period Chart */}
      <div className="card-trading p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b2742] pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">
              48 Settlement Periods ({formatDateUK(deliveryDate)})
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              • Published: {summary?.latest_publish_used ? `${formatTimeUK(summary.latest_publish_used)} UTC` : '—'}
            </span>
          </div>

          <div className="text-xs font-mono text-slate-400 flex items-center gap-3">
            <span>
              Horizon: <strong className="text-slate-200">{formatHorizon(summary?.min_horizon_hours)} – {formatHorizon(summary?.max_horizon_hours)}</strong>
            </span>
            <span>
              Peak: <strong className="text-amber-400">{formatMW(summary?.peak_forecast_mw)}</strong>
            </span>
          </div>
        </div>

        <div className="h-[380px] w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">
              Loading 48 half-hour decision points...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskDeskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2742" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} interval={3} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} unit=" MW" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-[#0b101d]/95 backdrop-blur-md border border-[#2a3a5f] rounded-xl p-3 text-xs shadow-2xl space-y-1 min-w-[220px]">
                          <div className="font-bold text-white border-b border-[#1b2742] pb-1 flex justify-between gap-4">
                            <span>Period {data.period} ({data.time} UK)</span>
                            <span className="text-cyan-400 font-mono">{formatHorizon(data.horizon)}</span>
                          </div>
                          <div className="text-amber-400 font-mono flex justify-between gap-4">
                            <span>Forecast ({cutoff}):</span>
                            <span className="font-bold">{formatMW(data.forecast)}</span>
                          </div>
                          {data.altForecast !== undefined && (
                            <div className="text-cyan-400 font-mono flex justify-between gap-4">
                              <span>Forecast ({altCutoff}):</span>
                              <span>{formatMW(data.altForecast)}</span>
                            </div>
                          )}
                          <div className="text-indigo-300 font-mono flex justify-between gap-4">
                            <span>P{100 - riskConfidence} Bound:</span>
                            <span>{formatMW(data.p10_risk)}</span>
                          </div>
                          {data.actual !== null && data.actual !== undefined && (
                            <div className="text-emerald-400 font-mono flex justify-between gap-4 border-t border-[#1b2742] pt-1">
                              <span>Outturn Actual:</span>
                              <span className="font-bold">{formatMW(data.actual)}</span>
                            </div>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend verticalAlign="top" align="right" height={32} iconSize={8} wrapperStyle={{ fontSize: '11px' }} />

                <Area type="monotone" dataKey="p90_risk" stroke="none" fill="url(#riskDeskGradient)" name={`Risk Band (${riskConfidence}% Confidence)`} />
                <Area type="monotone" dataKey="p10_risk" stroke="#818cf8" strokeDasharray="4 4" strokeWidth={1.5} fill="none" name="Lower Risk Bound" />
                <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} name={`Forecast (${cutoff})`} />

                {compareAltCutoff && (
                  <Line
                    type="monotone"
                    dataKey="altForecast"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="3 3"
                    name={`Forecast (${altCutoff})`}
                  />
                )}

                {includeActuals && (
                  <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 5 }} name="Outturn Actual" />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Forecast Evolution Explorer Drawer */}
      {selectedPoint && (
        <div className="card-trading-glow p-6 space-y-4 border-cyan-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b2742] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800 text-cyan-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>Forecast Evolution: Period {selectedPoint.settlementPeriod} ({formatTimeUK(selectedPoint.startTime)} UK)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Tracing every forecast vintage published by National Grid ESO from 72h out to real-time delivery
                </p>
              </div>
            </div>

            {evolutionData && (
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="px-3 py-1.5 rounded-xl bg-[#060911] border border-[#1b2742]">
                  <span className="text-slate-400">Cutoff {cutoff}: </span>
                  <span className="text-amber-400 font-bold">{formatMW(evolutionData.asof_forecast_mw)}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#060911] border border-[#1b2742]">
                  <span className="text-slate-400">Pre-Delivery Final: </span>
                  <span className="text-cyan-400 font-bold">{formatMW(evolutionData.final_forecast_mw)}</span>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border font-bold ${
                  evolutionData.revision_mw > 0 ? 'bg-amber-950/40 border-amber-800 text-amber-300' : 'bg-cyan-950/40 border-cyan-800 text-cyan-300'
                }`}>
                  Revision: {evolutionData.revision_mw > 0 ? `+${evolutionData.revision_mw}` : evolutionData.revision_mw} MW
                </div>
              </div>
            )}
          </div>

          {/* Evolution Step Chart */}
          <div className="h-[250px] w-full">
            {loadingEvolution ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                Loading vintage trajectory...
              </div>
            ) : evolutionData ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={evolutionData.vintages.map((v) => ({
                    publish: new Date(v.publishTime).toLocaleTimeString('en-GB', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Europe/London',
                    }),
                    forecast: v.forecast_mw,
                    horizon: v.horizon_hours,
                    is_asof: v.is_asof,
                    actual: evolutionData.actual_mw,
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1b2742" />
                  <XAxis dataKey="publish" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={11} unit=" MW" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload
                        return (
                          <div className="bg-[#0b101d] border border-[#2a3a5f] rounded-xl p-3 text-xs shadow-2xl space-y-1">
                            <div className="font-bold text-white flex justify-between gap-4">
                              <span>Published: {d.publish}</span>
                              <span className="text-cyan-400 font-mono">Horizon: {formatHorizon(d.horizon)}</span>
                            </div>
                            <div className="text-amber-400 font-mono">Forecast: {formatMW(d.forecast)}</div>
                            {d.is_asof && <div className="text-cyan-400 font-bold">★ Selected As-Of Cutoff Vintage</div>}
                            {d.actual !== null && d.actual !== undefined && (
                              <div className="text-emerald-400 font-mono">Actual Outturn: {formatMW(d.actual)}</div>
                            )}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="forecast"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      if (payload.is_asof) {
                        return (
                          <circle
                            key={`asof-${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={7}
                            fill="#f59e0b"
                            stroke="#ffffff"
                            strokeWidth={2.5}
                          />
                        )
                      }
                      return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#06b6d4" />
                    }}
                    name="Forecast Vintage (MW)"
                  />
                  {evolutionData.actual_mw !== null && (
                    <ReferenceLine
                      y={evolutionData.actual_mw}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: `Actual: ${formatMW(evolutionData.actual_mw)}`, fill: '#10b981', fontSize: 11 }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      )}

      {/* 48-Point Detailed Data Table with Filtering */}
      <div className="card-trading overflow-hidden">
        <div className="p-4 border-b border-[#1b2742] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-white">48 Settlement Half-Hours Data Table</h3>
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#060911] border border-[#1b2742] rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setTableFilter('all')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  tableFilter === 'all' ? 'bg-[#16223d] text-cyan-300 font-bold' : 'text-slate-400'
                }`}
              >
                All (48)
              </button>
              <button
                onClick={() => setTableFilter('peak')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  tableFilter === 'peak' ? 'bg-[#16223d] text-cyan-300 font-bold' : 'text-slate-400'
                }`}
              >
                Peak (07:00–19:00)
              </button>
              <button
                onClick={() => setTableFilter('offpeak')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  tableFilter === 'offpeak' ? 'bg-[#16223d] text-cyan-300 font-bold' : 'text-slate-400'
                }`}
              >
                Off-Peak
              </button>
            </div>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Click row to select target half-hour for Evolution Explorer
          </span>
        </div>

        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#060911] text-slate-400 border-b border-[#1b2742] font-mono z-10">
              <tr>
                <th className="py-2.5 px-3">Period</th>
                <th className="py-2.5 px-3">Start (UK)</th>
                <th className="py-2.5 px-3 text-right">Forecast (MW)</th>
                <th className="py-2.5 px-3 text-right">Energy (MWh)</th>
                <th className="py-2.5 px-3 text-right">P{100 - riskConfidence} Bound</th>
                <th className="py-2.5 px-3 text-right">P{riskConfidence} Bound</th>
                <th className="py-2.5 px-3">Publish Used</th>
                <th className="py-2.5 px-3 text-right">Horizon</th>
                {includeActuals && (
                  <>
                    <th className="py-2.5 px-3 text-right text-emerald-400">Actual (MW)</th>
                    <th className="py-2.5 px-3 text-right">Imbalance Error</th>
                  </>
                )}
                <th className="py-2.5 px-3 text-center">Trajectory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2742]/50 font-mono">
              {filteredPoints.map((p) => {
                const isSelected = selectedTargetTime === p.startTime
                return (
                  <tr
                    key={p.startTime}
                    onClick={() => setSelectedTargetTime(p.startTime)}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/50 text-white border-l-4 border-cyan-400'
                        : 'hover:bg-[#16223d]/60 text-slate-300'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-white">{p.settlementPeriod}</td>
                    <td className="py-2 px-3">{formatTimeUK(p.startTime)}</td>
                    <td className="py-2 px-3 text-right font-bold text-amber-400">
                      {formatMW(p.forecast_mw)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      {formatMWh(p.forecast_energy_mwh)}
                    </td>
                    <td className="py-2 px-3 text-right text-indigo-300">
                      {formatMW(p.risk_p10_mw)}
                    </td>
                    <td className="py-2 px-3 text-right text-indigo-300">
                      {formatMW(p.risk_p90_mw)}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {formatTimeUK(p.publishTime)} UTC
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      {formatHorizon(p.horizon_hours)}
                    </td>
                    {includeActuals && (
                      <>
                        <td className="py-2 px-3 text-right font-bold text-emerald-400">
                          {formatMW(p.actual_mw)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold ${
                            (p.error_mw || 0) > 0 ? 'text-rose-400' : 'text-blue-400'
                          }`}
                        >
                          {(p.error_mw || 0) > 0
                            ? `+${formatMW(p.error_mw)} (Short)`
                            : `${formatMW(p.error_mw)} (Long)`}
                        </td>
                      </>
                    )}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTargetTime(p.startTime)
                        }}
                        className={`text-[10px] px-2.5 py-0.5 rounded-md font-semibold transition-colors ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950'
                            : 'bg-[#1b2742] hover:bg-cyan-900/60 text-cyan-300'
                        }`}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
