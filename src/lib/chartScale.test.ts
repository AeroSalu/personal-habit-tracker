import { describe, expect, it } from 'vitest'
import { minuteTicks, tickLabel } from './chartScale'

describe('minuteTicks', () => {
  it('rounds up to a clean top with at most 5 ticks', () => {
    expect(minuteTicks(50)).toEqual([0, 15, 30, 45, 60])
    expect(minuteTicks(100)).toEqual([0, 30, 60, 90, 120])
    expect(minuteTicks(200)).toEqual([0, 60, 120, 180, 240])
    expect(minuteTicks(7)).toEqual([0, 5, 10])
    for (const max of [1, 13, 59, 61, 240, 999, 5000]) {
      const t = minuteTicks(max)
      expect(t[t.length - 1]).toBeGreaterThanOrEqual(max)
      expect(t.length).toBeLessThanOrEqual(5)
    }
  })

  it('has a sensible empty axis', () => {
    expect(minuteTicks(0)).toEqual([0, 15, 30])
  })

  it('labels ticks compactly', () => {
    expect(tickLabel(45)).toBe('45m')
    expect(tickLabel(60)).toBe('1h')
    expect(tickLabel(90)).toBe('1.5h')
  })
})
