import { describe, expect, it } from 'vitest'
import {
  averageTime,
  completionRate,
  dayState,
  doneLine,
  habitError,
  isDue,
  isOverdue,
  scheduleLabel,
  streak,
  weekProgress,
  type Habit,
  type HabitLog,
} from './habits'

// 2026-11-02 is a Monday. createdAt is far in the past unless a test says otherwise.
const base: Habit = {
  id: 'h',
  name: 'Gym',
  category: 'fitness',
  schedule: { type: 'days', days: [1] },
  usualTime: '',
  targetNote: '',
  archived: false,
  createdAt: '',
}
const days = (...d: number[]): Habit => ({ ...base, schedule: { type: 'days', days: d } })
const count = (perWeek: number): Habit => ({ ...base, schedule: { type: 'count', perWeek } })
const keys = (...k: string[]) => new Set(k)

describe('isDue', () => {
  it('shows exact-day habits only on their days', () => {
    expect(isDue(days(1, 3, 5), keys(), '2026-11-02')).toBe(true)
    expect(isDue(days(1, 3, 5), keys(), '2026-11-03')).toBe(false)
  })

  it('keeps weekly habits due until the number is reached, except on the day done', () => {
    const h = count(2)
    expect(isDue(h, keys('2026-11-02'), '2026-11-03')).toBe(true)
    expect(isDue(h, keys('2026-11-02', '2026-11-03'), '2026-11-03')).toBe(true)
    expect(isDue(h, keys('2026-11-02', '2026-11-03'), '2026-11-04')).toBe(false)
    expect(isDue(h, keys('2026-11-02', '2026-11-03'), '2026-11-09')).toBe(true)
  })
})

describe('streak', () => {
  it('is zero with no completions', () => {
    expect(streak(days(1), keys(), '2026-11-02')).toEqual({ current: 0, best: 0 })
  })

  it('is not broken by non-scheduled days', () => {
    expect(streak(days(1, 3, 5), keys('2026-11-02', '2026-11-04', '2026-11-06'), '2026-11-08').current).toBe(3)
  })

  it('is not broken by an unfinished today', () => {
    expect(streak(days(1, 3), keys('2026-11-02', '2026-11-04'), '2026-11-09').current).toBe(2)
  })

  it('resets on a missed scheduled day but keeps the best', () => {
    expect(streak(days(1, 3, 5), keys('2026-11-02', '2026-11-04', '2026-11-09'), '2026-11-09')).toEqual({
      current: 1,
      best: 2,
    })
  })

  it('ends once a missed day has passed', () => {
    expect(streak(days(1), keys('2026-11-02'), '2026-11-10').current).toBe(0)
  })

  it('crosses a month end', () => {
    const daily = days(0, 1, 2, 3, 4, 5, 6)
    expect(streak(daily, keys('2026-10-31', '2026-11-01', '2026-11-02'), '2026-11-02').current).toBe(3)
  })

  it('counts weeks reaching the weekly number', () => {
    const done = keys('2026-10-19', '2026-10-20', '2026-10-26', '2026-10-27')
    expect(streak(count(2), done, '2026-11-02').current).toBe(2)
  })

  it('lets the current week extend but never break a weekly streak', () => {
    const done = keys('2026-10-26', '2026-10-27', '2026-11-02', '2026-11-03')
    expect(streak(count(2), done, '2026-11-03').current).toBe(2)
    expect(streak(count(2), keys('2026-10-26', '2026-10-27'), '2026-11-08').current).toBe(1)
  })

  it('resets a weekly streak after a short week', () => {
    expect(streak(count(2), keys('2026-10-19', '2026-10-20', '2026-10-26'), '2026-11-02')).toEqual({
      current: 0,
      best: 1,
    })
  })
})

describe('weekProgress', () => {
  it('counts only scheduled days for exact-day habits', () => {
    expect(weekProgress(days(1, 3), keys('2026-11-02', '2026-11-03'), '2026-11-04')).toEqual({ done: 1, target: 2 })
    expect(weekProgress(count(3), keys('2026-11-02', '2026-10-30'), '2026-11-04')).toEqual({ done: 1, target: 3 })
  })
})

