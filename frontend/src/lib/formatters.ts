import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMW(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return `${Math.round(val).toLocaleString()} MW`
}

export function formatMWh(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return `${Math.round(val).toLocaleString()} MWh`
}

export function formatPercent(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return `${val.toFixed(decimals)}%`
}

export function formatTimeUK(isoString: string): string {
  if (!isoString) return '—'
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
    hour12: false
  })
}

export function formatDateUK(isoString: string): string {
  if (!isoString) return '—'
  const date = new Date(isoString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/London'
  })
}

export function formatHorizon(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || isNaN(hours)) return '—'
  return `${hours.toFixed(1)}h`
}
