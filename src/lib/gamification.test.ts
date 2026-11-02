import { describe, expect, it } from 'vitest'
import { badgeStates } from './achievements'
import { addDays } from './dates'
import type { Session } from './focus'
import { indexGame, personalBests, type GameData } from './game'
import type { Habit, HabitLog } from './habits'
import { goalXp, missionsFor, seeded, weeklyChallenge } from './missions'
import type { Task } from './tasks'

// 2026-11-02 is a Monday.
const TODAY = '2026-11-02'

const at = (day: string, hour: number) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, hour).toISOString()
}
const session = (day: string, over: Partial<Session> = {}): Session => ({
  id: `${day}-${over.startedAt ?? ''}`,
  taskId: '',
  habitId: '',
  title: '',
  preset: '25/5',
  plannedMinutes: 25,
  minutes: 25,
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
  id: Math.random().toString(36),
  title: 't',
  description: '',
  category: 'work',
  priority: 'medium',
  status: 'todo',
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
const doneTask = (day: string, over: Partial<Task> = {}) => task({ status: 'done', completedAt: at(day, 15), ...over })
const habit = (id: string, over: Partial<Habit> = {}): Habit => ({
  id,
  name: id,
  category: 'fitness',
  schedule: { type: 'days', days: [0, 1, 2, 3, 4, 5, 6] },
  usualTime: '',
  targetNote: '',
  archived: false,
  createdAt: at('2026-10-01', 9),
  ...over,
})
const log = (habitId: string, day: string): HabitLog => ({ id: `${habitId}_${day}`, habitId, dayKey: day, completedAt: at(day, 9), note: '' })
const game = (over: Partial<GameData>) =>
  indexGame({ uid: 'u1', focusGoal: 120, tasks: [], habits: [], logs: [], sessions: [], today: TODAY, ...over })
const badge = (ix: ReturnType<typeof game>, id: string) => badgeStates(ix).find((b) => b.id === id)!
const run = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i))

describe('badges', () => {
  it('earns First Lock-In on the first day with finished work', () => {
    expect(badge(game({}), 'first-lock-in').earnedOn).toBeNull()
    expect(badge(game({ logs: [log('h', '2026-10-20')] }), 'first-lock-in').earnedOn).toBe('2026-10-20')
  })

  it('earns streak badges on the day the run reaches the target', () => {
    const ix = game({ logs: run('2026-10-10', 8).map((d) => log('h', d)) })
    expect(badge(ix, 'streak-3').earnedOn).toBe('2026-10-12')
    expect(badge(ix, 'streak-7').earnedOn).toBe('2026-10-16')
    expect(badge(ix, 'streak-30')).toMatchObject({ earnedOn: null, current: 8 })
  })

  it('does not count a broken run towards a streak badge', () => {
    const days = [...run('2026-10-01', 2), ...run('2026-10-05', 2)]
    expect(badge(game({ logs: days.map((d) => log('h', d)) }), 'streak-3').earnedOn).toBeNull()
  })

  it('earns Perfect Week only for a full Monday to Sunday', () => {
    expect(badge(game({ logs: run('2026-10-26', 7).map((d) => log('h', d)) }), 'perfect-week').earnedOn).toBe('2026-11-01')
    // Seven days in a row from a Wednesday spans two weeks.
    expect(badge(game({ logs: run('2026-10-21', 7).map((d) => log('h', d)) }), 'perfect-week').earnedOn).toBeNull()
  })

  it('counts focus hours across all saved sessions', () => {
    const sessions = run('2026-10-01', 12).map((d) => session(d, { minutes: 60 }))
    const b = badge(game({ sessions }), 'focus-10h')
    expect(b.earnedOn).toBe('2026-10-10')
    expect(b.current).toBe(12)
  })

  it('needs a 90-minute session with no leaves for Deep Diver', () => {
    const left = session('2026-10-05', { minutes: 90, leaves: [{ at: '', seconds: 5 }] })
    const short = session('2026-10-06', { minutes: 60 })
    const stopped = session('2026-10-07', { minutes: 95, outcome: 'stopped' })
    expect(badge(game({ sessions: [left, short, stopped] }), 'deep-diver').earnedOn).toBeNull()
    expect(badge(game({ sessions: [session('2026-10-08', { minutes: 90 })] }), 'deep-diver').earnedOn).toBe('2026-10-08')
  })

  it('counts early and late sessions by their start hour', () => {
    const early = run('2026-10-01', 5).map((d) => session(d, { startedAt: at(d, 7) }))
    const late = run('2026-10-01', 5).map((d) => session(d, { startedAt: at(d, 22) }))
    expect(badge(game({ sessions: early }), 'early-bird').earnedOn).toBe('2026-10-05')
    expect(badge(game({ sessions: late }), 'night-owl').earnedOn).toBe('2026-10-05')
    expect(badge(game({ sessions: early }), 'night-owl').earnedOn).toBeNull()
  })

  it('counts goal days against the current focus goal', () => {
    const sessions = run('2026-10-01', 5).map((d) => session(d, { minutes: 60 }))
    expect(badge(game({ sessions, focusGoal: 60 }), 'goal-crusher').earnedOn).toBe('2026-10-05')
    expect(badge(game({ sessions, focusGoal: 120 }), 'goal-crusher').earnedOn).toBeNull()
  })

  it('counts completed tasks, and only on-time ones for Planner', () => {
    const done = run('2026-10-01', 10).map((d) => doneTask(d))
    expect(badge(game({ tasks: done }), 'tasks-10').earnedOn).toBe('2026-10-10')
    const late = run('2026-10-01', 10).map((d) => doneTask(d, { dueDate: addDays(d, -1) }))
    const onTime = run('2026-10-01', 10).map((d) => doneTask(d, { dueDate: d }))
    expect(badge(game({ tasks: late }), 'planner').earnedOn).toBeNull()
    expect(badge(game({ tasks: onTime }), 'planner').earnedOn).toBe('2026-10-10')
  })

  it('loses a badge when the work is undone', () => {
    const tasks = run('2026-10-01', 10).map((d) => doneTask(d))
    tasks[9] = { ...tasks[9], status: 'todo', completedAt: '' }
    expect(badge(game({ tasks }), 'tasks-10')).toMatchObject({ earnedOn: null, current: 9 })
  })

  it('needs 30 ticks on one habit for Habit Hero', () => {
    const logs = [...run('2026-09-01', 30).map((d) => log('a', d)), ...run('2026-09-01', 29).map((d) => log('b', d))]
    expect(badge(game({ logs }), 'habit-hero')).toMatchObject({ earnedOn: '2026-09-30', current: 30 })
  })
})

