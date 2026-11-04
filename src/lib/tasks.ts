import { addDays, clock, dayKey, minutesOfDay, parseClock, parseDay, weekday } from './dates'
import type { Category } from './habits'

export const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

export const STATUSES = ['todo', 'in_progress', 'done'] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_LABEL: Record<Status, string> = { todo: 'To do', in_progress: 'In progress', done: 'Done' }

export type Recurrence =
  | { type: 'none' }
  | { type: 'daily' }
  | { type: 'weekly' }
  | { type: 'custom'; days: number[] }

export type Subtask = { id: string; title: string; done: boolean }

export type Task = {
  id: string
  title: string
  description: string
  category: Category
  priority: Priority
  status: Status
  /** Day key, or '' for no deadline. */
  dueDate: string
  /** "17:00", or '' for any time that day. */
  dueTime: string
  subtasks: Subtask[]
  recurrence: Recurrence
  /** 0 when there is no estimate. */
  estimateMinutes: number
  order: number
  createdAt: string
  completedAt: string
  /** The instance created when this recurring task was completed, so undo can remove it. */
  nextTaskId: string
  /** Show this task in friends' feeds when it's completed. Off unless chosen. */
  shared?: boolean
}

export type TaskFields = Pick<
  Task,
  'title' | 'description' | 'category' | 'priority' | 'status' | 'dueDate' | 'dueTime' | 'subtasks' | 'recurrence' | 'estimateMinutes' | 'shared'
>

const RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

/** Sort key for a deadline: no date goes last, no time sorts at the end of its day. */
function dueSortKey(task: Pick<Task, 'dueDate' | 'dueTime'>): string {
  return task.dueDate ? `${task.dueDate} ${task.dueTime || '99:99'}` : '9999'
}

/** Priority first, then the earliest deadline, then oldest first. */
export function compareTasks(a: Task, b: Task): number {
  return (
    RANK[a.priority] - RANK[b.priority] ||
    dueSortKey(a).localeCompare(dueSortKey(b)) ||
    a.createdAt.localeCompare(b.createdAt)
  )
}

/** Past its date, or past its time today. */
export function isOverdue(task: Task, now: Date): boolean {
  if (task.status === 'done' || !task.dueDate) return false
  const today = dayKey(now)
  if (task.dueDate < today) return true
  return task.dueDate === today && Boolean(task.dueTime) && minutesOfDay(now) > parseClock(task.dueTime)
}

export type GroupId = 'overdue' | 'today' | 'upcoming' | 'someday' | 'done'

export const GROUP_LABEL: Record<GroupId, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  someday: 'No date',
  done: 'Done',
}

export function groupOf(task: Task, now: Date): GroupId {
  if (task.status === 'done') return 'done'
  if (isOverdue(task, now)) return 'overdue'
  if (!task.dueDate) return 'someday'
  return task.dueDate === dayKey(now) ? 'today' : 'upcoming'
}

/** Groups in display order, each sorted; empty groups are left out. Done shows newest first. */
export function groupTasks(tasks: Task[], now: Date): { id: GroupId; tasks: Task[] }[] {
  const order: GroupId[] = ['overdue', 'today', 'upcoming', 'someday', 'done']
  return order
    .map((id) => {
      const list = tasks.filter((t) => groupOf(t, now) === id)
      if (id === 'done') list.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      else if (id === 'upcoming') list.sort((a, b) => dueSortKey(a).localeCompare(dueSortKey(b)) || compareTasks(a, b))
      else list.sort(compareTasks)
      return { id, tasks: list }
    })
    .filter((g) => g.tasks.length)
}

/**
 * The next deadline for a recurring task: the first matching day after both its current
 * deadline and today, so finishing late doesn't create a task that is already overdue.
 */
export function nextDueDate(task: Pick<Task, 'dueDate' | 'recurrence'>, today: string): string {
  const r = task.recurrence
  if (r.type === 'none' || !task.dueDate) return ''
  const from = task.dueDate > today ? task.dueDate : today
  if (r.type === 'daily') return addDays(from, 1)
  if (r.type === 'weekly') {
    let next = addDays(task.dueDate, 7)
    while (next <= from) next = addDays(next, 7)
    return next
  }
  if (!r.days.length) return ''
  let next = addDays(from, 1)
  while (!r.days.includes(weekday(next))) next = addDays(next, 1)
  return next
}

export type TaskFilter = {
  query: string
  category: Category | 'all'
  priority: Priority | 'all'
  status: 'active' | 'all' | Status
}

export const DEFAULT_FILTER: TaskFilter = { query: '', category: 'all', priority: 'all', status: 'active' }

export function matchesFilter(task: Task, f: TaskFilter): boolean {
  if (f.category !== 'all' && task.category !== f.category) return false
  if (f.priority !== 'all' && task.priority !== f.priority) return false
  if (f.status === 'active' && task.status === 'done') return false
  if (f.status !== 'active' && f.status !== 'all' && task.status !== f.status) return false
  const q = f.query.trim().toLowerCase()
  if (!q) return true
  return [task.title, task.description, ...task.subtasks.map((s) => s.title)].some((text) =>
    text.toLowerCase().includes(q),
  )
}

export function tasksOn(tasks: Task[], key: string): Task[] {
  return tasks.filter((t) => t.dueDate === key).sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0) || compareTasks(a, b))
}

/** "Today, 5:00 PM", "Tomorrow", "Mon, Nov 9" */
export function dueLabel(task: Pick<Task, 'dueDate' | 'dueTime'>, today: string): string {
  if (!task.dueDate) return ''
  let day: string
  if (task.dueDate === today) day = 'Today'
  else if (task.dueDate === addDays(today, 1)) day = 'Tomorrow'
  else if (task.dueDate === addDays(today, -1)) day = 'Yesterday'
  else {
    const date = parseDay(task.dueDate)
    const sameYear = task.dueDate.slice(0, 4) === today.slice(0, 4)
    day = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    })
  }
  return task.dueTime ? `${day}, ${clock(parseClock(task.dueTime))}` : day
}

export function recurrenceLabel(r: Recurrence): string {
  if (r.type === 'daily') return 'Daily'
  if (r.type === 'weekly') return 'Weekly'
  if (r.type === 'custom') {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return [1, 2, 3, 4, 5, 6, 0].filter((d) => r.days.includes(d)).map((d) => names[d]).join(', ')
  }
  return ''
}

export function subtaskProgress(task: Pick<Task, 'subtasks'>) {
  return { done: task.subtasks.filter((s) => s.done).length, total: task.subtasks.length }
}

export function taskError(f: TaskFields): string {
  if (!f.title.trim()) return 'Give the task a title.'
  if (f.title.trim().length > 120) return 'Keep the title under 120 characters.'
  if (f.dueTime && !f.dueDate) return 'Pick a date for the deadline time.'
  if (f.recurrence.type !== 'none' && !f.dueDate) return 'Repeating tasks need a due date to repeat from.'
  if (f.recurrence.type === 'custom' && !f.recurrence.days.length) return 'Pick at least one day to repeat on.'
  if (!Number.isInteger(f.estimateMinutes) || f.estimateMinutes < 0 || f.estimateMinutes > 1440) {
    return 'Estimates go from 1 minute to 24 hours.'
  }
  return ''
}
