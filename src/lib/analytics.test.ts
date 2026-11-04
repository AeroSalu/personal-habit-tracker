import { describe, expect, it } from 'vitest'
import {
  change,
  daysIn,
  focusByBlock,
  focusByCategory,
  focusByWeekday,
  focusTrend,
  heatmapCells,
  peak,
  rangeFor,
  rangeLabel,
  report,
  shiftRange,
  summarize,
  type AnalyticsData,
} from './analytics'
import type { Session } from './focus'
import type { Habit, HabitLog } from './habits'
import type { Task } from './tasks'

// 2026-11-02 is a Monday; today is Wednesday 2026-11-04.
const TODAY = '2026-11-04'
const at = (day: string, hour: number) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, hour).toISOString()
}
const session = (day: string, minutes: number, over: Partial<Session> = {}): Session => ({
  id: `${day}${minutes}${over.startedAt ?? ''}`,
  taskId: '',
  habitId: '',
  title: '',
  preset: '25/5',
  plannedMinutes: minutes,
  minutes,
  pausedMinutes: 0,
  startedAt: at(day, 10),
  endedAt: at(day, 11),
  dayKey: day,
  outcome: 'completed',
  leaves: [],
  note: '',
  ...over,
})
const task = (over: Partial<Task>): Task => ({
  id: over.id ?? 't',
  title: 't',
  description: '',
  category: 'work',
  priority: 'medium',
  status: 'done',
  dueDate: '',
  dueTime: '',
  subtasks: [],
  recurrence: { type: 'none' },
  estimateMinutes: 0,
  order: 0,
  createdAt: at('2026-10-01', 9),
  completedAt: '',
  nextTaskId: '',
  ...over,
})
const habit = (id: string, over: Partial<Habit> = {}): Habit => ({
  id,
  name: id,
  category: 'fitness',
  schedule: { type: 'days', days: [1, 3] },
  usualTime: '',
  targetNote: '',
  archived: false,
  createdAt: at('2026-10-01', 9),
  ...over,
})
const log = (habitId: string, day: string): HabitLog => ({ id: `${habitId}_${day}`, habitId, dayKey: day, completedAt: at(day, 9), note: '' })
const data = (over: Partial<AnalyticsData>): AnalyticsData => ({ tasks: [], habits: [], logs: [], sessions: [], today: TODAY, ...over })

describe('ranges', () => {
  it('builds day, week and month ranges', () => {
    expect(rangeFor('day', TODAY)).toEqual({ period: 'day', start: TODAY, end: TODAY })
    expect(rangeFor('week', TODAY)).toEqual({ period: 'week', start: '2026-11-02', end: '2026-11-08' })
    expect(rangeFor('month', TODAY)).toEqual({ period: 'month', start: '2026-11-01', end: '2026-11-30' })
    expect(rangeFor('month', '2028-02-10').end).toBe('2028-02-29')
  })

  it('moves back and forward by whole periods', () => {
    expect(shiftRange(rangeFor('week', TODAY), -1).start).toBe('2026-10-26')
    expect(shiftRange(rangeFor('month', '2026-01-15'), -1)).toMatchObject({ start: '2025-12-01', end: '2025-12-31' })
    expect(shiftRange(rangeFor('day', '2026-11-01'), 1).start).toBe('2026-11-02')
    expect(daysIn(rangeFor('week', TODAY))).toHaveLength(7)
  })

  it('labels ranges', () => {
    expect(rangeLabel(rangeFor('week', TODAY))).toBe('Nov 2 – 8')
    expect(rangeLabel(rangeFor('week', '2026-11-30'))).toBe('Nov 30 – Dec 6')
    expect(rangeLabel(rangeFor('month', TODAY))).toBe('November 2026')
    expect(rangeLabel(rangeFor('day', TODAY))).toBe('Wed, Nov 4')
  })
})

