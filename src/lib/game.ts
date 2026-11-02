// Shared input for badges, missions and personal bests: the user's records, pre-sorted and
// indexed once so each rule can scan them cheaply.

import { lockInDays } from './dashboard'
import { dayKey, weekStart } from './dates'
import type { Session } from './focus'
import type { Habit, HabitLog } from './habits'
import type { Task } from './tasks'

export type GameData = {
  uid: string
  focusGoal: number
  tasks: Task[]
  habits: Habit[]
  logs: HabitLog[]
  sessions: Session[]
  today: string
}

export type DoneTask = Task & { doneDay: string }

export type GameIndex = GameData & {
  /** Lock-in days, oldest first. */
  lockIn: string[]
  /** All saved sessions, oldest first. */
  allSessions: Session[]
  /** Completed sessions, oldest first. */
  completed: Session[]
  minutesByDay: Map<string, number>
  /** Completed tasks with the local day they were finished, oldest first. */
  doneTasks: DoneTask[]
  /** Days with any recorded activity, oldest first. Only these can earn mission XP. */
  activeDays: string[]
}

export const hourOf = (iso: string) => new Date(iso).getHours()

export function indexGame(data: GameData): GameIndex {
  const lockIn = [...lockInDays(data.sessions, data.logs, data.tasks)].sort()
  const allSessions = [...data.sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const minutesByDay = new Map<string, number>()
  for (const s of allSessions) minutesByDay.set(s.dayKey, (minutesByDay.get(s.dayKey) ?? 0) + s.minutes)
  const doneTasks = data.tasks
    .filter((t) => t.status === 'done' && t.completedAt)
    .map((t) => ({ ...t, doneDay: dayKey(new Date(t.completedAt)) }))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  const activeDays = [...new Set([...lockIn, ...allSessions.map((s) => s.dayKey)])].filter((d) => d <= data.today).sort()

  return {
    ...data,
    lockIn,
    allSessions,
    completed: allSessions.filter((s) => s.outcome === 'completed'),
    minutesByDay,
    doneTasks,
    activeDays,
  }
}

export type PersonalBests = {
  longestSession: { minutes: number; day: string } | null
  bestDay: { minutes: number; day: string } | null
  bestWeek: { minutes: number; weekOf: string } | null
  mostTasks: { count: number; day: string } | null
}

/** Records to beat. Ties keep the earliest, so a best only moves when it's actually beaten. */
export function personalBests(ix: GameIndex): PersonalBests {
  let longestSession: PersonalBests['longestSession'] = null
  for (const s of ix.allSessions) {
    if (!longestSession || s.minutes > longestSession.minutes) longestSession = { minutes: s.minutes, day: s.dayKey }
  }

  let bestDay: PersonalBests['bestDay'] = null
  const weeks = new Map<string, number>()
  for (const [day, minutes] of [...ix.minutesByDay].sort(([a], [b]) => a.localeCompare(b))) {
    if (!bestDay || minutes > bestDay.minutes) bestDay = { minutes, day }
    const week = weekStart(day)
    weeks.set(week, (weeks.get(week) ?? 0) + minutes)
  }

  let bestWeek: PersonalBests['bestWeek'] = null
  for (const [weekOf, minutes] of [...weeks].sort(([a], [b]) => a.localeCompare(b))) {
    if (!bestWeek || minutes > bestWeek.minutes) bestWeek = { minutes, weekOf }
  }

  const perDay = new Map<string, number>()
  for (const t of ix.doneTasks) perDay.set(t.doneDay, (perDay.get(t.doneDay) ?? 0) + 1)
  let mostTasks: PersonalBests['mostTasks'] = null
  for (const [day, count] of [...perDay].sort(([a], [b]) => a.localeCompare(b))) {
    if (!mostTasks || count > mostTasks.count) mostTasks = { count, day }
  }

  return { longestSession, bestDay, bestWeek, mostTasks }
}
