import { Check, Flame } from 'lucide-react'
import { clock, parseClock } from '../lib/dates'
import { completionRate, doneLine, streak, weekProgress, type Habit, type HabitLog } from '../lib/habits'
import styles from './Habits.module.css'

type Props = {
  habit: Habit
  keys: Set<string>
  today: string
  log: HabitLog | undefined
  overdue: boolean
  pop: boolean
  onToggle: () => void
  onOpen: () => void
}

export function HabitCard({ habit, keys, today, log, overdue, pop, onToggle, onOpen }: Props) {
  const run = streak(habit, keys, today).current
  const rate = Math.round(completionRate(habit, keys, today) * 100)

  const meta: string[] = []
  if (log) {
    meta.push(doneLine(habit, new Date(log.completedAt)))
  } else {
    if (habit.usualTime) meta.push(`${overdue ? 'Was due' : 'Usually'} ${clock(parseClock(habit.usualTime))}`)
    if (habit.targetNote) meta.push(habit.targetNote)
    if (habit.schedule.type === 'count') {
      const week = weekProgress(habit, keys, today)
      meta.push(`${week.done} of ${week.target} this week`)
    }
  }

  return (
    <li className={`${styles.card} ${log ? styles.done : ''} ${pop ? styles.pop : ''}`}>
      <button
        type="button"
        className={styles.tick}
        aria-pressed={Boolean(log)}
        aria-label={`${log ? 'Undo' : 'Complete'} ${habit.name}`}
        onClick={onToggle}
      >
        <Check size={20} strokeWidth={3} aria-hidden="true" />
      </button>
      <button type="button" className={styles.cardBody} onClick={onOpen}>
        <span className={styles.name}>{habit.name}</span>
        <span className={`${styles.meta} ${overdue && !log ? styles.overdue : ''}`}>
          <span className={styles.category}>{habit.category}</span>
          {meta.join(' · ')}
        </span>
      </button>
      <div className={styles.cardStats}>
        {run > 0 && (
          <span className={styles.streak} title="Current streak">
            <Flame size={14} aria-hidden="true" />
            <span className="num">{run}</span>
          </span>
        )}
        <span className={`${styles.rate} num`} title="Done over the last 30 days">
          {rate}%
        </span>
      </div>
    </li>
  )
}
