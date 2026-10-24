import React from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import {
  Wind,
  Clock,
  Calendar,
  BarChart3,
  ShieldCheck,
  Compass,
  Info,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react'

interface NavbarProps {
  cutoff: string
  setCutoff: (c: string) => void
  deliveryDate: string
  setDeliveryDate: (d: string) => void
  minDate: string
  maxDate: string
}

export const Navbar: React.FC<NavbarProps> = ({
  cutoff,
  setCutoff,
  deliveryDate,
  setDeliveryDate,
  minDate,
  maxDate,
}) => {
  const [searchParams] = useSearchParams()

  const navLinks = [
    { to: `/?${searchParams.toString()}`, label: 'Overview', icon: BarChart3 },
    { to: `/decision?${searchParams.toString()}`, label: 'Decision Desk', icon: Compass },
    { to: `/accuracy?${searchParams.toString()}`, label: 'Forecast Accuracy', icon: ShieldCheck },
    { to: `/methodology?${searchParams.toString()}`, label: 'Methodology & Data', icon: Info },
  ]

  const handleDayStep = (deltaDays: number) => {
    const current = new Date(deliveryDate)
    current.setDate(current.getDate() + deltaDays)
    const newStr = current.toISOString().slice(0, 10)
    if (newStr >= minDate && newStr <= maxDate) {
      setDeliveryDate(newStr)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-[#060911]/90 backdrop-blur-xl border-b border-[#1b2742]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand with Live Beacon */}
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform duration-200">
                <Wind className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#060911] animate-pulse" title="Live BMRS Data Synced" />
            </div>

            <div>
              <div className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>GB Wind Decision Portal</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 shadow-sm">
                  <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                  Day-Ahead Desk
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">National Grid ESO • Elexon BMRS Live</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#0b101d]/90 p-1.5 rounded-xl border border-[#1b2742] shadow-inner">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <NavLink
                  key={link.label}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#16223d]/50'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </NavLink>
              )
            })}
          </nav>

          {/* Global Interactive Controls: Day Stepper & Cutoff Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Delivery Date Stepper */}
            <div className="flex items-center bg-[#0b101d] border border-[#1b2742] rounded-xl p-1 shadow-sm">
              <button
                onClick={() => handleDayStep(-1)}
                disabled={deliveryDate <= minDate}
                className="p-1 rounded-lg hover:bg-[#16223d] text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Previous Delivery Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1.5 text-xs text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-cyan-400 hidden sm:inline" />
                <input
                  type="date"
                  value={deliveryDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs font-medium focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={() => handleDayStep(1)}
                disabled={deliveryDate >= maxDate}
                className="p-1 rounded-lg hover:bg-[#16223d] text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Next Delivery Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Cutoff Selector with Active Pill Indicator */}
            <div className="flex items-center gap-1 bg-[#0b101d] border border-[#1b2742] rounded-xl p-1 text-xs shadow-sm">
              <Clock className="w-3.5 h-3.5 text-amber-400 ml-1.5 mr-0.5 hidden sm:inline" />
              <button
                onClick={() => setCutoff('09:20')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  cutoff === '09:20'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="EPEX SPOT GB Gate Closure (09:20 Europe/London on D-1)"
              >
                09:20 EPEX
              </button>
              <button
                onClick={() => setCutoff('09:50')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  cutoff === '09:50'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Nord Pool N2EX Gate Closure (09:50 Europe/London on D-1)"
              >
                09:50 N2EX
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-[#1b2742]/80">
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className={({ isActive }) =>
                `text-xs font-semibold py-1 px-2.5 rounded-lg transition-colors ${
                  isActive ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800' : 'text-slate-400'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  )
}
