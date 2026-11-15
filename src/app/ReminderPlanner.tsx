import { useEffect, useMemo, useRef } from 'react'
import { useSignedIn } from '../auth/authContext'
import { useDays } from '../data/days'
import { useHabitLogs, useHabits } from '../data/habits'
import { publishPlan } from '../data/push'
import { useTasks } from '../data/tasks'
import { lockInStreak } from '../lib/dashboard'
import { planReminders, toPlanDoc } from '../lib/reminders'
import { useNow } from '../lib/useNow'
import { useGame } from '../game/useGame'

const MIN_GAP_MS = 60_000

/**
 * Keeps the next 48 hours of reminders published for the scheduled sender, at most once a
 * minute and only when they change. Any of your devices can publish; they all work out the
 * same list. When reminders are switched off, it publishes an empty list once.
 */
export function ReminderPlanner() {
  const { user, profile } = useSignedIn()
  const uid = user.uid
  const tasks = useTasks(uid)
  const habits = useHabits(uid)
  const logs = useHabitLogs(uid)
  const days = useDays(uid)
  const { ix, today } = useGame()
  const now = useNow()
  const prefs = profile.reminders
  const loaded = tasks.loaded && habits.loaded && logs.loaded && days.loaded

  const plan = useMemo(() => {
    const lockIn = new Set(ix.lockIn)
    return toPlanDoc(
      planReminders({
        tasks: tasks.data,
        habits: habits.data,
        logs: logs.data,
        days: days.data,
        prefs,
        now,
        activeToday: lockIn.has(today),
        streak: lockInStreak(lockIn, today).current,
      }),
    )
  }, [tasks.data, habits.data, logs.data, days.data, prefs, now, ix.lockIn, today])
  const key = JSON.stringify(plan)

  const last = useRef({ key: '', at: 0, published: false })

  useEffect(() => {
    if (!loaded) return
    // Off and never published here: nothing to clear, so don't create a document.
    if (!prefs.on && !last.current.published) return
    if (last.current.key === key) return
    const wait = Math.max(0, last.current.at + MIN_GAP_MS - Date.now())
    const timer = setTimeout(() => {
      publishPlan(uid, plan).catch(() => {})
      last.current = { key, at: Date.now(), published: plan.slots.length > 0 }
    }, wait)
    return () => clearTimeout(timer)
  }, [loaded, prefs.on, key, plan, uid])

  return null
}
