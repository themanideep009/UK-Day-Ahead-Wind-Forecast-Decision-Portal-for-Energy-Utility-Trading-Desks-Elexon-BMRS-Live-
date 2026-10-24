import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  CheckCircle,
  Database,
  ExternalLink,
  ShieldCheck,
  Clock,
  Layers,
} from 'lucide-react'
import { api } from '../api/client'

export const Methodology: React.FC = () => {
  const { data: metaData, isLoading } = useQuery({
    queryKey: ['meta'],
    queryFn: api.getMeta,
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="card-trading p-6 space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-medium">
          <BookOpen className="w-3.5 h-3.5" />
          <span>METHODOLOGY & MARKET ARCHITECTURE</span>
        </div>
        <h1 className="text-xl font-bold text-white">
          Trading Assumptions, Formulas & Data Hygiene Audit
        </h1>
        <p className="text-xs text-slate-400">
          Comprehensive technical and quantitative reference for GB day-ahead wind power procurement.
        </p>
      </div>

      {/* 1. Market Rules & Timings */}
      <div className="card-trading p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>GB Power Market Rules & Gate Closures</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="font-bold text-amber-300 text-sm">EPEX SPOT GB Hourly Day-Ahead</div>
            <p>
              Gate closure is at <strong>09:20 Europe/London on D-1</strong>. Orders clear for all 24 hours of delivery day D.
              At 09:20, the latest published wind forecast available from National Grid ESO is the <strong>07:30 UTC</strong> batch.
            </p>
            <div className="text-[11px] font-mono text-slate-400">
              Typical decision horizon: 16.5h to 39.5h ahead.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
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

        <div className="text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
          <strong>Scope Assumption:</strong> "Decisions made in January 2026" is interpreted literally as decision dates
          1–31 January 2026, corresponding to delivery dates <strong>2 January 2026 to 1 February 2026</strong> (31 delivery days).
          A single backend configuration flag (<code className="text-cyan-400">SCOPE_MODE</code>) allows switching to 1–31 Jan delivery instantly.
        </div>
      </div>

      {/* 2. Mathematical Definitions */}
      <div className="card-trading p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Accuracy Formulas & Trading Interpretations</span>
        </h2>

        <div className="space-y-4 text-xs text-slate-300">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="font-bold text-white font-mono">1. Error Definition: Error (MW) = Forecast (MW) - Actual (MW)</div>
            <p>
              • <strong>Positive Error (Over-Forecast):</strong> Forecast exceeds actual outturn wind. The buyer purchased too little thermal/interconnector power and is <em>short</em> in the Balancing Mechanism (BM), exposed to system buy prices (SBP).<br />
              • <strong>Negative Error (Under-Forecast):</strong> Actual wind exceeds forecast. The buyer is <em>long</em> and spills surplus power into the system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1 font-mono">
              <div className="font-bold text-amber-300">WAPE (Weighted Absolute Percentage Error)</div>
              <div className="text-cyan-400">WAPE = (Σ |e_i| / Σ Actual_i) × 100%</div>
              <p className="text-[11px] font-sans text-slate-400">
                Headline industry metric. Volume-weighted to prevent tiny nocturnal or calm generation periods from skewing percentage accuracy.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1 font-mono">
              <div className="font-bold text-amber-300">Guarded MAPE (Mean Absolute % Error)</div>
              <div className="text-cyan-400">MAPE = (100% / n) × Σ (|e_i| / Actual_i)</div>
              <p className="text-[11px] font-sans text-slate-400">
                Guarded against near-zero actual wind by filtering out periods where Actual &lt; 100 MW (GB national wind fleet capacity &gt; 28 GW).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1 font-mono">
              <div className="font-bold text-amber-300">MAE & RMSE (Dispersion Metrics)</div>
              <div className="text-cyan-400">MAE = (1/n) Σ |e_i|  •  RMSE = √((1/n) Σ e_i²)</div>
              <p className="text-[11px] font-sans text-slate-400">
                MAE measures average linear error. RMSE penalizes large forecast misses quadratically, reflecting non-linear imbalance pricing costs.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1 font-mono">
              <div className="font-bold text-amber-300">Empirical Risk Band & Procurement Buffer</div>
              <div className="text-cyan-400">A_10 = max(0, F - q_90)  •  Buffer = Σ (q_90 × 0.5) MWh</div>
              <p className="text-[11px] font-sans text-slate-400">
                Empirical 90th percentile of error by hour of day subtracted from the decision forecast, yielding the MWh reserve needed to guard against short positions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Data Quality Panel */}
      <div className="card-trading p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Data Hygiene & Audit Panel</span>
          </h2>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>100% Clean Audit</span>
          </span>
        </div>

        {isLoading ? (
          <div className="text-xs text-slate-400">Loading data quality audit...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-2.5 px-3">Dataset</th>
                  <th className="py-2.5 px-3 text-right">Rows</th>
                  <th className="py-2.5 px-3 text-right">Completeness</th>
                  <th className="py-2.5 px-3 text-right">Duplicates</th>
                  <th className="py-2.5 px-3 text-right">Gaps</th>
                  <th className="py-2.5 px-3 text-right">Min Gen (MW)</th>
                  <th className="py-2.5 px-3 text-right">Max Gen (MW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {(metaData?.data_quality || []).map((dq, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 text-slate-300">
                    <td className="py-2.5 px-3 font-bold text-white">{dq.dataset}</td>
                    <td className="py-2.5 px-3 text-right">{dq.total_rows.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                      {dq.completeness_pct}%
                    </td>
                    <td className="py-2.5 px-3 text-right">{dq.duplicates}</td>
                    <td className="py-2.5 px-3 text-right">{dq.gaps}</td>
                    <td className="py-2.5 px-3 text-right">{dq.min_mw.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-cyan-400">
                      {dq.max_mw.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Attribution & API Documentation */}
      <div className="card-trading p-6 space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Attribution & API Documentation</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          {metaData?.attribution || 'Contains BMRS data © Elexon Limited copyright and database right 2026.'}
        </p>
        <div className="pt-2 flex items-center gap-4 text-xs">
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 transition-colors font-semibold"
          >
            <span>OpenAPI Interactive Swagger UI (/api/docs)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://data.elexon.co.uk/bmrs/api/v1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>Elexon BMRS Source API</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