describe('completionRate', () => {
  it('measures scheduled days done since creation', () => {
    const h = { ...days(1, 3), createdAt: new Date(2026, 9, 26, 9).toISOString() }
    // Scheduled before today: Oct 26, Oct 28. Done: Oct 26 only.
    expect(completionRate(h, keys('2026-10-26'), '2026-11-02')).toBe(0.5)
    // Today counts once done.
    expect(completionRate(h, keys('2026-10-26', '2026-11-02'), '2026-11-02')).toBeCloseTo(2 / 3)
  })

  it('uses only the last 30 days', () => {
    const daily = days(0, 1, 2, 3, 4, 5, 6)
    expect(completionRate(daily, keys('2026-01-01'), '2026-11-02')).toBe(0)
  })

  it('scales weekly habits by the length of the window', () => {
    const h = { ...count(7), createdAt: new Date(2026, 9, 27, 9).toISOString() }
    // 7 days in the window, 7 expected, 7 done.
    const done = keys('2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02')
    expect(completionRate(h, done, '2026-11-02')).toBe(1)
  })
})

describe('dayState', () => {
  it('labels days for the habit calendar', () => {
    const h = { ...days(1, 3), createdAt: new Date(2026, 9, 26, 9).toISOString() }
    const done = keys('2026-10-26')
    expect(dayState(h, done, '2026-10-26', '2026-11-02')).toBe('done')
    expect(dayState(h, done, '2026-10-28', '2026-11-02')).toBe('missed')
    expect(dayState(h, done, '2026-10-27', '2026-11-02')).toBe('off')
    expect(dayState(h, done, '2026-10-19', '2026-11-02')).toBe('off')
    expect(dayState(h, done, '2026-11-02', '2026-11-02')).toBe('due')
    expect(dayState(h, done, '2026-11-04', '2026-11-02')).toBe('future')
  })
})

describe('doneLine', () => {
  const at = new Date(2026, 10, 2, 17, 48)
  it('compares with the usual time', () => {
    expect(doneLine({ usualTime: '' }, at)).toBe('Done at 5:48 PM')
    expect(doneLine({ usualTime: '18:00' }, at)).toBe('Done at 5:48 PM, 12 min earlier than usual')
    expect(doneLine({ usualTime: '16:30' }, at)).toBe('Done at 5:48 PM, 1 hr 18 min later than usual')
    expect(doneLine({ usualTime: '17:48' }, at)).toBe('Done at 5:48 PM, right on time')
  })
})

describe('isOverdue', () => {
  it('flags a due habit past its usual time', () => {
    const h = { ...days(1), usualTime: '18:00' }
    expect(isOverdue(h, keys(), new Date(2026, 10, 2, 18, 30))).toBe(true)
    expect(isOverdue(h, keys(), new Date(2026, 10, 2, 17, 30))).toBe(false)
    expect(isOverdue(h, keys('2026-11-02'), new Date(2026, 10, 2, 18, 30))).toBe(false)
    expect(isOverdue({ ...h, usualTime: '' }, keys(), new Date(2026, 10, 2, 18, 30))).toBe(false)
  })
})

describe('labels and validation', () => {
  it('averages completion times', () => {
    const log = (h: number): HabitLog => ({
      id: '',
      habitId: 'h',
      dayKey: '',
      note: '',
      completedAt: new Date(2026, 10, 2, h).toISOString(),
    })
    expect(averageTime([log(10), log(12)])).toBe(11 * 60)
    expect(averageTime([])).toBeNull()
  })

  it('names schedules', () => {
    expect(scheduleLabel({ type: 'days', days: [5, 1, 0] })).toBe('Mon, Fri, Sun')
    expect(scheduleLabel({ type: 'days', days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Every day')
    expect(scheduleLabel({ type: 'days', days: [1, 2, 3, 4, 5] })).toBe('Weekdays')
    expect(scheduleLabel({ type: 'count', perWeek: 3 })).toBe('3 times a week')
    expect(scheduleLabel({ type: 'count', perWeek: 1 })).toBe('Once a week')
  })

  it('validates habit fields', () => {
    const f = { name: 'Gym', category: 'fitness' as const, schedule: base.schedule, usualTime: '', targetNote: '' }
    expect(habitError(f)).toBe('')
    expect(habitError({ ...f, name: '  ' })).not.toBe('')
    expect(habitError({ ...f, schedule: { type: 'days', days: [] } })).not.toBe('')
    expect(habitError({ ...f, schedule: { type: 'count', perWeek: 8 } })).not.toBe('')
  })
})
