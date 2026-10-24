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
  const [selectedTargetTime, setSelectedTargetTime] = useState<string | null>(null)
  const [customCutoffInput, setCustomCutoffInput] = useState('')

  const { data: decisionData, isLoading } = useQuery({
    queryKey: ['decision', deliveryDate, cutoff, includeActuals],
    queryFn: () => api.getDecisionDesk(deliveryDate, cutoff, includeActuals),
  })

  // Evolution query for selected target time
  const { data: evolutionData, isLoading: loadingEvolution } = useQuery({
    queryKey: ['evolution', selectedTargetTime, cutoff],
    queryFn: () => (selectedTargetTime ? api.getEvolution(selectedTargetTime, cutoff) : null),
    enabled: !!selectedTargetTime,
  })

  const summary = decisionData?.summary
  const points = decisionData?.points || []

  // Default selected target time to period 25 (12:00) if none selected
  React.useEffect(() => {
    if (!selectedTargetTime && points.length > 24) {
      setSelectedTargetTime(points[24].startTime)
    }
  }, [points, selectedTargetTime])

  const chartData = points.map((p) => ({
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

  const handleCustomCutoffSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (/^\d{2}:\d{2}$/.test(customCutoffInput)) {
      setCutoff(customCutoffInput)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Controls & Decision Context */}
      <div className="card-trading p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>D-1 AUCTION GATE CLOSURE DECISION</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              Decision Desk: What Was Known at Gate Closure
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly filtered to forecasts published on or before the cutoff on D-1 ({decisionData?.decision_date || '—'}).
              Zero look-ahead guaranteed.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Cutoff Selector & Custom Input */}
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

              <form onSubmit={handleCustomCutoffSubmit} className="flex items-center pl-1">
                <input
                  type="text"
                  placeholder="HH:MM"
                  value={customCutoffInput}
                  onChange={(e) => setCustomCutoffInput(e.target.value)}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </form>
            </div>

            {/* Back-Test Reveal Toggle */}
            <button
              onClick={() => setIncludeActuals(!includeActuals)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                includeActuals
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {includeActuals ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{includeActuals ? 'Actuals Revealed (Back-Test)' : 'Reveal Actuals (Back-Test)'}</span>
            </button>
          </div>
        </div>

        {/* Risk Buffer Card */}
        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Daily Procurement Risk Buffer:</span>
                <span className="font-mono text-indigo-300 font-bold">
                  {formatMWh(summary?.daily_buffer_p10_mwh)}
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                To be approximately <strong>90% confident</strong> of not being short on delivery day {formatDateUK(deliveryDate)},
                the procurement desk should plan for {formatMWh(summary?.daily_buffer_p10_mwh)} less wind than the central forecast.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Horizon Range:</span>
            <span className="text-slate-200">
              {formatHorizon(summary?.min_horizon_hours)} – {formatHorizon(summary?.max_horizon_hours)}
            </span>
          </div>
        </div>
      </div>

      {/* 48-Point Main Chart */}
      <div className="card-trading p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            48 Settlement Periods Profile ({formatDateUK(deliveryDate)})
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Latest publish used: {summary?.latest_publish_used ? `${formatTimeUK(summary.latest_publish_used)} UTC` : '—'}
          </span>
        </div>

        <div className="h-[360px] w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">
              Loading 48 half-hour decision points...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} interval={3} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  unit=" MW"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl space-y-1">
                          <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between gap-4">
                            <span>Period {data.period} ({data.time} UK)</span>
                            <span className="text-slate-400 font-mono">Horizon: {formatHorizon(data.horizon)}</span>
                          </div>
                          <div className="text-amber-400 font-mono flex justify-between gap-4">
                            <span>As-Of Forecast:</span>
                            <span>{formatMW(data.forecast)}</span>
                          </div>
                          <div className="text-indigo-300 font-mono flex justify-between gap-4">
                            <span>P10 Wind Lower Bound:</span>
                            <span>{formatMW(data.p10_risk)}</span>
                          </div>
                          <div className="text-indigo-300 font-mono flex justify-between gap-4">
                            <span>P90 Wind Upper Bound:</span>
                            <span>{formatMW(data.p90_risk)}</span>
                          </div>
                          {data.actual !== null && data.actual !== undefined && (
                            <div className="text-emerald-400 font-mono flex justify-between gap-4 border-t border-slate-800 pt-1">
                              <span>Outturn Actual:</span>
                              <span>{formatMW(data.actual)}</span>
                            </div>
                          )}
                          {data.error !== null && data.error !== undefined && (
                            <div className={`font-mono flex justify-between gap-4 ${
                              data.error > 0 ? 'text-rose-400' : 'text-cyan-400'
                            }`}>
                              <span>Error (F - A):</span>
                              <span>{data.error > 0 ? `+${formatMW(data.error)} (Short)` : `${formatMW(data.error)} (Long)`}</span>
                            </div>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend verticalAlign="top" align="right" height={30} iconSize={8} wrapperStyle={{ fontSize: '11px' }} />

                <Area type="monotone" dataKey="p90_risk" stroke="none" fill="#6366f1" fillOpacity={0.12} name="Risk Band (P10–P90)" />
                <Area type="monotone" dataKey="p10_risk" stroke="#818cf8" strokeDasharray="4 4" strokeWidth={1.5} fill="none" name="P10 Lower Bound" />
                <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="As-Of Forecast (MW)" />
                {includeActuals && (
                  <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={false} name="Outturn Actual (MW)" />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Forecast Evolution Explorer Drawer / Section */}
      {selectedTargetTime && (
        <div className="card-trading p-6 space-y-4 border-cyan-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-base font-bold text-white">
                  Forecast Evolution Explorer: Target Half-Hour {formatTimeUK(selectedTargetTime)} UK
                </h3>
                <p className="text-xs text-slate-400">
                  Tracing every forecast vintage published for this target from 72h out to real-time delivery
                </p>
              </div>
            </div>

            {evolutionData && (
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
                  <span className="text-slate-400">Cutoff Forecast: </span>
                  <span className="text-amber-400 font-bold">{formatMW(evolutionData.asof_forecast_mw)}</span>
                </div>
                <div className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
                  <span className="text-slate-400">Final Pre-Delivery: </span>
                  <span className="text-cyan-400 font-bold">{formatMW(evolutionData.final_forecast_mw)}</span>
                </div>
                <div className={`px-2.5 py-1 rounded border font-bold ${
                  evolutionData.revision_mw > 0 ? 'bg-amber-950/40 border-amber-800 text-amber-300' : 'bg-cyan-950/40 border-cyan-800 text-cyan-300'
                }`}>
                  <span>Revision: {evolutionData.revision_mw > 0 ? `+${evolutionData.revision_mw}` : evolutionData.revision_mw} MW</span>
                </div>
              </div>
            )}
          </div>

          {/* Evolution Chart */}
          <div className="h-[240px] w-full">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="publish" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={11} unit=" MW" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded p-2.5 text-xs shadow-xl space-y-1">
                            <div className="font-bold text-white flex justify-between gap-4">
                              <span>Published: {d.publish}</span>
                              <span className="text-slate-400">Horizon: {formatHorizon(d.horizon)}</span>
                            </div>
                            <div className="text-amber-400 font-mono">Forecast: {formatMW(d.forecast)}</div>
                            {d.is_asof && <div className="text-cyan-400 font-bold">★ Decision Cutoff Vintage</div>}
                            {d.actual !== null && d.actual !== undefined && (
                              <div className="text-emerald-400 font-mono">Actual: {formatMW(d.actual)}</div>
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
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      if (payload.is_asof) {
                        return (
                          <circle
                            key={`asof-${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill="#f59e0b"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        )
                      }
                      return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#06b6d4" />
                    }}
                    name="Forecast Evolution (MW)"
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

      {/* 48-Point Detailed Data Table */}
      <div className="card-trading overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">48 Settlement Half-Hours Data Table</h3>
          <span className="text-xs text-slate-400 font-mono">
            Click any row to inspect vintage evolution
          </span>
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-2.5 px-3">Period</th>
                <th className="py-2.5 px-3">Start (UK)</th>
                <th className="py-2.5 px-3 text-right">Forecast (MW)</th>
                <th className="py-2.5 px-3 text-right">Energy (MWh)</th>
                <th className="py-2.5 px-3 text-right">P10 Bound</th>
                <th className="py-2.5 px-3 text-right">P90 Bound</th>
                <th className="py-2.5 px-3">Publish Used</th>
                <th className="py-2.5 px-3 text-right">Horizon</th>
                {includeActuals && (
                  <>
                    <th className="py-2.5 px-3 text-right text-emerald-400">Actual (MW)</th>
                    <th className="py-2.5 px-3 text-right">Error (MW)</th>
                  </>
                )}
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {points.map((p) => {
                const isSelected = selectedTargetTime === p.startTime
                return (
                  <tr
                    key={p.startTime}
                    onClick={() => setSelectedTargetTime(p.startTime)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/40 text-white'
                        : 'hover:bg-slate-800/40 text-slate-300'
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
                            (p.error_mw || 0) > 0 ? 'text-rose-400' : 'text-cyan-400'
                          }`}
                        >
                          {(p.error_mw || 0) > 0
                            ? `+${formatMW(p.error_mw)}`
                            : formatMW(p.error_mw)}
                        </td>
                      </>
                    )}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTargetTime(p.startTime)
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-900/60 text-cyan-400 transition-colors"
                      >
                        Explore
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