describe('summarize', () => {
  const week = rangeFor('week', TODAY)

  it('totals focus, sessions and completion within the range only', () => {
    const s = summarize(
      data({
        sessions: [
          session('2026-11-02', 50),
          session('2026-11-03', 25, { outcome: 'stopped' }),
          session('2026-11-04', 45),
          session('2026-10-30', 100),
        ],
      }),
      week,
    )
    expect(s).toMatchObject({ focusMinutes: 120, sessions: 2, stopped: 1, avgSession: 40 })
    expect(s.completionRate).toBeCloseTo(2 / 3)
  })

  it('counts tasks finished in the range and how many were late', () => {
    const s = summarize(
      data({
        tasks: [
          task({ id: 'a', completedAt: at('2026-11-02', 15), dueDate: '2026-11-03' }),
          task({ id: 'b', completedAt: at('2026-11-03', 15), dueDate: '2026-11-01' }),
          task({ id: 'c', completedAt: at('2026-11-03', 15) }),
          task({ id: 'd', completedAt: at('2026-10-20', 15) }),
          task({ id: 'e', status: 'todo' }),
        ],
      }),
      week,
    )
    expect(s).toMatchObject({ tasksDone: 3, lateTasks: 1, onTimeRate: 0.5 })
  })

  it('measures habits against what was scheduled up to today', () => {
    // Mon and Wed are scheduled and both have passed or are today; only Monday was ticked.
    const s = summarize(data({ habits: [habit('gym')], logs: [log('gym', '2026-11-02')] }), week)
    expect(s.habitRate).toBe(0.5)
  })

  it('spreads weekly-count habits across the days so far', () => {
    // 7 times a week over 3 days so far expects 3; 2 were done.
    const s = summarize(
      data({ habits: [habit('read', { schedule: { type: 'count', perWeek: 7 } })], logs: [log('read', '2026-11-02'), log('read', '2026-11-03')] }),
      week,
    )
    expect(s.habitRate).toBeCloseTo(2 / 3)
  })

  it('leaves weekly-count habits out of a single day', () => {
    const d = data({ habits: [habit('read', { schedule: { type: 'count', perWeek: 3 } })] })
    expect(summarize(d, rangeFor('day', TODAY)).habitRate).toBeNull()
    expect(summarize(d, rangeFor('week', TODAY)).habitRate).toBe(0)
  })

  it('leaves rates empty when there is nothing to measure', () => {
    expect(summarize(data({}), week)).toMatchObject({ avgSession: null, completionRate: null, onTimeRate: null, habitRate: null })
  })
})

describe('change', () => {
  it('compares with the previous period', () => {
    expect(change(120, 100)).toBeCloseTo(0.2)
    expect(change(50, 100)).toBeCloseTo(-0.5)
    expect(change(10, 0)).toBeNull()
    expect(change(null, 5)).toBeNull()
  })
})

describe('chart series', () => {
  const sessions = [
    session('2026-11-02', 30, { startedAt: at('2026-11-02', 7) }),
    session('2026-11-02', 20, { startedAt: at('2026-11-02', 22) }),
    session('2026-11-04', 60, { startedAt: at('2026-11-04', 10), taskId: 'study1' }),
  ]

  it('gives one point per day, and 7 days of context for a single day', () => {
    const week = focusTrend(sessions, rangeFor('week', TODAY))
    expect(week.map((p) => p.minutes)).toEqual([50, 0, 60, 0, 0, 0, 0])
    expect(week[0].label).toBe('Mon')
    const day = focusTrend(sessions, rangeFor('day', TODAY))
    expect(day).toHaveLength(7)
    expect(day[6]).toMatchObject({ key: TODAY, minutes: 60 })
    expect(focusTrend(sessions, rangeFor('month', TODAY))[1].label).toBe('2')
  })

  it('groups focus by the block a session started in', () => {
    const blocks = focusByBlock(sessions, rangeFor('week', TODAY))
    expect(blocks.map((b) => b.minutes)).toEqual([0, 0, 30, 60, 0, 0, 0, 20])
    expect(peak(blocks)?.key).toBe('9 AM–12 PM')
  })

  it('groups focus by weekday, Monday first', () => {
    expect(focusByWeekday(sessions, rangeFor('week', TODAY)).map((p) => p.minutes)).toEqual([50, 0, 60, 0, 0, 0, 0])
  })

  it('splits focus by the linked task’s category', () => {
    const shares = focusByCategory(sessions, [task({ id: 'study1', category: 'study' })], rangeFor('week', TODAY))
    expect(shares).toEqual([
      { id: 'study', minutes: 60 },
      { id: 'none', minutes: 50 },
    ])
  })

  it('finds no peak when everything is zero', () => {
    expect(peak([{ key: 'a', label: 'a', minutes: 0 }])).toBeNull()
  })

  it('builds a Monday-first heatmap ending today', () => {
    const cells = heatmapCells(new Set(['2026-11-02']), new Map([['2026-11-02', 30]]), TODAY, 2)
    expect(cells[0].key).toBe('2026-10-26')
    expect(cells[cells.length - 1].key).toBe(TODAY)
    expect(cells.find((c) => c.key === '2026-11-02')).toMatchObject({ lockedIn: true, minutes: 30 })
  })
})

describe('report', () => {
  it('describes the week in plain sentences', () => {
    const lines = report(
      data({
        sessions: [
          session('2026-10-27', 60),
          session('2026-11-02', 30, { startedAt: at('2026-11-02', 10) }),
          session('2026-11-03', 45, { startedAt: at('2026-11-03', 11) }),
          session('2026-11-04', 5, { outcome: 'stopped' }),
        ],
        tasks: [task({ completedAt: at('2026-11-03', 15), dueDate: '2026-11-02' })],
      }),
      rangeFor('week', TODAY),
    )
    expect(lines).toEqual([
      '1h 20m focused across 3 sessions, up 33% on last week.',
      'Strongest day: Tuesday.',
      'Most focus happens 9 AM–12 PM.',
      'You finished 1 task, 1 after the deadline.',
      '1 session ended early.',
    ])
  })

  it('says so when nothing happened', () => {
    expect(report(data({}), rangeFor('month', TODAY))).toEqual(['Nothing recorded this month yet.'])
  })
})
