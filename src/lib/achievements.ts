// Badges as pure checks over the records. Each reports how far along you are and the day
// it was earned, so a badge can't be claimed twice and disappears if the work is undone.

import { addDays, weekStart } from './dates'
import { hourOf, type GameIndex } from './game'

export type BadgeGroup = 'streaks' | 'focus' | 'tasks' | 'habits'

export type BadgeDef = {
  id: string
  name: string
  /** How to earn it, shown on locked badges too. */
  description: string
  group: BadgeGroup
  target: number
  check: (ix: GameIndex) => { current: number; earnedOn: string | null }
}

export type BadgeState = BadgeDef & { current: number; earnedOn: string | null }

/** Earned on the day the `target`-th item happened. */
function nth(days: string[], target: number) {
  return { current: days.length, earnedOn: days[target - 1] ?? null }
}

function streakTo(ix: GameIndex, target: number) {
  let run = 0
  let best = 0
  let prev = ''
  let earnedOn: string | null = null
  for (const d of ix.lockIn) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    if (!earnedOn && run >= target) earnedOn = d
    prev = d
  }
  return { current: best, earnedOn }
}

function focusHours(ix: GameIndex, hours: number) {
  let total = 0
  let earnedOn: string | null = null
  for (const s of ix.allSessions) {
    total += s.minutes
    if (!earnedOn && total >= hours * 60) earnedOn = s.dayKey
  }
  return { current: Math.floor(total / 60), earnedOn }
}

const streak = (id: string, n: number, name: string): BadgeDef => ({
  id,
  name,
  description: `Lock in ${n} days in a row.`,
  group: 'streaks',
  target: n,
  check: (ix) => streakTo(ix, n),
})

const tasks = (id: string, n: number, name: string): BadgeDef => ({
  id,
  name,
  description: `Complete ${n} tasks.`,
  group: 'tasks',
  target: n,
  check: (ix) => nth(ix.doneTasks.map((t) => t.doneDay), n),
})

export const BADGES: BadgeDef[] = [
  {
    id: 'first-lock-in',
    name: 'First Lock-In',
    description: 'Finish your first focus session, habit or task.',
    group: 'streaks',
    target: 1,
    check: (ix) => nth(ix.lockIn, 1),
  },
  streak('streak-3', 3, 'Warming Up'),
  streak('streak-7', 7, 'One Week Strong'),
  streak('streak-30', 30, 'Unbreakable'),
  streak('streak-100', 100, 'Centurion'),
  {
    id: 'perfect-week',
    name: 'Perfect Week',
    description: 'Lock in every day from Monday to Sunday.',
    group: 'streaks',
    target: 7,
    check: (ix) => {
      const perWeek = new Map<string, number>()
      let earnedOn: string | null = null
      for (const d of ix.lockIn) {
        const week = weekStart(d)
        const n = (perWeek.get(week) ?? 0) + 1
        perWeek.set(week, n)
        if (!earnedOn && n === 7) earnedOn = d
      }
      return { current: Math.max(0, ...perWeek.values()), earnedOn }
    },
  },
  {
    id: 'focus-10h',
    name: 'Ten Hours In',
    description: 'Focus for 10 hours in total.',
    group: 'focus',
    target: 10,
    check: (ix) => focusHours(ix, 10),
  },
  {
    id: 'focus-50h',
    name: 'Deep Worker',
    description: 'Focus for 50 hours in total.',
    group: 'focus',
    target: 50,
    check: (ix) => focusHours(ix, 50),
  },
  {
    id: 'deep-diver',
    name: 'Deep Diver',
    description: 'Complete a 90-minute session without leaving the app.',
    group: 'focus',
    target: 1,
    check: (ix) => nth(ix.completed.filter((s) => s.minutes >= 90 && !s.leaves.length).map((s) => s.dayKey), 1),
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Complete 5 sessions that start before 8 AM.',
    group: 'focus',
    target: 5,
    check: (ix) => nth(ix.completed.filter((s) => hourOf(s.startedAt) < 8).map((s) => s.dayKey), 5),
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Complete 5 sessions that start after 10 PM.',
    group: 'focus',
    target: 5,
    check: (ix) => nth(ix.completed.filter((s) => hourOf(s.startedAt) >= 22).map((s) => s.dayKey), 5),
  },
  {
    id: 'goal-crusher',
    name: 'Goal Crusher',
    description: 'Reach your daily focus goal on 5 days.',
    group: 'focus',
    target: 5,
    check: (ix) =>
      nth(
        [...ix.minutesByDay].filter(([, m]) => m >= ix.focusGoal).map(([d]) => d).sort(),
        5,
      ),
  },
  tasks('tasks-10', 10, 'Getting Things Done'),
  tasks('tasks-50', 50, 'Task Slayer'),
  tasks('tasks-200', 200, 'Unstoppable'),
  {
    id: 'planner',
    name: 'Planner',
    description: 'Finish 10 tasks on or before their deadline.',
    group: 'tasks',
    target: 10,
    check: (ix) => nth(ix.doneTasks.filter((t) => t.dueDate && t.doneDay <= t.dueDate).map((t) => t.doneDay), 10),
  },
  {
    id: 'habit-hero',
    name: 'Habit Hero',
    description: 'Tick the same habit 30 times.',
    group: 'habits',
    target: 30,
    check: (ix) => {
      const byHabit = new Map<string, string[]>()
      for (const l of ix.logs) byHabit.set(l.habitId, [...(byHabit.get(l.habitId) ?? []), l.dayKey])
      let current = 0
      let earnedOn: string | null = null
      for (const days of byHabit.values()) {
        const r = nth(days.sort(), 30)
        current = Math.max(current, r.current)
        if (r.earnedOn && (!earnedOn || r.earnedOn < earnedOn)) earnedOn = r.earnedOn
      }
      return { current, earnedOn }
    },
  },
]

export function badgeStates(ix: GameIndex): BadgeState[] {
  return BADGES.map((b) => ({ ...b, ...b.check(ix) }))
}
