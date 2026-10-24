import React from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { Wind, Clock, Calendar, BarChart3, ShieldCheck, Compass, Info } from 'lucide-react'

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

  return (
    <header className="sticky top-0 z-50 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Wind className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>GB Wind Decision Portal</span>
                <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Day-Ahead Desk
                </span>
              </div>
              <p className="text-xs text-slate-400">National Grid ESO • Elexon BMRS</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <NavLink
                  key={link.label}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </NavLink>
              )
            })}
          </nav>

          {/* Global Controls: Delivery Date & Cutoff */}
          <div className="flex items-center gap-3">
            {/* Delivery Date Picker */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 hidden sm:inline">Delivery:</span>
              <input
                type="date"
                value={deliveryDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              />
            </div>

            {/* Cutoff Selector */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400 ml-1.5 mr-0.5 hidden sm:inline" />
              <button
                onClick={() => setCutoff('09:20')}
                className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all ${
                  cutoff === '09:20'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="EPEX SPOT GB Gate Closure (09:20 UK Time)"
              >
                09:20 EPEX
              </button>
              <button
                onClick={() => setCutoff('09:50')}
                className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all ${
                  cutoff === '09:50'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Nord Pool N2EX Gate Closure (09:50 UK Time)"
              >
                09:50 N2EX
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800/60">
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className={({ isActive }) =>
                `text-xs font-medium py-1 px-2 rounded ${
                  isActive ? 'text-cyan-400 font-bold' : 'text-slate-400'
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
