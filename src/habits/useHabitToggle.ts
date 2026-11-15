import { useToast } from '../components/toast'
import { logHabit, unlogHabit } from '../data/habits'
import { doneLine, streak, streakLabel, type Habit } from '../lib/habits'

/**
 * Ticks or unticks a habit for today, with the "Done at…" message. Returns true when the
 * habit was just completed, so the caller can play its tick animation.
 */
export function useHabitToggle(uid: string) {
  const toast = useToast()
  const failed = () => toast('That change could not be saved. Check your connection.')

  return (habit: Habit, keys: Set<string>, today: string): boolean => {
    if (keys.has(today)) {
      unlogHabit(uid, habit, today).catch(failed)
      return false
    }
    const at = new Date()
    logHabit(uid, habit, at).catch(failed)
    const run = streak(habit, new Set([...keys, today]), today).current
    toast(`${doneLine(habit, at)}${run > 1 ? ` · ${streakLabel(habit, run)} streak` : ''}`, {
      label: 'Undo',
      run: () => unlogHabit(uid, habit, today).catch(failed),
    })
    return true
  }
}
