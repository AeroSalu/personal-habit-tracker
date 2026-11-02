import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTER,
  dueLabel,
  groupTasks,
  isOverdue,
  matchesFilter,
  nextDueDate,
  recurrenceLabel,
  taskError,
  tasksOn,
  type Task,
  type TaskFields,
} from './tasks'

// 2026-11-02 is a Monday.
const task = (over: Partial<Task> = {}): Task => ({
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
  createdAt: '2026-10-01T00:00:00.000Z',
  completedAt: '',
  nextTaskId: '',
  ...over,
})
const at = (h: number, m = 0) => new Date(2026, 10, 2, h, m)

describe('isOverdue', () => {
  it('is overdue after its date, or after its time today', () => {
    expect(isOverdue(task({ dueDate: '2026-11-01' }), at(9))).toBe(true)
    expect(isOverdue(task({ dueDate: '2026-11-02' }), at(23))).toBe(false)
    expect(isOverdue(task({ dueDate: '2026-11-02', dueTime: '17:00' }), at(17, 1))).toBe(true)
    expect(isOverdue(task({ dueDate: '2026-11-02', dueTime: '17:00' }), at(16, 59))).toBe(false)
  })

  it('never flags done or undated tasks', () => {
    expect(isOverdue(task({ dueDate: '2026-10-01', status: 'done' }), at(9))).toBe(false)
    expect(isOverdue(task(), at(9))).toBe(false)
  })
})

describe('groupTasks', () => {
  it('groups in order and sorts by priority then deadline', () => {
    const groups = groupTasks(
      [
        task({ title: 'late', dueDate: '2026-10-30' }),
        task({ title: 'today low', dueDate: '2026-11-02', priority: 'low' }),
        task({ title: 'today urgent', dueDate: '2026-11-02', priority: 'urgent' }),
        task({ title: 'friday', dueDate: '2026-11-06' }),
        task({ title: 'tuesday', dueDate: '2026-11-03', priority: 'low' }),
        task({ title: 'someday' }),
        task({ title: 'finished', status: 'done', completedAt: '2026-11-01T10:00:00Z' }),
      ],
      at(9),
    )
    expect(groups.map((g) => g.id)).toEqual(['overdue', 'today', 'upcoming', 'someday', 'done'])
    expect(groups[1].tasks.map((t) => t.title)).toEqual(['today urgent', 'today low'])
    // Upcoming reads as a timeline: soonest first, whatever the priority.
    expect(groups[2].tasks.map((t) => t.title)).toEqual(['tuesday', 'friday'])
  })

  it('leaves out empty groups', () => {
    expect(groupTasks([task()], at(9)).map((g) => g.id)).toEqual(['someday'])
  })
})

describe('nextDueDate', () => {
  it('repeats daily from the later of the deadline and today', () => {
    expect(nextDueDate(task({ dueDate: '2026-11-02', recurrence: { type: 'daily' } }), '2026-11-02')).toBe('2026-11-03')
    // Finished two days late: the next one is tomorrow, not already overdue.
    expect(nextDueDate(task({ dueDate: '2026-10-31', recurrence: { type: 'daily' } }), '2026-11-02')).toBe('2026-11-03')
    // Finished early: the next one follows the original deadline.
    expect(nextDueDate(task({ dueDate: '2026-11-05', recurrence: { type: 'daily' } }), '2026-11-02')).toBe('2026-11-06')
  })

  it('repeats weekly on the same weekday', () => {
    expect(nextDueDate(task({ dueDate: '2026-11-02', recurrence: { type: 'weekly' } }), '2026-11-02')).toBe('2026-11-09')
    expect(nextDueDate(task({ dueDate: '2026-10-19', recurrence: { type: 'weekly' } }), '2026-11-02')).toBe('2026-11-09')
  })

  it('repeats on custom weekdays', () => {
    const mwf = { type: 'custom' as const, days: [1, 3, 5] }
    expect(nextDueDate(task({ dueDate: '2026-11-02', recurrence: mwf }), '2026-11-02')).toBe('2026-11-04')
    expect(nextDueDate(task({ dueDate: '2026-11-06', recurrence: mwf }), '2026-11-06')).toBe('2026-11-09')
  })

  it('returns nothing for one-off or undated tasks', () => {
    expect(nextDueDate(task({ dueDate: '2026-11-02' }), '2026-11-02')).toBe('')
    expect(nextDueDate(task({ recurrence: { type: 'daily' } }), '2026-11-02')).toBe('')
  })
})

