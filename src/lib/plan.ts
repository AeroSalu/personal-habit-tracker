// Daily planning and reviews: when Today offers each, what to choose from, whether the day
// is overloaded, the day's timeline, and moving unfinished tasks on.

import { addDays, minutesOfDay, weekday, weekStart } from './dates'
import type { Habit } from './habits'
import { compareTasks, type Task } from './tasks'

/** users/{uid}/days/{dayKey}: whether the day was planned and reviewed, and how it went. */
export type DayRecord = {
  key: string
  plannedAt: string
  reviewedAt: string
  /** 1–5, or 0 when not rated. */
  rating: number
  note: string
  /** Up to 3 short wins. */
  wins: string[]
}

/** users/{uid}/weeks/{weekStart}: that week's review, and the focus tasks picked for it. */
export type WeekRecord = { key: string; reviewedAt: string; note: string; focus: string[] }

export const MAX_WINS = 3
export const MAX_FOCUS = 3
export const MAX_NOTE = 500
/** The plan prompt shows until early afternoon; the evening review from 6 PM. */
export const PLAN_UNTIL_HOUR = 14
export const REVIEW_FROM_HOUR = 18
/** Planning assumes the day ends at 10 PM. */
export const DAY_END_HOUR = 22

/** The week a weekly review covers: this one at the weekend, otherwise the one just gone. */
export function reviewWeekStart(today: string): string {
  const d = weekday(today)
  const start = weekStart(today)
  return d === 0 || d === 6 ? start : addDays(start, -7)
}

/**
 * The one gentle prompt Today shows, if any: the weekly review on Sunday (or Saturday
 * evening), the evening review after 6 PM, or planning until 2 PM. Each goes once it's done.
 */
export function todayPrompt(now: Date, day: DayRecord | null, weekReviewed: boolean): 'plan' | 'review' | 'week' | null {
  const hour = now.getHours()
  const d = now.getDay()
  if (!weekReviewed && (d === 0 || (d === 6 && hour >= REVIEW_FROM_HOUR))) return 'week'
  if (hour >= REVIEW_FROM_HOUR && !day?.reviewedAt) return 'review'
  if (hour < PLAN_UNTIL_HOUR && !day?.plannedAt) return 'plan'
  return null
}

/** Open tasks to plan from: overdue, due today, with no date, and due in the coming week. */
export function planGroups(tasks: Task[], today: string) {
  const open = tasks.filter((t) => t.status !== 'done').sort(compareTasks)
  const soonEnd = addDays(today, 7)
  return {
    overdue: open.filter((t) => t.dueDate && t.dueDate < today),
    today: open.filter((t) => t.dueDate === today),
    undated: open.filter((t) => !t.dueDate),
    soon: open.filter((t) => t.dueDate > today && t.dueDate <= soonEnd),
  }
}

/** Estimated minutes of today's open tasks against the minutes left before 10 PM. */
export function planLoad(planned: Task[], now: Date) {
  const open = planned.filter((t) => t.status !== 'done')
  const estimate = open.reduce((sum, t) => sum + t.estimateMinutes, 0)
  const free = Math.max(0, DAY_END_HOUR * 60 - minutesOfDay(now))
  return { estimate, unestimated: open.filter((t) => !t.estimateMinutes).length, free, over: estimate > free }
}

export type AgendaItem = { kind: 'task' | 'habit'; id: string; title: string; time: string; minutes: number; done: boolean }

/** Today's timeline: timed tasks and habits in time order, then tasks for any time. */
export function agenda(tasks: Task[], dueHabits: Habit[], ticked: Set<string>, today: string) {
  const mine = tasks.filter((t) => t.dueDate === today)
  const timed: AgendaItem[] = [
    ...mine
      .filter((t) => t.dueTime)
      .map((t) => ({ kind: 'task' as const, id: t.id, title: t.title, time: t.dueTime, minutes: t.estimateMinutes, done: t.status === 'done' })),
    ...dueHabits
      .filter((h) => h.usualTime)
      .map((h) => ({ kind: 'habit' as const, id: h.id, title: h.name, time: h.usualTime, minutes: 0, done: ticked.has(h.id) })),
  ].sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title))
  const anytime: AgendaItem[] = mine
    .filter((t) => !t.dueTime)
    .sort(compareTasks)
    .map((t) => ({ kind: 'task', id: t.id, title: t.title, time: '', minutes: t.estimateMinutes, done: t.status === 'done' }))
  return { timed, anytime }
}

/**
 * Where an unfinished task goes from the evening review: tomorrow at the same time, or off
 * the calendar. A repeating task needs a date, so it can only move, never lose its date.
 */
export function carry(task: Pick<Task, 'dueTime' | 'recurrence'>, choice: 'tomorrow' | 'undated', today: string) {
  if (choice === 'tomorrow') return { dueDate: addDays(today, 1), dueTime: task.dueTime }
  return task.recurrence.type === 'none' ? { dueDate: '', dueTime: '' } : null
}

/** Unfinished tasks the evening review asks about: due today or earlier and still open. */
export function leftToday(tasks: Task[], today: string): Task[] {
  return tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate <= today).sort(compareTasks)
}

/** Days of a week that have a review, Monday first, for the weekly review. */
export function weekDays(days: DayRecord[], start: string): DayRecord[] {
  const end = addDays(start, 6)
  return days.filter((d) => d.key >= start && d.key <= end && (d.reviewedAt || d.note || d.rating)).sort((a, b) => a.key.localeCompare(b.key))
}
