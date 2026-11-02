// Dashboard numbers: the lock-in streak, XP and level, and the daily productivity score.
// Everything is derived from stored records, never stored itself, so it can't drift or be
// claimed twice, and every number can be explained.

import { addDays, dayKey, weekday } from './dates'
import type { Habit, HabitLog } from './habits'
import type { Session } from './focus'
import type { Task } from './tasks'

/** Days with any finished work: a completed focus session, a habit tick or a completed task. */
export function lockInDays(sessions: Session[], logs: HabitLog[], tasks: Task[]): Set<string> {
  const days = new Set<string>()
  for (const s of sessions) if (s.outcome === 'completed') days.add(s.dayKey)
  for (const l of logs) days.add(l.dayKey)
  for (const t of tasks) if (t.status === 'done' && t.completedAt) days.add(dayKey(new Date(t.completedAt)))
  return days
}

/** Consecutive lock-in days up to today. Today only extends the streak; it can't break it yet. */
export function lockInStreak(days: Set<string>, today: string) {
  let current = 0
  let k = days.has(today) ? today : addDays(today, -1)
  while (days.has(k)) {
    current += 1
    k = addDays(k, -1)
  }
  let best = 0
  let run = 0
  let prev = ''
  for (const d of [...days].sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return { current, best: Math.max(best, current) }
}

// ---- XP ----

export const XP = {
  task: 10,
  habit: 10,
  session: 20,
  allDone: 50,
  /** Only this many completed sessions a day earn XP, so a timer left running can't farm it. */
  sessionsPerDay: 8,
} as const

/** Exact-day habits scheduled on a day; weekly-count habits have no fixed day, so they're left out. */
function habitsScheduledOn(habits: Habit[], key: string): Habit[] {
  return habits.filter(
    (h) =>
      !h.archived &&
      h.schedule.type === 'days' &&
      h.schedule.days.includes(weekday(key)) &&
      (!h.createdAt || dayKey(new Date(h.createdAt)) <= key),
  )
}

/**
 * The days where everything due was done on time: every task due that day completed by the
 * end of it and every exact-day habit scheduled that day ticked, with at least one of either.
 * Finishing a task late never earns its day the bonus after the fact.
 */
export function allDoneDays(tasks: Task[], habits: Habit[], logs: HabitLog[], today: string): string[] {
  const ticked = new Set(logs.map((l) => `${l.habitId}_${l.dayKey}`))
  const candidates = new Set<string>([...logs.map((l) => l.dayKey), ...tasks.filter((t) => t.dueDate).map((t) => t.dueDate)])
  return [...candidates]
    .filter((d) => d <= today)
    .filter((d) => {
      const due = tasks.filter((t) => t.dueDate === d)
      const scheduled = habitsScheduledOn(habits, d)
      if (!due.length && !scheduled.length) return false
      const onTime = (t: Task) =>
        t.status === 'done' && (!t.completedAt || dayKey(new Date(t.completedAt)) <= d)
      return due.every(onTime) && scheduled.every((h) => ticked.has(`${h.id}_${d}`))
    })
    .sort()
}

export type XpBreakdown = { tasks: number; habits: number; sessions: number; allDone: number; total: number }

export function xpBreakdown(
  tasks: Task[],
  habits: Habit[],
  logs: HabitLog[],
  sessions: Session[],
  today: string,
): XpBreakdown {
  const doneTasks = tasks.filter((t) => t.status === 'done').length * XP.task
  const habitTicks = logs.length * XP.habit

  const perDay = new Map<string, number>()
  for (const s of sessions) if (s.outcome === 'completed') perDay.set(s.dayKey, (perDay.get(s.dayKey) ?? 0) + 1)
  let sessionXp = 0
  for (const n of perDay.values()) sessionXp += Math.min(n, XP.sessionsPerDay) * XP.session

  const bonus = allDoneDays(tasks, habits, logs, today).length * XP.allDone
  return {
    tasks: doneTasks,
    habits: habitTicks,
    sessions: sessionXp,
    allDone: bonus,
    total: doneTasks + habitTicks + sessionXp + bonus,
  }
}

/** Level n needs 100·n more XP than level n−1: 0, 100, 300, 600, 1000… */
export function levelFor(xp: number) {
  let level = 1
  let floor = 0
  while (xp >= floor + level * 100) {
    floor += level * 100
    level += 1
  }
  const needed = level * 100
  return { level, into: xp - floor, needed, share: (xp - floor) / needed }
}

// ---- Today ----

/** Tasks that belong to today: due today or overdue and still open, plus those finished today. */
export function todaysTasks(tasks: Task[], today: string) {
  const relevant = tasks.filter((t) => {
    if (!t.dueDate || t.dueDate > today) return false
    if (t.status !== 'done') return true
    return t.completedAt ? dayKey(new Date(t.completedAt)) === today : t.dueDate === today
  })
  return {
    done: relevant.filter((t) => t.status === 'done'),
    pending: relevant.filter((t) => t.status !== 'done'),
  }
}

/** Open tasks due in the next `days` days, overdue first, then by deadline. */
export function upcomingDeadlines(tasks: Task[], today: string, days = 7): Task[] {
  const until = addDays(today, days)
  return tasks
    .filter((t) => t.status !== 'done' && t.dueDate && t.dueDate <= until)
    .sort((a, b) => `${a.dueDate} ${a.dueTime || '99'}`.localeCompare(`${b.dueDate} ${b.dueTime || '99'}`))
}

// ---- Productivity score ----

export type ScorePart = { id: 'focus' | 'tasks' | 'habits'; label: string; weight: number; value: number; detail: string }

const WEIGHTS = { focus: 40, tasks: 35, habits: 25 }

/**
 * An explainable 0–100 for the day: 40% focus goal, 35% today's tasks, 25% today's habits.
 * A part with nothing due today hands its weight to the others, so a day with no tasks
 * isn't marked down for them.
 */
export function productivityScore(input: {
  focusMinutes: number
  focusGoal: number
  tasksDone: number
  tasksTotal: number
  habitsDone: number
  habitsTotal: number
}) {
  const parts: ScorePart[] = [
    {
      id: 'focus',
      label: 'Focus goal',
      weight: WEIGHTS.focus,
      value: Math.min(1, input.focusMinutes / Math.max(1, input.focusGoal)),
      detail: `${input.focusMinutes} of ${input.focusGoal} min`,
    },
  ]
  if (input.tasksTotal) {
    parts.push({
      id: 'tasks',
      label: 'Tasks due',
      weight: WEIGHTS.tasks,
      value: input.tasksDone / input.tasksTotal,
      detail: `${input.tasksDone} of ${input.tasksTotal} done`,
    })
  }
  if (input.habitsTotal) {
    parts.push({
      id: 'habits',
      label: 'Habits due',
      weight: WEIGHTS.habits,
      value: input.habitsDone / input.habitsTotal,
      detail: `${input.habitsDone} of ${input.habitsTotal} done`,
    })
  }
  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0)
  const scaled = parts.map((p) => ({ ...p, weight: Math.round((p.weight / totalWeight) * 100) }))
  const score = Math.round(parts.reduce((sum, p) => sum + (p.weight / totalWeight) * p.value * 100, 0))
  return { score, parts: scaled }
}

// ---- Words ----

export function greeting(hour: number): string {
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const LINES = [
  'Plan less. Start sooner.',
  'One focused hour beats a busy day.',
  'Show up first. Motivation follows.',
  'Do the hard thing while you are fresh.',
  'Small reps, every day, add up.',
  'Finish one thing before starting the next.',
  'The streak is built today, not tomorrow.',
  'Protect your first focus block.',
  'Progress over perfect.',
  'Make it easy to start: open the task, set the timer.',
  'You do not need more time. You need fewer tabs.',
  'Consistency is a decision you make again each morning.',
]

/** One line per day, the same all day on every device. */
export function lineFor(key: string): string {
  const n = [...key].reduce((sum, c) => sum + c.charCodeAt(0), 0)
  return LINES[n % LINES.length]
}
