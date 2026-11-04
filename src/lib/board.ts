// Board columns and manual order. `order` is a number per task; moving a card gives it the
// midpoint of its new neighbours, so only the moved task is rewritten.

import type { Status, Task } from './tasks'

export const COLUMNS: Status[] = ['todo', 'in_progress', 'done']

/** Done shows the most recent completions only, so the column stays short. */
export const DONE_ON_BOARD = 20

const GAP = 1024

/** A value between two neighbours' orders; either side may be missing at a column's ends. */
export function orderBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return 0
  if (before === undefined) return (after as number) - GAP
  if (after === undefined) return before + GAP
  return (before + after) / 2
}

export function byOrder(a: Task, b: Task): number {
  return a.order - b.order || a.createdAt.localeCompare(b.createdAt)
}

export type Board = Record<Status, Task[]>

/** Open columns in manual order; Done newest first and capped. */
export function boardColumns(tasks: Task[]): Board {
  return {
    todo: tasks.filter((t) => t.status === 'todo').sort(byOrder),
    in_progress: tasks.filter((t) => t.status === 'in_progress').sort(byOrder),
    done: tasks
      .filter((t) => t.status === 'done')
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, DONE_ON_BOARD),
  }
}

/**
 * Where a card lands: its new status, and the order that puts it at `index` among the
 * destination column's other cards. Dropping into Done keeps the order, since Done is
 * sorted by completion time.
 */
export function planMove(board: Board, taskId: string, to: Status, index: number): { status: Status; order: number } {
  const moving = COLUMNS.flatMap((c) => board[c]).find((t) => t.id === taskId)
  if (to === 'done') return { status: 'done', order: moving?.order ?? 0 }
  const others = board[to].filter((t) => t.id !== taskId)
  const at = Math.max(0, Math.min(index, others.length))
  return { status: to, order: orderBetween(others[at - 1]?.order, others[at]?.order) }
}
