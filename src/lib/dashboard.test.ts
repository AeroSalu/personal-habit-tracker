import { describe, expect, it } from 'vitest'
import {
  allDoneDays,
  greeting,
  levelFor,
  lineFor,
  lockInDays,
  lockInStreak,
  productivityScore,
  todayList,
  todaysTasks,
  upcomingDeadlines,
  xpBreakdown,
} from './dashboard'
import type { Session } from './focus'
import type { Habit, HabitLog } from './habits'
import type { Task } from './tasks'

// 2026-11-02 is a Monday.
const TODAY = '2026-11-02'

const task = (over: Partial<Task>): Task => ({
  id: over.title ?? 't',
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
  createdAt: '',
  completedAt: '',
  nextTaskId: '',
  ...over,
})
const habit = (id: string, days: number[]): Habit => ({
  id,
  name: id,
  category: 'fitness',
  schedule: { type: 'days', days },
  usualTime: '',
  targetNote: '',
  archived: false,
  createdAt: '',
})
const log = (habitId: string, key: string): HabitLog => ({
  id: `${habitId}_${key}`,
  habitId,
  dayKey: key,
  completedAt: `${key}T09:00:00`,
  note: '',
})
const session = (key: string, outcome: Session['outcome'] = 'completed', minutes = 25): Session => ({
  id: '',
  taskId: '',
  habitId: '',
  title: '',
  preset: '25/5',
  plannedMinutes: 25,
  minutes,
  pausedMinutes: 0,
  startedAt: '',
  endedAt: '',
  dayKey: key,
  outcome,
  leaves: [],
  note: '',
})
const doneOn = (key: string) => new Date(`${key}T10:00:00`).toISOString()

describe('lock-in streak', () => {
  it('counts any finished work as a lock-in day', () => {
    const days = lockInDays(
      [session('2026-10-30'), session('2026-10-29', 'stopped')],
      [log('h', '2026-10-31')],
      [task({ status: 'done', completedAt: doneOn('2026-11-01') })],
    )
    expect([...days].sort()).toEqual(['2026-10-30', '2026-10-31', '2026-11-01'])
  })

  it('does not break before today is over', () => {
    const days = new Set(['2026-10-30', '2026-10-31', '2026-11-01'])
    expect(lockInStreak(days, TODAY)).toEqual({ current: 3, best: 3 })
    expect(lockInStreak(new Set([...days, TODAY]), TODAY).current).toBe(4)
  })

  it('ends after a missed day and remembers the best run', () => {
    const days = new Set(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-31'])
    expect(lockInStreak(days, TODAY)).toEqual({ current: 0, best: 3 })
  })
})

describe('XP', () => {
  it('awards each completed task, habit tick and completed session', () => {
    const xp = xpBreakdown(
      [task({ status: 'done' }), task({ status: 'todo' })],
      [],
      [log('h', '2026-11-01')],
      [session(TODAY), session(TODAY, 'stopped')],
      TODAY,
    )
    expect(xp).toMatchObject({ tasks: 10, habits: 10, sessions: 20 })
  })

  it('caps session XP per day so a timer left running cannot farm it', () => {
    const many = Array.from({ length: 12 }, () => session(TODAY))
    expect(xpBreakdown([], [], [], many, TODAY).sessions).toBe(8 * 20)
  })

  it('gives the all-done bonus only on days where everything due was done', () => {
    const habits = [habit('gym', [1])]
    const tasks = [
      task({ title: 'a', dueDate: TODAY, status: 'done' }),
      task({ title: 'b', dueDate: '2026-10-26', status: 'done' }),
    ]
    // Monday Oct 26: task done but gym not ticked. Monday Nov 2: both done.
    expect(allDoneDays(tasks, habits, [log('gym', TODAY)], TODAY)).toEqual([TODAY])
    expect(xpBreakdown(tasks, habits, [log('gym', TODAY)], [], TODAY).allDone).toBe(50)
  })

  it('never gives the bonus to a day whose task was finished late', () => {
    const late = task({ dueDate: '2026-11-01', status: 'done', completedAt: doneOn(TODAY) })
    const onTime = task({ dueDate: '2026-11-01', status: 'done', completedAt: doneOn('2026-11-01') })
    expect(allDoneDays([late], [], [], TODAY)).toEqual([])
    expect(allDoneDays([onTime], [], [], TODAY)).toEqual(['2026-11-01'])
  })

  it('maps XP to levels on a growing curve', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, into: 0, needed: 100 })
    expect(levelFor(99).level).toBe(1)
    expect(levelFor(100)).toMatchObject({ level: 2, into: 0, needed: 200 })
    expect(levelFor(299).level).toBe(2)
    expect(levelFor(300)).toMatchObject({ level: 3, into: 0 })
    expect(levelFor(650)).toMatchObject({ level: 4, into: 50, needed: 400 })
  })
})

