import { describe, expect, it } from 'vitest'
import { addDays, clock, daysBetween, span, weekStart } from './dates'

// 2026-11-02 is a Monday.
describe('dates', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('starts weeks on Monday', () => {
    expect(weekStart('2026-11-02')).toBe('2026-11-02')
    expect(weekStart('2026-11-08')).toBe('2026-11-02')
    expect(weekStart('2026-11-09')).toBe('2026-11-09')
  })

  it('counts days between keys', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3)
    expect(daysBetween('2026-11-02', '2026-11-02')).toBe(0)
  })

  it('formats clock times and spans', () => {
    expect(clock(0)).toBe('12:00 AM')
    expect(clock(12 * 60)).toBe('12:00 PM')
    expect(clock(13 * 60 + 5)).toBe('1:05 PM')
    expect(span(45)).toBe('45 min')
    expect(span(60)).toBe('1 hr')
    expect(span(78)).toBe('1 hr 18 min')
  })
})
