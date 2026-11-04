import {
  addDays,
  clock,
  dayKey,
  daysBetween,
  minutesOfDay,
  parseClock,
  span,
  WEEK,
  weekday,
  weekStart,
} from './dates'

export type Schedule = { type: 'days'; days: number[] } | { type: 'count'; perWeek: number }

export const CATEGORIES = ['study', 'work', 'fitness', 'personal'] as const
export type Category = (typeof CATEGORIES)[number]

export type Habit = {
  id: string
  name: string
  category: Category
  schedule: Schedule
  /** "18:00", or '' when there is no usual time. */
  usualTime: string
  /** Free text such as "45 minutes" or "2 problems". */
  targetNote: string
  archived: boolean
  createdAt: string
  /** Show each tick in friends' feeds. Off unless chosen. */
  shared?: boolean
}

export type HabitFields = Pick<Habit, 'name' | 'category' | 'schedule' | 'usualTime' | 'targetNote' | 'shared'>

/** One per habit per day; its document ID is `${habitId}_${dayKey}`. */
export type HabitLog = {
  id: string
  habitId: string
  dayKey: string
  completedAt: string
  note: string
}

export function logId(habitId: string, key: string): string {
  return `${habitId}_${key}`
}

export function keysFor(logs: HabitLog[], habitId: string): Set<string> {
  return new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.dayKey))
}

function doneInWeek(keys: Set<string>, today: string): number {
  const start = weekStart(today)
  const end = addDays(start, 6)
  return [...keys].filter((k) => k >= start && k <= end).length
}

function scheduledOn(habit: Habit, key: string): boolean {
  return habit.schedule.type === 'days' && habit.schedule.days.includes(weekday(key))
}

/** Weekly-count habits stay due until the week's number is reached, and on the day they were done. */
export function isDue(habit: Habit, keys: Set<string>, today: string): boolean {
  if (habit.schedule.type === 'days') return scheduledOn(habit, today)
  return keys.has(today) || doneInWeek(keys, today) < habit.schedule.perWeek
}

export function weekProgress(habit: Habit, keys: Set<string>, today: string) {
  if (habit.schedule.type === 'count') {
    return { done: doneInWeek(keys, today), target: habit.schedule.perWeek }
  }
  const scheduled = new Set([...keys].filter((k) => scheduledOn(habit, k)))
  return { done: doneInWeek(scheduled, today), target: habit.schedule.days.length }
}

function runs(hits: boolean[]) {
  let best = 0
  let run = 0
  for (const hit of hits) {
    run = hit ? run + 1 : 0
    best = Math.max(best, run)
  }
  return { current: run, best }
}

// A period still in progress can extend a streak but never breaks one.
function dayStreak(habit: Habit, keys: Set<string>, today: string) {
  const hits: boolean[] = []
  for (let k = [...keys].sort()[0]; k < today; k = addDays(k, 1)) {
    if (scheduledOn(habit, k)) hits.push(keys.has(k))
  }
  if (keys.has(today) && scheduledOn(habit, today)) hits.push(true)
  return runs(hits)
}

function weekStreak(habit: Habit & { schedule: { type: 'count' } }, keys: Set<string>, today: string) {
  const current = weekStart(today)
  const hits: boolean[] = []
  for (let w = weekStart([...keys].sort()[0]); w < current; w = addDays(w, 7)) {
    hits.push(doneInWeek(keys, w) >= habit.schedule.perWeek)
  }
  if (doneInWeek(keys, today) >= habit.schedule.perWeek) hits.push(true)
  return runs(hits)
}

export function streak(habit: Habit, keys: Set<string>, today: string) {
  if (!keys.size) return { current: 0, best: 0 }
  if (habit.schedule.type === 'days') return dayStreak(habit, keys, today)
  return weekStreak(habit as Habit & { schedule: { type: 'count' } }, keys, today)
}

export function streakLabel(habit: Habit, count: number): string {
  const unit = habit.schedule.type === 'days' ? 'day' : 'week'
  return `${count} ${unit}${count === 1 ? '' : 's'}`
}

