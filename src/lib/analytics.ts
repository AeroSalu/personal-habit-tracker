// Reports over a day, week or month: totals with the change from the previous period, the
// series behind each chart, and a plain-language summary. All derived from stored records.

import { habitsScheduledOn } from './dashboard'
import { addDays, dayKey, parseDay, WEEK, weekday, weekStart } from './dates'
import type { Session } from './focus'
import { CATEGORIES, type Category, type Habit, type HabitLog } from './habits'
import { formatMinutes } from './profile'
import type { Task } from './tasks'

export type Period = 'day' | 'week' | 'month'
export type Range = { period: Period; start: string; end: string }

export function rangeFor(period: Period, anchor: string): Range {
  if (period === 'day') return { period, start: anchor, end: anchor }
  if (period === 'week') {
    const start = weekStart(anchor)
    return { period, start, end: addDays(start, 6) }
  }
  const d = parseDay(anchor)
  const start = dayKey(new Date(d.getFullYear(), d.getMonth(), 1, 12))
  const end = dayKey(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12))
  return { period, start, end }
}

export function shiftRange(range: Range, n: number): Range {
  if (range.period === 'day') return rangeFor('day', addDays(range.start, n))
  if (range.period === 'week') return rangeFor('week', addDays(range.start, 7 * n))
  const d = parseDay(range.start)
  return rangeFor('month', dayKey(new Date(d.getFullYear(), d.getMonth() + n, 1, 12)))
}

export function daysIn(range: Range): string[] {
  const days: string[] = []
  for (let k = range.start; k <= range.end; k = addDays(k, 1)) days.push(k)
  return days
}

export function rangeLabel(range: Range): string {
  const d = parseDay(range.start)
  if (range.period === 'day') return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (range.period === 'month') return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const e = parseDay(range.end)
  const sameMonth = d.getMonth() === e.getMonth()
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' })}`
}

export type AnalyticsData = { tasks: Task[]; habits: Habit[]; logs: HabitLog[]; sessions: Session[]; today: string }

const inRange = (range: Range, key: string) => key >= range.start && key <= range.end

export type Summary = {
  focusMinutes: number
  sessions: number
  stopped: number
  /** Average length of saved sessions, or null with none. */
  avgSession: number | null
  /** Completed share of saved sessions, or null with none. */
  completionRate: number | null
  tasksDone: number
  /** Share of finished tasks with a deadline that were done by it, or null with none. */
  onTimeRate: number | null
  lateTasks: number
  /** Share of expected habit ticks that happened, or null when nothing was expected. */
  habitRate: number | null
}

/**
 * Habit ticks expected in the range up to today: each scheduled day for exact-day habits,
 * and the weekly number spread across the days for weekly-count habits. A single day leaves
 * weekly-count habits out, since no one day is expected to hold a fraction of a tick.
 */
function habitTotals(data: AnalyticsData, range: Range) {
  const days = daysIn(range).filter((d) => d <= data.today)
  let expected = 0
  let done = 0
  const ticked = new Set(data.logs.map((l) => `${l.habitId}_${l.dayKey}`))
  for (const d of days) {
    for (const h of habitsScheduledOn(data.habits, d)) {
      expected += 1
      if (ticked.has(`${h.id}_${d}`)) done += 1
    }
  }
  for (const h of data.habits) {
    if (range.period === 'day' || h.archived || h.schedule.type !== 'count') continue
    const created = h.createdAt ? dayKey(new Date(h.createdAt)) : ''
    const live = days.filter((d) => d >= created)
    if (!live.length) continue
    const want = (h.schedule.perWeek * live.length) / 7
    const got = data.logs.filter((l) => l.habitId === h.id && live.includes(l.dayKey)).length
    expected += want
    done += Math.min(got, want)
  }
  return { expected, done }
}

export function summarize(data: AnalyticsData, range: Range): Summary {
  const sessions = data.sessions.filter((s) => inRange(range, s.dayKey))
  const completed = sessions.filter((s) => s.outcome === 'completed')
  const focusMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0)
  const done = data.tasks.filter((t) => t.status === 'done' && t.completedAt && inRange(range, dayKey(new Date(t.completedAt))))
  const withDeadline = done.filter((t) => t.dueDate)
  const late = withDeadline.filter((t) => dayKey(new Date(t.completedAt)) > t.dueDate)
  const habits = habitTotals(data, range)
  return {
    focusMinutes,
    sessions: completed.length,
    stopped: sessions.length - completed.length,
    avgSession: sessions.length ? Math.round(focusMinutes / sessions.length) : null,
    completionRate: sessions.length ? completed.length / sessions.length : null,
    tasksDone: done.length,
    onTimeRate: withDeadline.length ? (withDeadline.length - late.length) / withDeadline.length : null,
    lateTasks: late.length,
    habitRate: habits.expected ? Math.min(1, habits.done / habits.expected) : null,
  }
}

/** Relative change from the previous value, or null when there's nothing to compare with. */
export function change(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null
  return (current - previous) / previous
}

export type Point = { key: string; label: string; minutes: number }

/** Focus minutes per day. A single day shows the 7 days ending on it, for context. */
export function focusTrend(sessions: Session[], range: Range): Point[] {
  const days = range.period === 'day' ? Array.from({ length: 7 }, (_, i) => addDays(range.start, i - 6)) : daysIn(range)
  const byDay = new Map<string, number>()
  for (const s of sessions) byDay.set(s.dayKey, (byDay.get(s.dayKey) ?? 0) + s.minutes)
  return days.map((key) => ({
    key,
    label: range.period === 'month' ? String(Number(key.slice(8))) : WEEK.find((w) => w.day === weekday(key))!.short,
    minutes: byDay.get(key) ?? 0,
  }))
}

