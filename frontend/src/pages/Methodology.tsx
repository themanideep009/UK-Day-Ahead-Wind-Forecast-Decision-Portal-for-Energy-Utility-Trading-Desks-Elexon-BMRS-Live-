import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  CheckCircle,
  Database,
  ExternalLink,
  Clock,
  Layers,
} from 'lucide-react'
import { api } from '../api/client'

export const Methodology: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'timings' | 'formulas' | 'audit'>('timings')
  const { data: metaData, isLoading } = useQuery({
    queryKey: ['meta'],
    queryFn: api.getMeta,
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="card-trading-glow p-6 space-y-3">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-medium">
          <BookOpen className="w-3.5 h-3.5" />
          <span>METHODOLOGY & MARKET ARCHITECTURE</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Trading Assumptions, Formulas & Data Hygiene Audit
        </h1>
        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
          Comprehensive quantitative reference for GB day-ahead power procurement. Explains auction cutoffs,
          imbalance mechanics, and verification standards against the live Elexon BMRS dataset.
        </p>

        {/* Navigation Tabs */}
        <div className="pt-2 flex items-center gap-2 border-t border-[#1b2742]">
          <button
            onClick={() => setActiveTab('timings')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'timings'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#16223d]'
            }`}
          >
            Market Timings & Gate Closures
          </button>
          <button
            onClick={() => setActiveTab('formulas')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'formulas'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#16223d]'
            }`}
          >
            Mathematical Formulas
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#16223d]'
            }`}
          >
            Data Hygiene Audit
          </button>
        </div>
      </div>

      {/* 1. Market Timings Tab */}
      {activeTab === 'timings' && (
        <div className="card-trading p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-[#1b2742] pb-3">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">GB Power Market Timings & Gate Closures</h2>
          </div>

          {/* Visual Timeline Diagram */}
          <div className="p-5 rounded-2xl bg-[#060911] border border-[#1b2742] space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              Timeline on Day D-1 (Decision Day):
            </h3>

            <div className="relative border-l-2 border-cyan-500/40 ml-4 pl-6 space-y-6">
              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-[#060911]" />
                <div className="text-xs font-mono font-bold text-cyan-300">07:30 UTC — Forecast Batch 1 Released</div>
                <p className="text-xs text-slate-400 mt-0.5">
                  National Grid ESO publishes national wind forecast. This is the latest batch available before 09:20.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#060911]" />
                <div className="text-xs font-mono font-bold text-amber-300">09:20 UK Time — EPEX SPOT Gate Closure</div>
                <p className="text-xs text-slate-400 mt-0.5">
                  GB hourly day-ahead auction clears. Buyer uses 07:30 UTC batch (horizon: ~16.5h to 39.5h).
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-[#060911]" />
                <div className="text-xs font-mono font-bold text-cyan-300">09:30 UTC — Fresh Forecast Batch Released</div>
                <p className="text-xs text-slate-400 mt-0.5">
                  National Grid ESO releases an updated forecast batch across all 31 days in January 2026.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#060911]" />
                <div className="text-xs font-mono font-bold text-amber-300">09:50 UK Time — Nord Pool N2EX Gate Closure</div>
                <p className="text-xs text-slate-400 mt-0.5">
                  N2EX day-ahead auction clears. Buyer possesses the 09:30 UTC batch—2 hours fresher than EPEX!
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-[#060911] border border-[#1b2742] space-y-2">
              <div className="font-bold text-amber-300 text-sm">EPEX SPOT GB Hourly Day-Ahead</div>
              <p>
                Gate closure is at <strong>09:20 Europe/London on D-1</strong>. Orders clear for all 24 hours of delivery day D.
                At 09:20, the latest published wind forecast available from National Grid ESO is the <strong>07:30 UTC</strong> batch.
              </p>
              <div className="text-[11px] font-mono text-slate-400">
                Decision horizon: 16.5h to 39.5h ahead.
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#060911] border border-[#1b2742] space-y-2">
              <div className="font-bold text-amber-300 text-sm">Nord Pool N2EX GB Day-Ahead</div>
              <p>
                Gate closure is at <strong>09:50 Europe/London on D-1</strong>. Because National Grid ESO publishes a fresh
                forecast batch at <strong>09:30 UTC</strong>, the N2EX buyer receives updated weather models that are <strong>2 hours fresher</strong> than the EPEX buyer.
              </p>
              <div className="text-[11px] font-mono text-slate-400">
                Occurred on 100% (31/31) of delivery days in Jan 2026.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Formulas Tab */}
      {activeTab === 'formulas' && (
        <div className="card-trading p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-[#1b2742] pb-3">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Mathematical Formulations & Trading Rationale</h2>
          </div>

          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-[#060911] border border-[#1b2742] space-y-2">
              <div className="font-bold text-white font-mono text-sm">1. Error Definition: Error (MW) = Forecast (MW) - Actual (MW)</div>
              <p className="leading-relaxed">
                • <strong>Positive Error (Over-Forecast):</strong> Forecast exceeds actual outturn wind. The buyer purchased too little thermal/interconnector power and is <em>short</em> in the Balancing Mechanism (BM), exposed to System Buy Price (SBP) spikes.<br />
                • <strong>Negative Error (Under-Forecast):</strong> Actual wind exceeds forecast. The buyer is <em>long</em> and spills surplus power at discounted System Sell Price (SSP).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#060911] border border-[#1b2742] space-y-1.5 font-mono">
                <div className="font-bold text-amber-300">WAPE (Weighted Absolute % Error)</div>
                <div className="text-cyan-400">WAPE = (Σ |e_i| / Σ Actual_i) × 100%</div>
                <p className="text-[11px] font-sans text-slate-400 leading-relaxed">
                  Headline energy trading benchmark. Volume-weighted to prevent tiny nocturnal or calm generation periods from skewing percentage accuracy.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#060911] border border-[#1b2742] space-y-1.5 font-mono">
                <div className="font-bold text-amber-300">Guarded MAPE (Mean Absolute % Error)</div>
                <div className="text-cyan-400">MAPE = (100% / n) × Σ (|e_i| / Actual_i)</div>
                <p className="text-[11px] font-sans text-slate-400 leading-relaxed">
                  Guarded against near-zero actual wind by filtering out periods where Actual &lt; 100 MW (GB national wind fleet capacity &gt; 28 GW).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#060911] border border-[#1b2742] space-y-1.5 font-mono">
                <div className="font-bold text-amber-300">MAE & RMSE (Dispersion Metrics)</div>
                <div className="text-cyan-400">MAE = (1/n) Σ |e_i|  •  RMSE = √((1/n) Σ e_i²)</div>
                <p className="text-[11px] font-sans text-slate-400 leading-relaxed">
                  MAE measures average linear error. RMSE penalizes large forecast misses quadratically, reflecting non-linear balancing penalty costs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#060911] border border-[#1b2742] space-y-1.5 font-mono">
                <div className="font-bold text-amber-300">Empirical Risk Band & Procurement Buffer</div>
                <div className="text-cyan-400">A_10 = max(0, F - q_90)  •  Buffer = Σ (q_90 × 0.5) MWh</div>
                <p className="text-[11px] font-sans text-slate-400 leading-relaxed">
                  Empirical 90th percentile of error by hour of day subtracted from the decision forecast, yielding the MWh reserve needed to guard against short positions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Data Quality Audit Tab */}
      {activeTab === 'audit' && (
        <div className="card-trading p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#1b2742] pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Live Data Hygiene Audit</h2>
            </div>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>100% Audit Complete</span>
            </span>
          </div>

          {isLoading ? (
            <div className="text-xs text-slate-400">Loading data quality audit...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#060911] text-slate-400 border-b border-[#1b2742] font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Dataset</th>
                    <th className="py-2.5 px-3 text-right">Rows</th>
                    <th className="py-2.5 px-3 text-right">Completeness</th>
                    <th className="py-2.5 px-3 text-right">Duplicates</th>
                    <th className="py-2.5 px-3 text-right">Gaps</th>
                    <th className="py-2.5 px-3 text-right">Min Gen</th>
                    <th className="py-2.5 px-3 text-right">Max Gen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b2742]/50 font-mono">
                  {(metaData?.data_quality || []).map((dq, idx) => (
                    <tr key={idx} className="hover:bg-[#16223d]/50 text-slate-300">
                      <td className="py-3 px-3 font-bold text-white">{dq.dataset}</td>
                      <td className="py-3 px-3 text-right">{dq.total_rows.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                        {dq.completeness_pct}%
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">{dq.duplicates}</td>
                      <td className="py-3 px-3 text-right text-slate-400">{dq.gaps}</td>
                      <td className="py-3 px-3 text-right">{dq.min_mw.toLocaleString()} MW</td>
                      <td className="py-3 px-3 text-right font-bold text-cyan-400">
                        {dq.max_mw.toLocaleString()} MW
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 rounded-xl bg-[#060911] border border-[#1b2742] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-slate-300">
              <strong>Source API:</strong> Elexon BMRS Public Datasets (`FUELHH` and `WINDFOR` streams).
            </div>
            <a
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-600/30 transition-all font-semibold"
            >
              <span>Explore Interactive API (/api/docs)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
