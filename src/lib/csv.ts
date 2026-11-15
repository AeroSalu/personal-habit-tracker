// A spreadsheet of tasks for "Download my data". Fields with commas, quotes or line breaks
// are quoted, and a leading = + - @ is defused so a spreadsheet never runs a title as a formula.

import { recurrenceLabel, type Task } from './tasks'

export function csvCell(value: string | number): string {
  let s = String(value)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export function tasksCsv(tasks: Task[]): string {
  const head = ['Title', 'Status', 'Priority', 'Category', 'Due date', 'Due time', 'Repeats', 'Estimate (min)', 'Created', 'Completed', 'Notes']
  const rows = [...tasks]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((t) => [
      t.title,
      t.status,
      t.priority,
      t.category,
      t.dueDate,
      t.dueTime,
      recurrenceLabel(t.recurrence),
      t.estimateMinutes,
      t.createdAt,
      t.completedAt,
      t.description,
    ])
  return toCsv([head, ...rows])
}