describe('missions', () => {
  it('picks the same three every time for a user and day', () => {
    const ix = game({ tasks: [task({ dueDate: TODAY })], habits: [habit('a'), habit('b')] })
    const first = missionsFor(ix, TODAY).map((m) => m.id)
    expect(first).toHaveLength(3)
    expect(new Set(first).size).toBe(3)
    expect(missionsFor(ix, TODAY).map((m) => m.id)).toEqual(first)
  })

  it('differs between users and between days', () => {
    const ids = (uid: string, day: string) => missionsFor(game({ uid }), day).map((m) => m.id).join()
    const variety = new Set(['u1', 'u2', 'u3', 'u4', 'u5'].map((u) => ids(u, TODAY)))
    expect(variety.size).toBeGreaterThan(1)
  })

  it('leaves out habit and task missions until there is something to do them with', () => {
    const empty = game({})
    for (let i = 0; i < 20; i += 1) {
      const ids = missionsFor(empty, addDays(TODAY, i)).map((m) => m.id)
      expect(ids).not.toContain('habits')
      expect(ids).not.toContain('tasks')
      expect(ids).not.toContain('on-time')
    }
  })

  it('does not count habits created today, so the picks stay fixed all day', () => {
    const ix = game({ habits: [habit('a', { createdAt: at(TODAY, 8) }), habit('b', { createdAt: at(TODAY, 8) })] })
    for (let i = 0; i < 10; i += 1) expect(missionsFor({ ...ix, uid: `u${i}` }, TODAY).map((m) => m.id)).not.toContain('habits')
  })

  it('tracks progress and caps it at the target', () => {
    const ix = game({ sessions: [session(TODAY, { minutes: 200 })] })
    const focus = Array.from({ length: 50 }, (_, i) => missionsFor({ ...ix, uid: `u${i}` }, TODAY))
      .flat()
      .find((m) => m.id === 'focus')
    expect(focus).toMatchObject({ current: 60, target: 60, done: true })
  })

  it('awards mission XP with the all-three bonus', () => {
    // A long, clean, early morning session completes every always-available mission.
    const sessions = [
      session(TODAY, { startedAt: at(TODAY, 6), minutes: 120 }),
      session(TODAY, { startedAt: at(TODAY, 8), minutes: 60, id: 'b' }),
    ]
    const ix = game({ sessions })
    const done = missionsFor(ix, TODAY).filter((m) => m.done).length
    expect(done).toBe(3)
    expect(goalXp(ix).missions).toBe(3 * 15 + 30)
  })

  it('is deterministic for a seed', () => {
    const a = seeded('x')
    const b = seeded('x')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})

describe('weekly challenge', () => {
  it('is fixed for the week and completes from the week’s records', () => {
    const week = '2026-10-26'
    const sessions = run(week, 7).flatMap((d) => [session(d, { minutes: 120 }), session(d, { minutes: 30, id: `${d}b` })])
    const ix = game({ sessions, focusGoal: 60 })
    const challenge = weeklyChallenge(ix, week)
    expect(weeklyChallenge(ix, week).id).toBe(challenge.id)
    // Every always-available challenge is met by 14 sessions and 17.5 hours over 7 days.
    expect(challenge.done).toBe(true)
    expect(goalXp(ix).challenges).toBe(100)
  })

  it('counts only days up to today in the current week', () => {
    const ix = game({ sessions: [session(TODAY, { minutes: 60 })], focusGoal: 60 })
    const c = weeklyChallenge(ix, TODAY)
    expect(c.done).toBe(false)
  })
})

describe('personal bests', () => {
  it('finds the longest session, best day, best week and most tasks', () => {
    const ix = game({
      sessions: [
        session('2026-10-20', { minutes: 50 }),
        session('2026-10-20', { minutes: 40, id: 'b' }),
        session('2026-10-28', { minutes: 75 }),
      ],
      tasks: [doneTask('2026-10-21'), doneTask('2026-10-22'), doneTask('2026-10-22')],
    })
    expect(personalBests(ix)).toEqual({
      longestSession: { minutes: 75, day: '2026-10-28' },
      bestDay: { minutes: 90, day: '2026-10-20' },
      bestWeek: { minutes: 90, weekOf: '2026-10-19' },
      mostTasks: { count: 2, day: '2026-10-22' },
    })
  })

  it('is empty with no records', () => {
    expect(personalBests(game({}))).toEqual({ longestSession: null, bestDay: null, bestWeek: null, mostTasks: null })
  })
})
