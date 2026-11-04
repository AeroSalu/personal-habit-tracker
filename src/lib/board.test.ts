import { describe, expect, it } from 'vitest'
import { boardColumns, DONE_ON_BOARD, orderBetween, planMove } from './board'
import type { Task } from './tasks'
import { BUILT_IN_TEMPLATES, fieldsFromTemplate, templateError, templateFromTask } from './templates'

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: id,
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
  createdAt: '2026-10-01T00:00:00Z',
  completedAt: '',
  nextTaskId: '',
  ...over,
})

describe('orderBetween', () => {
  it('takes the midpoint, or steps past an open end', () => {
    expect(orderBetween(100, 200)).toBe(150)
    expect(orderBetween(undefined, 200)).toBe(200 - 1024)
    expect(orderBetween(100, undefined)).toBe(100 + 1024)
    expect(orderBetween(undefined, undefined)).toBe(0)
  })

  it('keeps finding room after many inserts in the same gap', () => {
    let low = 0
    const high = 1
    for (let i = 0; i < 40; i += 1) {
      const mid = orderBetween(low, high)
      expect(mid).toBeGreaterThan(low)
      expect(mid).toBeLessThan(high)
      low = mid
    }
  })
})

describe('boardColumns', () => {
  it('sorts open columns by order and Done by newest completion, capped', () => {
    const done = Array.from({ length: DONE_ON_BOARD + 5 }, (_, i) =>
      task(`d${i}`, { status: 'done', completedAt: `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00Z` }),
    )
    const board = boardColumns([task('b', { order: 2 }), task('a', { order: 1 }), task('p', { status: 'in_progress' }), ...done])
    expect(board.todo.map((t) => t.id)).toEqual(['a', 'b'])
    expect(board.in_progress.map((t) => t.id)).toEqual(['p'])
    expect(board.done).toHaveLength(DONE_ON_BOARD)
    expect(board.done[0].id).toBe(`d${DONE_ON_BOARD + 4}`)
  })
})

describe('planMove', () => {
  const board = boardColumns([
    task('a', { order: 100 }),
    task('b', { order: 200 }),
    task('c', { order: 300 }),
    task('p', { status: 'in_progress', order: 50 }),
  ])

  it('reorders within a column using only the moved card', () => {
    // Move c to the top: before a.
    expect(planMove(board, 'c', 'todo', 0)).toEqual({ status: 'todo', order: 100 - 1024 })
    // Move a between b and c: among [b, c], index 1.
    expect(planMove(board, 'a', 'todo', 1)).toEqual({ status: 'todo', order: 250 })
  })

  it('moves across columns to the given position', () => {
    expect(planMove(board, 'b', 'in_progress', 0)).toEqual({ status: 'in_progress', order: 50 - 1024 })
    expect(planMove(board, 'b', 'in_progress', 5)).toEqual({ status: 'in_progress', order: 50 + 1024 })
  })

  it('keeps the order when dropped into Done', () => {
    expect(planMove(board, 'a', 'done', 0)).toEqual({ status: 'done', order: 100 })
  })
})

describe('templates', () => {
  it('builds fresh task fields with unticked subtasks', () => {
    const dsa = BUILT_IN_TEMPLATES.find((t) => t.id === 'builtin-dsa')!
    const f = fieldsFromTemplate(dsa, '2026-11-04')
    expect(f).toMatchObject({ title: 'Solve 2 DSA problems', status: 'todo', dueDate: '2026-11-04', recurrence: { type: 'daily' } })
    expect(f.subtasks.map((s) => s.done)).toEqual([false, false, false])
    expect(new Set(f.subtasks.map((s) => s.id)).size).toBe(3)
  })

  it('drops the repeat when there is no date to repeat from', () => {
    const dsa = BUILT_IN_TEMPLATES.find((t) => t.id === 'builtin-dsa')!
    expect(fieldsFromTemplate(dsa).recurrence).toEqual({ type: 'none' })
  })

  it('makes a template from a task without its progress', () => {
    const t = task('x', {
      title: ' Report ',
      subtasks: [
        { id: '1', title: 'Draft', done: true },
        { id: '2', title: ' ', done: false },
      ],
      estimateMinutes: 45,
    })
    expect(templateFromTask(t, '')).toEqual({
      name: 'Report',
      title: 'Report',
      description: '',
      category: 'work',
      priority: 'medium',
      steps: ['Draft'],
      estimateMinutes: 45,
      recurrence: { type: 'none' },
    })
  })

  it('validates names', () => {
    const f = templateFromTask(task('x'), 'Name')
    expect(templateError(f)).toBe('')
    expect(templateError({ ...f, name: ' ' })).not.toBe('')
  })
})
