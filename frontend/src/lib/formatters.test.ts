import { describe, it, expect } from 'vitest'
import { formatMW, formatMWh, formatPercent, formatHorizon } from './formatters'

describe('Frontend Formatters', () => {
  it('formats MW values correctly', () => {
    expect(formatMW(1234.56)).toBe('1,235 MW')
    expect(formatMW(0)).toBe('0 MW')
    expect(formatMW(null)).toBe('—')
    expect(formatMW(undefined)).toBe('—')
  })

  it('formats MWh values correctly', () => {
    expect(formatMWh(50000)).toBe('50,000 MWh')
    expect(formatMWh(null)).toBe('—')
  })

  it('formats percentage values correctly', () => {
    expect(formatPercent(12.345, 1)).toBe('12.3%')
    expect(formatPercent(12.345, 2)).toBe('12.35%')
    expect(formatPercent(null)).toBe('—')
  })

  it('formats horizon hours correctly', () => {
    expect(formatHorizon(14.5)).toBe('14.5h')
    expect(formatHorizon(null)).toBe('—')
  })
})