/**
 * Share of expected completions over the last 30 days, or since the habit was created if
 * that is later. Today only counts once done, so an unfinished morning doesn't drag it down.
 */
export function completionRate(habit: Habit, keys: Set<string>, today: string): number {
  const created = habit.createdAt ? dayKey(new Date(habit.createdAt)) : today
  const from = created > addDays(today, -29) ? created : addDays(today, -29)
  const inWindow = [...keys].filter((k) => k >= from && k <= today)

  if (habit.schedule.type === 'days') {
    let expected = 0
    for (let k = from; k < today; k = addDays(k, 1)) if (scheduledOn(habit, k)) expected += 1
    if (keys.has(today) && scheduledOn(habit, today)) expected += 1
    const done = inWindow.filter((k) => scheduledOn(habit, k)).length
    return expected ? Math.min(1, done / expected) : 0
  }

  const days = daysBetween(from, today) + 1
  const expected = Math.max(1, Math.round((habit.schedule.perWeek * days) / 7))
  return Math.min(1, inWindow.length / expected)
}

/** Day states for a habit calendar. */
export function dayState(
  habit: Habit,
  keys: Set<string>,
  key: string,
  today: string,
): 'done' | 'missed' | 'due' | 'off' | 'future' {
  if (keys.has(key)) return 'done'
  if (key > today) return 'future'
  const created = habit.createdAt ? dayKey(new Date(habit.createdAt)) : key
  if (key < created || !scheduledOn(habit, key)) return 'off'
  return key === today ? 'due' : 'missed'
}

/** "Done at 5:48 PM, 12 min earlier than usual" */
export function doneLine(habit: Pick<Habit, 'usualTime'>, completedAt: Date): string {
  const at = minutesOfDay(completedAt)
  const line = `Done at ${clock(at)}`
  if (!habit.usualTime) return line
  const diff = at - parseClock(habit.usualTime)
  if (diff === 0) return `${line}, right on time`
  return `${line}, ${span(Math.abs(diff))} ${diff < 0 ? 'earlier' : 'later'} than usual`
}

export function averageTime(logs: HabitLog[]): number | null {
  if (!logs.length) return null
  const total = logs.reduce((sum, l) => sum + minutesOfDay(new Date(l.completedAt)), 0)
  return Math.round(total / logs.length)
}

/** Due today, not done, and its usual time has passed. */
export function isOverdue(habit: Habit, keys: Set<string>, now: Date): boolean {
  const today = dayKey(now)
  return (
    Boolean(habit.usualTime) &&
    !keys.has(today) &&
    isDue(habit, keys, today) &&
    minutesOfDay(now) > parseClock(habit.usualTime)
  )
}

export function scheduleLabel(schedule: Schedule): string {
  if (schedule.type === 'count') {
    return schedule.perWeek === 1 ? 'Once a week' : `${schedule.perWeek} times a week`
  }
  if (schedule.days.length === 7) return 'Every day'
  if (schedule.days.length === 5 && [1, 2, 3, 4, 5].every((d) => schedule.days.includes(d))) {
    return 'Weekdays'
  }
  return WEEK.filter((w) => schedule.days.includes(w.day))
    .map((w) => w.short)
    .join(', ')
}

export function habitError(fields: HabitFields): string {
  if (!fields.name.trim()) return 'Give the habit a name.'
  if (fields.name.trim().length > 80) return 'Keep the name under 80 characters.'
  if (fields.schedule.type === 'days' && !fields.schedule.days.length) return 'Pick at least one day.'
  if (fields.schedule.type === 'count') {
    const n = fields.schedule.perWeek
    if (!Number.isInteger(n) || n < 1 || n > 7) return 'Choose 1 to 7 times a week.'
  }
  return ''
}

/** Due habits first by usual time, then by name. */
export function byUsualTime(a: Habit, b: Habit): number {
  return (a.usualTime || '99').localeCompare(b.usualTime || '99') || a.name.localeCompare(b.name)
}
