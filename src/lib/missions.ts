// Daily missions and the weekly challenge. They're picked by a seed made from the user and
// the date, so every device shows the same ones without storing anything, and their XP is
// worked out from the records like everything else.

import { habitsScheduledOn } from './dashboard'
import { addDays, dayKey, weekStart } from './dates'
import { hourOf, type GameIndex } from './game'

export const MISSION_XP = 15
export const ALL_MISSIONS_BONUS = 30
export const CHALLENGE_XP = 100
export const MISSIONS_PER_DAY = 3

/** Deterministic random numbers in [0, 1) from a string (cyrb53-style hash into mulberry32). */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(items: T[], n: number, random: () => number): T[] {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list.slice(0, n)
}

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5)

export type Goal = { id: string; title: string; current: number; target: number; done: boolean; unit?: 'min' }

type MissionDef = {
  id: string
  /** Decided from records made before the day, so the day's picks never change mid-day. */
  eligible: (ix: GameIndex, day: string) => boolean
  build: (ix: GameIndex, day: string) => Omit<Goal, 'done' | 'id'>
}

const createdBefore = (iso: string, day: string) => Boolean(iso) && dayKey(new Date(iso)) < day
const sessionsOn = (ix: GameIndex, day: string) => ix.allSessions.filter((s) => s.dayKey === day)

const MISSIONS: MissionDef[] = [
  {
    id: 'focus',
    eligible: () => true,
    build: (ix, day) => {
      const target = Math.max(25, round5(ix.focusGoal / 2))
      return { title: `Focus for ${target} minutes`, current: ix.minutesByDay.get(day) ?? 0, target, unit: 'min' }
    },
  },
  {
    id: 'morning',
    eligible: () => true,
    build: (ix, day) => {
      const target = ix.focusGoal >= 100 ? 50 : 25
      const current = sessionsOn(ix, day)
        .filter((s) => hourOf(s.startedAt) < 12)
        .reduce((sum, s) => sum + s.minutes, 0)
      return { title: `Focus ${target} minutes before noon`, current, target, unit: 'min' }
    },
  },
  {
    id: 'clean',
    eligible: () => true,
    build: (ix, day) => ({
      title: 'Complete 2 sessions without leaving the app',
      current: ix.completed.filter((s) => s.dayKey === day && !s.leaves.length).length,
      target: 2,
    }),
  },
  {
    id: 'long',
    eligible: () => true,
    build: (ix, day) => ({
      title: 'Complete a session of 50 minutes or more',
      current: ix.completed.filter((s) => s.dayKey === day && s.minutes >= 50).length,
      target: 1,
    }),
  },
  {
    id: 'early',
    eligible: () => true,
    build: (ix, day) => ({
      title: 'Start a focus session before 9 AM',
      current: sessionsOn(ix, day).filter((s) => hourOf(s.startedAt) < 9).length,
      target: 1,
    }),
  },
  {
    id: 'tasks',
    eligible: (ix, day) => ix.tasks.some((t) => createdBefore(t.createdAt, day)),
    build: (ix, day) => ({
      title: 'Complete 3 tasks',
      current: ix.doneTasks.filter((t) => t.doneDay === day).length,
      target: 3,
    }),
  },
  {
    id: 'on-time',
    eligible: (ix, day) => ix.tasks.some((t) => t.dueDate && createdBefore(t.createdAt, day)),
    build: (ix, day) => ({
      title: 'Finish a task before its deadline',
      current: ix.doneTasks.filter((t) => t.doneDay === day && t.dueDate && day <= t.dueDate).length,
      target: 1,
    }),
  },
  {
    id: 'habits',
    eligible: (ix, day) => ix.habits.filter((h) => !h.archived && createdBefore(h.createdAt, day)).length >= 2,
    build: (ix, day) => ({
      title: 'Tick 2 habits',
      current: ix.logs.filter((l) => l.dayKey === day).length,
      target: 2,
    }),
  },
]

function finish(id: string, g: Omit<Goal, 'done' | 'id'>): Goal {
  return { id, ...g, current: Math.min(g.current, g.target), done: g.current >= g.target }
}

export function missionsFor(ix: GameIndex, day: string): Goal[] {
  const eligible = MISSIONS.filter((m) => m.eligible(ix, day))
  return pick(eligible, MISSIONS_PER_DAY, seeded(`${ix.uid}:${day}`)).map((m) => finish(m.id, m.build(ix, day)))
}

type ChallengeDef = MissionDef

const daysOfWeek = (ix: GameIndex, start: string) =>
  Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter((d) => d <= ix.today)

const CHALLENGES: ChallengeDef[] = [
  {
    id: 'focus-hours',
    eligible: () => true,
    build: (ix, start) => {
      const target = Math.max(180, Math.round((ix.focusGoal * 5) / 30) * 30)
      const current = daysOfWeek(ix, start).reduce((sum, d) => sum + (ix.minutesByDay.get(d) ?? 0), 0)
      return { title: `Focus for ${target / 60} hours this week`, current, target, unit: 'min' }
    },
  },
  {
    id: 'lock-in-days',
    eligible: () => true,
    build: (ix, start) => ({
      title: 'Lock in on 6 days this week',
      current: daysOfWeek(ix, start).filter((d) => ix.lockIn.includes(d)).length,
      target: 6,
    }),
  },
  {
    id: 'sessions',
    eligible: () => true,
    build: (ix, start) => {
      const days = new Set(daysOfWeek(ix, start))
      return {
        title: 'Complete 10 focus sessions this week',
        current: ix.completed.filter((s) => days.has(s.dayKey)).length,
        target: 10,
      }
    },
  },
  {
    id: 'tasks',
    eligible: (ix, start) => ix.tasks.some((t) => createdBefore(t.createdAt, start)),
    build: (ix, start) => {
      const days = new Set(daysOfWeek(ix, start))
      return {
        title: 'Complete 10 tasks this week',
        current: ix.doneTasks.filter((t) => days.has(t.doneDay)).length,
        target: 10,
      }
    },
  },
  {
    id: 'habit-days',
    eligible: (ix, start) =>
      ix.habits.some((h) => !h.archived && h.schedule.type === 'days' && createdBefore(h.createdAt, start)),
    build: (ix, start) => {
      const ticked = new Set(ix.logs.map((l) => `${l.habitId}_${l.dayKey}`))
      const current = daysOfWeek(ix, start).filter((d) => {
        const due = habitsScheduledOn(ix.habits, d)
        return due.length > 0 && due.every((h) => ticked.has(`${h.id}_${d}`))
      }).length
      return { title: 'Tick every habit due on 5 days this week', current, target: 5 }
    },
  },
]

/** The week's challenge; `week` is its Monday. */
export function weeklyChallenge(ix: GameIndex, week: string): Goal {
  const eligible = CHALLENGES.filter((c) => c.eligible(ix, week))
  const [chosen] = pick(eligible, 1, seeded(`${ix.uid}:week:${week}`))
  return finish(chosen.id, chosen.build(ix, week))
}

/** XP from every mission and challenge completed so far. */
export function goalXp(ix: GameIndex) {
  let missions = 0
  for (const day of ix.activeDays) {
    const list = missionsFor(ix, day)
    const done = list.filter((m) => m.done).length
    missions += done * MISSION_XP + (list.length && done === list.length ? ALL_MISSIONS_BONUS : 0)
  }
  let challenges = 0
  for (const week of new Set(ix.activeDays.map(weekStart))) {
    if (weeklyChallenge(ix, week).done) challenges += CHALLENGE_XP
  }
  return { missions, challenges }
}
