import { describe, expect, it } from 'vitest'
import type { Habit } from './habits'
import { agenda, carry, leftToday, planGroups, planLoad, reviewWeekStart, todayPrompt, weekDays, type DayRecord } from './plan'
import type { Task } from './tasks'

// Wednesday 4 November 2026.
const TODAY = '2026-11-04'
const at = (day: number, hour: number, min = 0) => new Date(2026, 10, day, hour, min)

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
const habit = (name: string, usualTime: string): Habit => ({
  id: name,
  name,
  category: 'fitness',
  schedule: { type: 'days', days: [3] },
  usualTime,
  targetNote: '',
  archived: false,
  createdAt: '',
})
const day = (over: Partial<DayRecord> = {}): DayRecord => ({ key: TODAY, plannedAt: '', reviewedAt: '', rating: 0, note: '', wins: [], ...over })

describe('todayPrompt', () => {
  it('offers planning in the morning until it is done', () => {
    expect(todayPrompt(at(4, 8), null, false)).toBe('plan')
    expect(todayPrompt(at(4, 8), day({ plannedAt: 'x' }), false)).toBeNull()
    expect(todayPrompt(at(4, 15), null, false)).toBeNull()
  })

  it('offers the evening review from 6 PM until it is done', () => {
    expect(todayPrompt(at(4, 18), null, false)).toBe('review')
    expect(todayPrompt(at(4, 21), day({ reviewedAt: 'x' }), false)).toBeNull()
  })

  it('offers the weekly review on Sunday and Saturday evening', () => {
    expect(todayPrompt(at(8, 10), null, false)).toBe('week')
    expect(todayPrompt(at(7, 19), null, false)).toBe('week')
    expect(todayPrompt(at(7, 10), null, false)).toBe('plan')
    expect(todayPrompt(at(8, 10), null, true)).toBe('plan')
  })
})

describe('reviewWeekStart', () => {
  it('reviews this week at the weekend and last week otherwise', () => {
    expect(reviewWeekStart('2026-11-08')).toBe('2026-11-02')
    expect(reviewWeekStart('2026-11-07')).toBe('2026-11-02')
    expect(reviewWeekStart(TODAY)).toBe('2026-10-26')
  })
})

describe('planGroups', () => {
  it('sorts open tasks into overdue, today, undated and the coming week', () => {
    const g = planGroups(
      [
        task({ title: 'late', dueDate: '2026-11-02' }),
        task({ title: 'now', dueDate: TODAY }),
        task({ title: 'someday' }),
        task({ title: 'fri', dueDate: '2026-11-06' }),
        task({ title: 'far', dueDate: '2026-12-01' }),
        task({ title: 'done', dueDate: TODAY, status: 'done' }),
      ],
      TODAY,
    )
    expect([g.overdue, g.today, g.undated, g.soon].map((l) => l.map((t) => t.title))).toEqual([['late'], ['now'], ['someday'], ['fri']])
  })
})

describe('planLoad', () => {
  it('compares estimates with the minutes left before 10 PM', () => {
    const tasks = [task({ estimateMinutes: 120 }), task({ estimateMinutes: 90 }), task({}), task({ estimateMinutes: 60, status: 'done' })]
    expect(planLoad(tasks, at(4, 20))).toEqual({ estimate: 210, unestimated: 1, free: 120, over: true })
    expect(planLoad(tasks, at(4, 9)).over).toBe(false)
    expect(planLoad(tasks, at(4, 23)).free).toBe(0)
  })
})

describe('agenda', () => {
  it('puts timed tasks and habits in order, then the rest', () => {
    const a = agenda(
      [task({ title: 'call', dueDate: TODAY, dueTime: '18:00' }), task({ title: 'read', dueDate: TODAY }), task({ title: 'later', dueDate: '2026-11-05', dueTime: '09:00' })],
      [habit('gym', '07:00'), habit('stretch', '')],
      new Set(['gym']),
      TODAY,
    )
    expect(a.timed.map((i) => [i.title, i.time, i.done])).toEqual([
      ['gym', '07:00', true],
      ['call', '18:00', false],
    ])
    expect(a.anytime.map((i) => i.title)).toEqual(['read'])
  })
})

describe('evening review', () => {
  it('asks about open tasks due today or earlier', () => {
    const tasks = [task({ title: 'a', dueDate: TODAY }), task({ title: 'b', dueDate: '2026-11-01' }), task({ title: 'c' }), task({ title: 'd', dueDate: TODAY, status: 'done' })]
    expect(leftToday(tasks, TODAY).map((t) => t.title).sort()).toEqual(['a', 'b'])
  })

  it('moves a task to tomorrow, or off the calendar unless it repeats', () => {
    expect(carry(task({ dueTime: '09:00' }), 'tomorrow', TODAY)).toEqual({ dueDate: '2026-11-05', dueTime: '09:00' })
    expect(carry(task({}), 'undated', TODAY)).toEqual({ dueDate: '', dueTime: '' })
    expect(carry(task({ recurrence: { type: 'daily' } }), 'undated', TODAY)).toBeNull()
  })

  it('lists reviewed days of a week in order', () => {
    const days = [day({ key: '2026-11-03', note: 'ok' }), day({ key: '2026-11-02', reviewedAt: 'x' }), day({ key: '2026-11-04' }), day({ key: '2026-11-09', rating: 4 })]
    expect(weekDays(days, '2026-11-02').map((d) => d.key)).toEqual(['2026-11-02', '2026-11-03'])
  })
})
