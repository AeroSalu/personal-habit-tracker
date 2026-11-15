import { describe, expect, it } from 'vitest'
import { xpBreakdown } from './dashboard'
import type { Session } from './focus'
import { indexGame, type GameData } from './game'
import type { HabitLog } from './habits'
import { goalXp } from './missions'
import {
  currentSeasonXp,
  currentWeekMinutes,
  currentWeekXp,
  isFocusingNow,
  normalizeUsername,
  publicStats,
  usernameError,
  xpBetween,
} from './social'
import type { Task } from './tasks'

// 2026-11-04 is a Wednesday; its week starts Monday 2026-11-02.
const TODAY = '2026-11-04'
const at = (day: string, hour: number) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, hour).toISOString()
}
const session = (day: string, minutes = 25): Session => ({
  id: `${day}-${minutes}-${Math.random()}`,
  taskId: '',
  habitId: '',
  title: 'secret project',
  preset: '25/5',
  plannedMinutes: minutes,
  minutes,
  pausedMinutes: 0,
  startedAt: at(day, 14),
  endedAt: at(day, 15),
  dayKey: day,
  outcome: 'completed',
  leaves: [],
  note: 'private note',
})
const doneTask = (day: string): Task => ({
  id: `t-${day}-${Math.random()}`,
  title: 'secret task',
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
  completedAt: at(day, 15),
  nextTaskId: '',
})
const log = (day: string): HabitLog => ({ id: `h_${day}`, habitId: 'h', dayKey: day, completedAt: at(day, 9), note: '' })
const game = (over: Partial<GameData>) =>
  indexGame({ uid: 'u1', focusGoal: 600, tasks: [], habits: [], logs: [], sessions: [], today: TODAY, ...over })

describe('usernames', () => {
  it('normalises what was typed', () => {
    expect(normalizeUsername('  @Ana_K ')).toBe('ana_k')
  })

  it('accepts 3–20 letters, numbers and underscores', () => {
    expect(usernameError('ana_k')).toBe('')
    expect(usernameError('ab')).not.toBe('')
    expect(usernameError('a'.repeat(21))).not.toBe('')
    expect(usernameError('ana k')).not.toBe('')
    expect(usernameError('ana-k')).not.toBe('')
  })
})

describe('xpBetween', () => {
  it('counts only records inside the range', () => {
    const ix = game({
      tasks: [doneTask('2026-11-02'), doneTask('2026-10-30')],
      logs: [log('2026-11-03'), log('2026-10-29')],
      sessions: [session('2026-11-04'), session('2026-10-28')],
    })
    // This week: 1 task (10) + 1 habit tick (10) + 1 session (20), with a high goal so no missions complete.
    expect(xpBetween(ix, '2026-11-02', '2026-11-08')).toBe(40)
  })

  it('adds up to the all-time total when the range covers everything', () => {
    const ix = game({
      tasks: [doneTask('2026-11-02'), doneTask('2026-10-15')],
      logs: [log('2026-11-03'), log('2026-09-01')],
      sessions: [session('2026-11-04', 90), session('2026-10-01', 50)],
      focusGoal: 60,
    })
    const total = xpBreakdown(ix.tasks, ix.habits, ix.logs, ix.sessions, TODAY, goalXp(ix)).total
    expect(xpBetween(ix, '0000-01-01', '9999-12-31')).toBe(total)
  })
})

describe('publicStats', () => {
  // Sessions short enough, and late enough in the day, that no mission completes.
  const ix = game({ sessions: [session('2026-11-02', 45), session('2026-11-04', 30), session('2026-10-31', 60)] })
  const stats = publicStats(ix, { level: 2, xp: 140, badges: ['streak-3', 'first-lock-in'], streak: 3, focusingUntil: null })

  it('summarises this week and month', () => {
    expect(stats).toMatchObject({
      level: 2,
      xp: 140,
      badges: ['first-lock-in', 'streak-3'],
      weekKey: '2026-11-02',
      weekFocusMinutes: 75,
      seasonKey: '2026-11',
      streak: 3,
      focusing: null,
    })
    expect(stats.weekXp).toBe(40)
    expect(stats.weekFocusByDay).toEqual([45, 0, 30, 0, 0, 0, 0])
    expect(stats.seasonXp).toBe(40)
  })

  it('never carries private details', () => {
    const text = JSON.stringify(stats)
    expect(text).not.toContain('secret')
    expect(text).not.toContain('private')
  })

  it('carries the bio and only pins badges actually earned', () => {
    const s = publicStats(ix, { level: 1, xp: 0, badges: ['streak-3'], streak: 0, focusingUntil: null, bio: '  Prepping for GATE  ', pinned: ['streak-3', 'streak-100'] })
    expect(s.bio).toBe('Prepping for GATE')
    expect(s.pinned).toEqual(['streak-3'])
  })

  it('marks focusing until a time', () => {
    const until = Date.UTC(2026, 10, 4, 12)
    const s = publicStats(ix, { level: 1, xp: 0, badges: [], streak: 0, focusingUntil: until })
    expect(s.focusing).toEqual({ until: new Date(until).toISOString() })
    expect(isFocusingNow(s, until - 1000)).toBe(true)
    expect(isFocusingNow(s, until + 1000)).toBe(false)
  })
})

describe('stale totals', () => {
  it('reads last week’s or last month’s numbers as zero', () => {
    const s = { weekKey: '2026-10-26', weekXp: 300, weekFocusMinutes: 600, seasonKey: '2026-10', seasonXp: 900 }
    expect(currentWeekXp(s, TODAY)).toBe(0)
    expect(currentWeekMinutes(s, TODAY)).toBe(0)
    expect(currentSeasonXp(s, TODAY)).toBe(0)
    expect(currentWeekXp({ ...s, weekKey: '2026-11-02' }, TODAY)).toBe(300)
  })
})
