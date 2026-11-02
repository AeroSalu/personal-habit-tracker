import { useMemo } from 'react'
import { useSignedIn } from '../auth/authContext'
import { useHabitLogs, useHabits } from '../data/habits'
import { useSessions } from '../data/sessions'
import { useTasks } from '../data/tasks'
import { badgeStates } from '../lib/achievements'
import { levelFor, xpBreakdown } from '../lib/dashboard'
import { dayKey, weekStart } from '../lib/dates'
import { indexGame, personalBests } from '../lib/game'
import { goalXp, missionsFor, weeklyChallenge } from '../lib/missions'
import { useNow } from '../lib/useNow'

/** XP, level, badges, missions and bests for the signed-in user, worked out once per change. */
export function useGame() {
  const { user, profile } = useSignedIn()
  const uid = user.uid
  const tasks = useTasks(uid)
  const habits = useHabits(uid)
  const logs = useHabitLogs(uid)
  const sessions = useSessions(uid)
  const today = dayKey(useNow())
  const loaded = tasks.loaded && habits.loaded && logs.loaded && sessions.loaded
  const goal = profile.dailyFocusGoalMinutes

  const derived = useMemo(() => {
    const ix = indexGame({
      uid,
      focusGoal: goal,
      tasks: tasks.data,
      habits: habits.data,
      logs: logs.data,
      sessions: sessions.data,
      today,
    })
    const xp = xpBreakdown(tasks.data, habits.data, logs.data, sessions.data, today, goalXp(ix))
    return {
      ix,
      xp,
      level: levelFor(xp.total),
      badges: badgeStates(ix),
      missions: missionsFor(ix, today),
      challenge: weeklyChallenge(ix, weekStart(today)),
      bests: personalBests(ix),
    }
  }, [uid, goal, tasks.data, habits.data, logs.data, sessions.data, today])

  return { loaded, today, ...derived }
}
