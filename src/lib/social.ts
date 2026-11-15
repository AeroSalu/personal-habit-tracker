// What friends can see: a small summary published by your own app, and the rules for
// usernames. XP for a week or a month follows the same rules as the total in `dashboard.ts`.

import { allDoneDays, XP } from './dashboard'
import { addDays, weekStart } from './dates'
import type { GameIndex } from './game'
import { goalXp } from './missions'

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

/** Lowercases and trims what someone typed, dropping a leading @. */
export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, '').toLowerCase()
}

export function usernameError(name: string): string {
  if (name.length < 3) return 'Usernames need at least 3 characters.'
  if (name.length > 20) return 'Keep it to 20 characters or fewer.'
  if (!USERNAME_PATTERN.test(name)) return 'Use only letters, numbers and underscores.'
  return ''
}

/** XP earned from records between two day keys, inclusive. */
export function xpBetween(ix: GameIndex, from: string, to: string): number {
  const inRange = (d: string) => d >= from && d <= to
  const tasks = ix.doneTasks.filter((t) => inRange(t.doneDay)).length * XP.task
  const habits = ix.logs.filter((l) => inRange(l.dayKey)).length * XP.habit

  const perDay = new Map<string, number>()
  for (const s of ix.completed) if (inRange(s.dayKey)) perDay.set(s.dayKey, (perDay.get(s.dayKey) ?? 0) + 1)
  let sessions = 0
  for (const n of perDay.values()) sessions += Math.min(n, XP.sessionsPerDay) * XP.session

  const allDone = allDoneDays(ix.tasks, ix.habits, ix.logs, ix.today).filter(inRange).length * XP.allDone
  const goals = goalXp(ix, from, to)
  return tasks + habits + sessions + allDone + goals.missions + goals.challenges
}

export type PublicStats = {
  level: number
  xp: number
  badges: string[]
  weekKey: string
  weekXp: number
  weekFocusMinutes: number
  /** Focus minutes for each day of this week, Monday first. */
  weekFocusByDay: number[]
  seasonKey: string
  seasonXp: number
  streak: number
  focusing: { until: string } | null
  bio: string
  pinned: string[]
  updatedAt: string
}

/** The summary friends see. Never includes task names, notes or anything else private. */
export function publicStats(
  ix: GameIndex,
  input: {
    level: number
    xp: number
    badges: string[]
    streak: number
    focusingUntil: number | null
    bio?: string
    pinned?: string[]
  },
): Omit<PublicStats, 'updatedAt'> {
  const week = weekStart(ix.today)
  const season = ix.today.slice(0, 7)
  const weekEnd = addDays(week, 6)
  let weekFocusMinutes = 0
  for (const [day, minutes] of ix.minutesByDay) if (day >= week && day <= weekEnd) weekFocusMinutes += minutes
  const weekFocusByDay = Array.from({ length: 7 }, (_, i) => Math.min(ix.minutesByDay.get(addDays(week, i)) ?? 0, 24 * 60))
  return {
    level: input.level,
    xp: input.xp,
    badges: [...input.badges].sort(),
    weekKey: week,
    weekXp: xpBetween(ix, week, weekEnd),
    weekFocusMinutes: Math.min(weekFocusMinutes, 7 * 24 * 60),
    weekFocusByDay,
    seasonKey: season,
    seasonXp: xpBetween(ix, `${season}-01`, `${season}-31`),
    streak: input.streak,
    focusing: input.focusingUntil ? { until: new Date(input.focusingUntil).toISOString() } : null,
    bio: (input.bio ?? '').trim().slice(0, 80),
    pinned: (input.pinned ?? []).filter((id) => input.badges.includes(id)).slice(0, 3),
  }
}

/** A week or season total only counts while it's current; older ones read as zero. */
export function currentWeekXp(s: Pick<PublicStats, 'weekKey' | 'weekXp'>, today: string): number {
  return s.weekKey === weekStart(today) ? s.weekXp : 0
}

export function currentWeekMinutes(s: Pick<PublicStats, 'weekKey' | 'weekFocusMinutes'>, today: string): number {
  return s.weekKey === weekStart(today) ? s.weekFocusMinutes : 0
}

export function currentSeasonXp(s: Pick<PublicStats, 'seasonKey' | 'seasonXp'>, today: string): number {
  return s.seasonKey === today.slice(0, 7) ? s.seasonXp : 0
}

export function isFocusingNow(s: Pick<PublicStats, 'focusing'>, now: number): boolean {
  return Boolean(s.focusing && new Date(s.focusing.until).getTime() > now)
}