const BLOCK_LABELS = ['12–3 AM', '3–6 AM', '6–9 AM', '9 AM–12 PM', '12–3 PM', '3–6 PM', '6–9 PM', '9 PM–12 AM']
const SHORT_BLOCKS = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p']

/** Focus minutes by the 3-hour block each session started in. */
export function focusByBlock(sessions: Session[], range: Range): Point[] {
  const totals = new Array(8).fill(0)
  for (const s of sessions) {
    if (inRange(range, s.dayKey)) totals[Math.floor(new Date(s.startedAt).getHours() / 3)] += s.minutes
  }
  return totals.map((minutes, i) => ({ key: BLOCK_LABELS[i], label: SHORT_BLOCKS[i], minutes }))
}

export function focusByWeekday(sessions: Session[], range: Range): Point[] {
  const totals = new Map<number, number>()
  for (const s of sessions) {
    if (inRange(range, s.dayKey)) totals.set(weekday(s.dayKey), (totals.get(weekday(s.dayKey)) ?? 0) + s.minutes)
  }
  return WEEK.map((w) => ({ key: w.short, label: w.letter, minutes: totals.get(w.day) ?? 0 }))
}

export type CategoryShare = { id: Category | 'none'; minutes: number }

/** Focus minutes by the category of the linked task; sessions without a task are 'none'. */
export function focusByCategory(sessions: Session[], tasks: Task[], range: Range): CategoryShare[] {
  const categoryOf = new Map(tasks.map((t) => [t.id, t.category]))
  const totals = new Map<CategoryShare['id'], number>()
  for (const s of sessions) {
    if (!inRange(range, s.dayKey)) continue
    const id = (s.taskId && categoryOf.get(s.taskId)) || 'none'
    totals.set(id, (totals.get(id) ?? 0) + s.minutes)
  }
  return [...CATEGORIES, 'none' as const].map((id) => ({ id, minutes: totals.get(id) ?? 0 })).filter((c) => c.minutes > 0)
}

/** The top entry, or null when every entry is zero. Ties keep the earliest. */
export function peak(points: Point[]): Point | null {
  let best: Point | null = null
  for (const p of points) if (p.minutes > 0 && (!best || p.minutes > best.minutes)) best = p
  return best
}

const PERIOD_WORD: Record<Period, string> = { day: 'day', week: 'week', month: 'month' }
const pct = (n: number) => `${Math.round(n * 100)}%`

/** A few plain sentences describing the period. Every claim comes from the numbers above. */
export function report(data: AnalyticsData, range: Range): string[] {
  const now = summarize(data, range)
  const before = summarize(data, shiftRange(range, -1))
  const word = PERIOD_WORD[range.period]
  const lines: string[] = []

  if (!now.focusMinutes && !now.tasksDone && now.habitRate === null) return [`Nothing recorded this ${word} yet.`]

  if (now.focusMinutes) {
    const delta = change(now.focusMinutes, before.focusMinutes)
    const trend =
      delta === null ? '' : Math.abs(delta) < 0.05 ? ', about the same as last ' + word : `, ${delta > 0 ? 'up' : 'down'} ${pct(Math.abs(delta))} on last ${word}`
    lines.push(`${formatMinutes(now.focusMinutes)} focused across ${now.sessions + now.stopped} session${now.sessions + now.stopped === 1 ? '' : 's'}${trend}.`)
  } else {
    lines.push(`No focus sessions this ${word}.`)
  }

  if (range.period !== 'day') {
    const byDay = focusByWeekday(data.sessions, range)
    const best = peak(byDay)
    if (best && byDay.filter((p) => p.minutes > 0).length > 1) lines.push(`Strongest day: ${fullDay(best.key)}.`)
  }

  const block = peak(focusByBlock(data.sessions, range))
  if (block) lines.push(`Most focus happens ${block.key}.`)

  if (now.tasksDone) {
    lines.push(
      now.lateTasks
        ? `You finished ${now.tasksDone} task${now.tasksDone === 1 ? '' : 's'}, ${now.lateTasks} after the deadline.`
        : `You finished ${now.tasksDone} task${now.tasksDone === 1 ? '' : 's'}${now.onTimeRate !== null ? ', all on time' : ''}.`,
    )
  }

  if (now.habitRate !== null) lines.push(`Habits: ${pct(now.habitRate)} done as planned.`)
  if (now.stopped) lines.push(`${now.stopped} session${now.stopped === 1 ? '' : 's'} ended early.`)
  return lines
}

const FULL_DAYS: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
}

function fullDay(short: string) {
  return FULL_DAYS[short] ?? short
}

/** Lock-in days for the last `weeks` weeks, Monday first, ending today. */
export function heatmapCells(days: Set<string>, minutesByDay: Map<string, number>, today: string, weeks = 26) {
  const cells: { key: string; minutes: number; lockedIn: boolean }[] = []
  for (let k = addDays(weekStart(today), -7 * (weeks - 1)); k <= today; k = addDays(k, 1)) {
    cells.push({ key: k, minutes: minutesByDay.get(k) ?? 0, lockedIn: days.has(k) })
  }
  return cells
}