describe('today', () => {
  it('collects tasks due today or overdue, and those finished today', () => {
    const { done, pending } = todaysTasks(
      [
        task({ title: 'due today', dueDate: TODAY }),
        task({ title: 'overdue', dueDate: '2026-10-30' }),
        task({ title: 'late, done today', dueDate: '2026-10-30', status: 'done', completedAt: doneOn(TODAY) }),
        task({ title: 'done last week', dueDate: '2026-10-28', status: 'done', completedAt: doneOn('2026-10-28') }),
        task({ title: 'tomorrow', dueDate: '2026-11-03' }),
        task({ title: 'no date' }),
      ],
      TODAY,
    )
    expect(pending.map((t) => t.title)).toEqual(['due today', 'overdue'])
    expect(done.map((t) => t.title)).toEqual(['late, done today'])
  })

  it('lists the week ahead, overdue first', () => {
    const list = upcomingDeadlines(
      [
        task({ title: 'friday', dueDate: '2026-11-06' }),
        task({ title: 'late', dueDate: '2026-10-31' }),
        task({ title: 'next month', dueDate: '2026-12-01' }),
        task({ title: 'done', dueDate: TODAY, status: 'done' }),
      ],
      TODAY,
    )
    expect(list.map((t) => t.title)).toEqual(['late', 'friday'])
  })
})

describe('productivity score', () => {
  it('weights focus, tasks and habits 40/35/25', () => {
    const r = productivityScore({ focusMinutes: 60, focusGoal: 120, tasksDone: 1, tasksTotal: 2, habitsDone: 2, habitsTotal: 2 })
    // 40·0.5 + 35·0.5 + 25·1 = 62.5
    expect(r.score).toBe(63)
    expect(r.parts.map((p) => p.weight)).toEqual([40, 35, 25])
  })

  it('hands the weight of an empty part to the others', () => {
    const r = productivityScore({ focusMinutes: 120, focusGoal: 120, tasksDone: 0, tasksTotal: 0, habitsDone: 0, habitsTotal: 1 })
    expect(r.parts.map((p) => p.id)).toEqual(['focus', 'habits'])
    expect(r.score).toBe(62)
  })

  it('caps focus at the goal and handles an empty day', () => {
    expect(productivityScore({ focusMinutes: 500, focusGoal: 60, tasksDone: 0, tasksTotal: 0, habitsDone: 0, habitsTotal: 0 }).score).toBe(100)
    expect(productivityScore({ focusMinutes: 0, focusGoal: 60, tasksDone: 0, tasksTotal: 0, habitsDone: 0, habitsTotal: 0 }).score).toBe(0)
  })
})

describe('words', () => {
  it('greets by time of day', () => {
    expect(greeting(3)).toBe('Still up')
    expect(greeting(9)).toBe('Good morning')
    expect(greeting(14)).toBe('Good afternoon')
    expect(greeting(20)).toBe('Good evening')
  })

  it('keeps the same line all day', () => {
    expect(lineFor(TODAY)).toBe(lineFor(TODAY))
    expect(typeof lineFor('2026-11-03')).toBe('string')
  })
})

describe('todayList', () => {
  const at = (h: number, m = 0) => new Date(2026, 10, 2, h, m)
  const timed = (id: string, time: string): Habit => ({ ...habit(id, [1]), usualTime: time })

  it('puts overdue first, then by time, untimed after, finished last', () => {
    const tasks = [
      task({ title: 'later', dueDate: TODAY }),
      task({ title: 'urgent', dueDate: TODAY, priority: 'urgent' }),
      task({ title: 'late', dueDate: '2026-11-01' }),
      task({ title: 'at 18', dueDate: TODAY, dueTime: '18:00' }),
      task({ title: 'done', dueDate: TODAY, status: 'done', completedAt: at(8).toISOString() }),
      task({ title: 'tomorrow', dueDate: '2026-11-03' }),
    ]
    const habits = [timed('gym', '07:00'), timed('read', '')]
    const list = todayList(tasks, habits, [log('gym', TODAY)], at(12))
    expect(list.map((i) => i.id)).toEqual(['late', 'at 18', 'urgent', 'later', 'read', 'gym', 'done'])
    expect(list[0].overdue).toBe(true)
  })

  it('marks a task past its time today as overdue', () => {
    const list = todayList([task({ title: 'call', dueDate: TODAY, dueTime: '09:00' })], [], [], at(10))
    expect(list[0].overdue).toBe(true)
  })
})
