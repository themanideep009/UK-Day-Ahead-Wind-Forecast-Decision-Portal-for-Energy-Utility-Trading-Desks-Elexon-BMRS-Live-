import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  badge?: string
  badgeColor?: 'cyan' | 'amber' | 'emerald' | 'rose' | 'indigo'
  icon?: LucideIcon
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  badgeColor = 'cyan',
  icon: Icon,
}) => {
  const badgeClasses = {
    cyan: 'bg-cyan-950 text-cyan-400 border-cyan-800',
    amber: 'bg-amber-950 text-amber-400 border-amber-800',
    emerald: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    rose: 'bg-rose-950 text-rose-400 border-rose-800',
    indigo: 'bg-indigo-950 text-indigo-400 border-indigo-800',
  }

  return (
    <div className="card-trading p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">{title}</span>
        {Icon && <Icon className="w-4 h-4 text-slate-500" />}
      </div>
      <div className="flex items-baseline justify-between gap-2 mt-1">
        <span className="kpi-stat-value">{value}</span>
        {badge && (
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badgeClasses[badgeColor]}`}
          >
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-400 mt-2 truncate">{subtitle}</p>}
    </div>
  )
}
