// Reminders while the app is closed. The phone works out the next 48 hours of reminders from
// your tasks, habits and settings, rounds each to a 15-minute slot, and publishes the list
// (pushPlans/{uid}); a scheduled job sends whatever is due each slot. Nothing here talks to
// Firebase, so it's all testable.

import { addDays, dayKey, parseClock, parseDay } from './dates'
import { isDue, keysFor, type Habit, type HabitLog } from './habits'
import type { DayRecord } from './plan'
import type { Task } from './tasks'

export type ReminderPrefs = {
  /** Your choice to get reminders; each device also needs permission and a token. */
  on: boolean
  habits: boolean
  tasks: boolean
  /** Minutes before a task's time: 0 (at the time) or 15. */
  taskLead: number
  plan: boolean
  planTime: string
  review: boolean
  reviewTime: string
  streak: boolean
  /** Nothing is sent from quietStart to quietEnd (can wrap past midnight); equal means off. */
  quietStart: string
  quietEnd: string
}

export const DEFAULT_REMINDERS: ReminderPrefs = {
  on: false,
  habits: true,
  tasks: true,
  taskLead: 15,
  plan: true,
  planTime: '08:00',
  review: true,
  reviewTime: '21:00',
  streak: true,
  quietStart: '22:30',
  quietEnd: '07:00',
}

export const SLOT_MINUTES = 15
export const HORIZON_HOURS = 48
export const MAX_REMINDERS = 120
export const MAX_PER_SLOT = 4
const STREAK_TIME = '20:00'

export type Reminder = { slot: string; title: string; body: string; url: string; tag: string }

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/
const clockOr = (v: unknown, fallback: string) => (typeof v === 'string' && CLOCK.test(v) ? v : fallback)

/** Reads stored settings, filling gaps so older or partial ones still work. */
export function toReminderPrefs(data: unknown): ReminderPrefs {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const flag = (k: keyof ReminderPrefs) => (typeof d[k] === 'boolean' ? (d[k] as boolean) : (DEFAULT_REMINDERS[k] as boolean))
  return {
    on: flag('on'),
    habits: flag('habits'),
    tasks: flag('tasks'),
    taskLead: d.taskLead === 0 ? 0 : 15,
    plan: flag('plan'),
    planTime: clockOr(d.planTime, DEFAULT_REMINDERS.planTime),
    review: flag('review'),
    reviewTime: clockOr(d.reviewTime, DEFAULT_REMINDERS.reviewTime),
    streak: flag('streak'),
    quietStart: clockOr(d.quietStart, DEFAULT_REMINDERS.quietStart),
    quietEnd: clockOr(d.quietEnd, DEFAULT_REMINDERS.quietEnd),
  }
}

/** The 15-minute slot a moment falls in, as UTC "YYYY-MM-DDTHH:MMZ", the key the sender queries. */
export function slotOf(ms: number): string {
  const step = SLOT_MINUTES * 60_000
  return new Date(Math.floor(ms / step) * step).toISOString().slice(0, 16) + 'Z'
}

/** A local day key and "HH:MM" as a moment. */
function at(day: string, time: string): number {
  const d = parseDay(day)
  const m = parseClock(time)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(m / 60), m % 60).getTime()
}

/** Whether a local clock time falls in quiet hours, which can run past midnight. */
export function inQuiet(minutes: number, prefs: Pick<ReminderPrefs, 'quietStart' | 'quietEnd'>): boolean {
  const start = parseClock(prefs.quietStart)
  const end = parseClock(prefs.quietEnd)
  if (start === end) return false
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end
}

export type ReminderInput = {
  tasks: Task[]
  habits: Habit[]
  logs: HabitLog[]
  days: DayRecord[]
  prefs: ReminderPrefs
  now: Date
  /** Whether anything counted toward the streak today, and the streak so far. */
  activeToday: boolean
  streak: number
}

/** The next 48 hours of reminders, soonest first, skipping quiet hours and anything already done. */
export function planReminders(input: ReminderInput): Reminder[] {
  const { tasks, habits, logs, days, prefs, now } = input
  if (!prefs.on) return []
  const nowMs = now.getTime()
  const until = nowMs + HORIZON_HOURS * 3_600_000
  const today = dayKey(now)
  const out: { ms: number; r: Omit<Reminder, 'slot'> }[] = []
  const add = (ms: number, r: Omit<Reminder, 'slot'>) => out.push({ ms, r })

  for (const day of [today, addDays(today, 1), addDays(today, 2)]) {
    const record = days.find((d) => d.key === day)

    if (prefs.habits) {
      for (const h of habits) {
        if (h.archived || !h.usualTime) continue
        const keys = keysFor(logs, h.id)
        if (keys.has(day) || !isDue(h, keys, day)) continue
        add(at(day, h.usualTime), { title: `Time for ${h.name}`, body: h.targetNote || 'Tap to tick it off.', url: '/habits', tag: `habit-${h.id}-${day}` })
      }
    }

    if (prefs.tasks) {
      for (const t of tasks) {
        if (t.status === 'done' || t.dueDate !== day || !t.dueTime) continue
        add(at(day, t.dueTime) - prefs.taskLead * 60_000, {
          title: t.title,
          body: prefs.taskLead ? `Due in ${prefs.taskLead} minutes.` : 'Due now.',
          url: '/',
          tag: `task-${t.id}`,
        })
      }
    }

    if (prefs.plan && !record?.plannedAt) {
      add(at(day, prefs.planTime), { title: 'Plan your day', body: 'Pick today’s tasks. It takes two minutes.', url: '/plan', tag: `plan-${day}` })
    }
    if (prefs.review && !record?.reviewedAt) {
      add(at(day, prefs.reviewTime), { title: 'Wrap up your day', body: 'Move what’s left and note how it went.', url: '/plan', tag: `review-${day}` })
    }
    if (prefs.streak && input.streak > 0 && !(day === today && input.activeToday)) {
      add(at(day, STREAK_TIME), {
        title: day === today ? `Keep your ${input.streak}-day streak` : 'Keep your streak going',
        body: 'Finish one task, habit or focus session today.',
        url: '/',
        tag: `streak-${day}`,
      })
    }
  }

  const perSlot = new Map<string, number>()
  return out
    .filter(({ ms }) => ms > nowMs && ms <= until)
    .filter(({ ms }) => {
      const d = new Date(ms)
      return !inQuiet(d.getHours() * 60 + d.getMinutes(), prefs)
    })
    .sort((a, b) => a.ms - b.ms)
    .map(({ ms, r }) => ({ slot: slotOf(ms), ...r }))
    .filter((r) => {
      const n = (perSlot.get(r.slot) ?? 0) + 1
      perSlot.set(r.slot, n)
      return n <= MAX_PER_SLOT
    })
    .slice(0, MAX_REMINDERS)
}

/** The published shape: the slots to query by, and what to send in each. */
export function toPlanDoc(reminders: Reminder[]) {
  const items: Record<string, Omit<Reminder, 'slot'>[]> = {}
  for (const { slot, ...rest } of reminders) (items[slot] ??= []).push(rest)
  return { slots: Object.keys(items).sort(), items }
}
