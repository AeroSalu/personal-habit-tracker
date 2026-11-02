import { describe, expect, it } from 'vitest'
import { firstName, formatMinutes, profileError, toProfile } from './profile'

describe('profileError', () => {
  const ok = { displayName: 'Aryan', dailyFocusGoalMinutes: 120 }

  it('accepts a normal profile', () => {
    expect(profileError(ok)).toBe('')
  })

  it('needs a name', () => {
    expect(profileError({ ...ok, displayName: '   ' })).not.toBe('')
    expect(profileError({ ...ok, displayName: 'x'.repeat(41) })).not.toBe('')
  })

  it('keeps the focus goal between 15 minutes and 16 hours', () => {
    expect(profileError({ ...ok, dailyFocusGoalMinutes: 14 })).not.toBe('')
    expect(profileError({ ...ok, dailyFocusGoalMinutes: 15 })).toBe('')
    expect(profileError({ ...ok, dailyFocusGoalMinutes: 961 })).not.toBe('')
    expect(profileError({ ...ok, dailyFocusGoalMinutes: 90.5 })).not.toBe('')
    expect(profileError({ ...ok, dailyFocusGoalMinutes: Number.NaN })).not.toBe('')
  })
})

describe('formatMinutes', () => {
  it('formats hours and minutes', () => {
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(90)).toBe('1h 30m')
    expect(formatMinutes(0)).toBe('0m')
  })
})

describe('toProfile', () => {
  it('fills missing fields', () => {
    expect(toProfile({})).toEqual({ displayName: '', dailyFocusGoalMinutes: 120, createdAt: '' })
    expect(toProfile({ displayName: 'A', dailyFocusGoalMinutes: 60, createdAt: 'x' }).dailyFocusGoalMinutes).toBe(60)
  })

  it('ignores wrongly typed fields', () => {
    expect(toProfile({ displayName: 5, dailyFocusGoalMinutes: '60' }).dailyFocusGoalMinutes).toBe(120)
  })
})

describe('firstName', () => {
  it('takes the first word', () => {
    expect(firstName(toProfile({ displayName: '  Aryan Salunkhe ' }))).toBe('Aryan')
  })
})
