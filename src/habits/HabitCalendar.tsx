import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, dayKey, parseDay, WEEK, weekStart } from '../lib/dates'
import { dayState, type Habit } from '../lib/habits'
import styles from './Habits.module.css'

const LABEL = { done: 'done', missed: 'missed', due: 'due today', off: 'not scheduled', future: '' }

/** One month of done, missed and unscheduled days, Monday first. */
export function HabitCalendar({ habit, keys, today }: { habit: Habit; keys: Set<string>; today: string }) {
  const [month, setMonth] = useState(() => today.slice(0, 7))
  const first = `${month}-01`
  const firstDate = parseDay(first)
  const nextMonth = dayKey(new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 1, 12)).slice(0, 7)
  const prevMonth = dayKey(new Date(firstDate.getFullYear(), firstDate.getMonth() - 1, 1, 12)).slice(0, 7)

  const cells: string[] = []
  for (let k = weekStart(first); k < `${nextMonth}-01` || cells.length % 7; k = addDays(k, 1)) cells.push(k)

  return (
    <div className={styles.calendar}>
      <div className={styles.calendarHead}>
        <button type="button" onClick={() => setMonth(prevMonth)} aria-label="Previous month">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <p>{firstDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}</p>
        <button type="button" onClick={() => setMonth(nextMonth)} aria-label="Next month" disabled={month >= today.slice(0, 7)}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.calendarGrid}>
        {WEEK.map((w) => (
          <span key={w.day} className={styles.calendarWeekday}>
            {w.letter}
          </span>
        ))}
        {cells.map((k) => {
          const state = dayState(habit, keys, k, today)
          const inMonth = k.startsWith(month)
          return (
            <span
              key={k}
              className={`${styles.day} ${styles[state]} ${inMonth ? '' : styles.outside}`}
              title={`${parseDay(k).toLocaleDateString()}${LABEL[state] ? `: ${LABEL[state]}` : ''}`}
            >
              {Number(k.slice(8))}
            </span>
          )
        })}
      </div>
      <p className={styles.legend}>
        <span className={styles.done} /> Done <span className={styles.missed} /> Missed
      </p>
    </div>
  )
}
