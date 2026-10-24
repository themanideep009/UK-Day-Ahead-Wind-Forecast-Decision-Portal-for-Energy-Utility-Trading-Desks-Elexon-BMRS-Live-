import React from 'react'
import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'
import type { InsightCallout } from '../api/client'

export const InsightCard: React.FC<{ insight: InsightCallout }> = ({ insight }) => {
  const getIcon = () => {
    switch (insight.level) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      default:
        return <TrendingUp className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
    }
  }

  const getBorderColor = () => {
    switch (insight.level) {
      case 'warning':
        return 'border-amber-500/30 bg-amber-950/10'
      case 'success':
        return 'border-emerald-500/30 bg-emerald-950/10'
      default:
        return 'border-cyan-500/30 bg-cyan-950/10'
    }
  }

  return (
    <div className={`p-4 rounded-xl border ${getBorderColor()} flex items-start gap-3 backdrop-blur-sm`}>
      {getIcon()}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            {insight.category}
          </span>
        </div>
        <h4 className="text-sm font-semibold text-white">{insight.title}</h4>
        <p className="text-xs text-slate-300 leading-relaxed">{insight.text}</p>
      </div>
    </div>
  )
}