describe('matchesFilter', () => {
  const t = task({
    title: 'Write report',
    category: 'work',
    priority: 'high',
    subtasks: [{ id: 's', title: 'Charts', done: false }],
  })

  it('hides done tasks by default', () => {
    expect(matchesFilter(t, DEFAULT_FILTER)).toBe(true)
    expect(matchesFilter({ ...t, status: 'done' }, DEFAULT_FILTER)).toBe(false)
    expect(matchesFilter({ ...t, status: 'done' }, { ...DEFAULT_FILTER, status: 'all' })).toBe(true)
  })

  it('searches title, description and subtasks', () => {
    expect(matchesFilter(t, { ...DEFAULT_FILTER, query: 'REPORT' })).toBe(true)
    expect(matchesFilter(t, { ...DEFAULT_FILTER, query: 'charts' })).toBe(true)
    expect(matchesFilter(t, { ...DEFAULT_FILTER, query: 'gym' })).toBe(false)
  })

  it('filters by category, priority and status', () => {
    expect(matchesFilter(t, { ...DEFAULT_FILTER, category: 'study' })).toBe(false)
    expect(matchesFilter(t, { ...DEFAULT_FILTER, priority: 'high' })).toBe(true)
    expect(matchesFilter(t, { ...DEFAULT_FILTER, status: 'in_progress' })).toBe(false)
  })
})

describe('labels', () => {
  it('describes deadlines relative to today', () => {
    expect(dueLabel(task({ dueDate: '2026-11-02', dueTime: '17:00' }), '2026-11-02')).toBe('Today, 5:00 PM')
    expect(dueLabel(task({ dueDate: '2026-11-03' }), '2026-11-02')).toBe('Tomorrow')
    expect(dueLabel(task({ dueDate: '2026-11-01' }), '2026-11-02')).toBe('Yesterday')
    expect(dueLabel(task({ dueDate: '2026-11-09' }), '2026-11-02')).toBe('Mon, Nov 9')
    expect(dueLabel(task({ dueDate: '2027-01-04' }), '2026-11-02')).toBe('Mon, Jan 4, 2027')
    expect(dueLabel(task(), '2026-11-02')).toBe('')
  })

  it('names recurrences', () => {
    expect(recurrenceLabel({ type: 'custom', days: [5, 1] })).toBe('Mon, Fri')
    expect(recurrenceLabel({ type: 'none' })).toBe('')
  })

  it('lists a day with open tasks before done ones', () => {
    const list = tasksOn(
      [task({ title: 'a', dueDate: '2026-11-02', status: 'done' }), task({ title: 'b', dueDate: '2026-11-02' }), task({ title: 'c' })],
      '2026-11-02',
    )
    expect(list.map((t) => t.title)).toEqual(['b', 'a'])
  })
})

describe('taskError', () => {
  const ok: TaskFields = {
    title: 'Report',
    description: '',
    category: 'work',
    priority: 'medium',
    status: 'todo',
    dueDate: '',
    dueTime: '',
    subtasks: [],
    recurrence: { type: 'none' },
    estimateMinutes: 0,
  }

  it('accepts a minimal task', () => {
    expect(taskError(ok)).toBe('')
  })

  it('rejects incomplete deadlines and repeats', () => {
    expect(taskError({ ...ok, title: ' ' })).not.toBe('')
    expect(taskError({ ...ok, dueTime: '17:00' })).not.toBe('')
    expect(taskError({ ...ok, recurrence: { type: 'daily' } })).not.toBe('')
    expect(taskError({ ...ok, dueDate: '2026-11-02', recurrence: { type: 'custom', days: [] } })).not.toBe('')
    expect(taskError({ ...ok, estimateMinutes: 2000 })).not.toBe('')
    expect(taskError({ ...ok, estimateMinutes: Number.NaN })).not.toBe('')
  })
})
