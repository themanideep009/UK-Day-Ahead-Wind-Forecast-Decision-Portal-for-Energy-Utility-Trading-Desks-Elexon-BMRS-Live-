import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  badge?: string
  badgeColor?: 'cyan' | 'amber' | 'emerald' | 'rose' | 'indigo'
  icon?: LucideIcon
  highlight?: boolean
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  badgeColor = 'cyan',
  icon: Icon,
  highlight = false,
}) => {
  const badgeClasses = {
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60 shadow-cyan-900/20',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-700/60 shadow-amber-900/20',
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-emerald-900/20',
    rose: 'bg-rose-950/80 text-rose-300 border-rose-700/60 shadow-rose-900/20',
    indigo: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60 shadow-indigo-900/20',
  }

  const topGradients = {
    cyan: 'from-cyan-500/80 to-transparent',
    amber: 'from-amber-500/80 to-transparent',
    emerald: 'from-emerald-500/80 to-transparent',
    rose: 'from-rose-500/80 to-transparent',
    indigo: 'from-indigo-500/80 to-transparent',
  }

  return (
    <div
      className={`card-trading p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group ${
        highlight ? 'ring-1 ring-cyan-500/40 bg-[#0e1628]' : ''
      }`}
    >
      {/* Subtle glowing accent top border */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${topGradients[badgeColor]} opacity-70 group-hover:opacity-100 transition-opacity`}
      />

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
            {title}
          </span>
          {Icon && (
            <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-300 group-hover:text-cyan-400 transition-colors">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2 mt-1">
          <span className="kpi-stat-value font-mono tracking-tight">{value}</span>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-[#1b2742]/60 flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400 truncate">{subtitle || '—'}</p>
        {badge && (
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border shadow-sm shrink-0 ${badgeClasses[badgeColor]}`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}
