import { useState } from 'react'
import { Dialog } from '../components/Dialog'
import { clock, minutesOfDay, parseClock, parseDay } from '../lib/dates'
import {
  averageTime,
  completionRate,
  scheduleLabel,
  streak,
  streakLabel,
  type Habit,
  type HabitLog,
} from '../lib/habits'
import { HabitCalendar } from './HabitCalendar'
import ui from '../components/ui.module.css'
import styles from './Habits.module.css'

type Props = {
  habit: Habit
  logs: HabitLog[]
  keys: Set<string>
  today: string
  onSaveNote: (log: HabitLog, note: string) => void
  onEdit: () => void
  onClose: () => void
}

export function HabitDetail({ habit, logs, keys, today, onSaveNote, onEdit, onClose }: Props) {
  const run = streak(habit, keys, today)
  const average = averageTime(logs)
  const todayLog = logs.find((l) => l.dayKey === today)
  const [note, setNote] = useState(todayLog?.note ?? '')
  const history = [...logs].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 12)

  const facts = [scheduleLabel(habit.schedule)]
  if (habit.usualTime) facts.push(`usually ${clock(parseClock(habit.usualTime))}`)
  if (habit.targetNote) facts.push(habit.targetNote)

  return (
    <Dialog title={habit.name} onClose={onClose}>
      <p className={styles.detailFacts}>
        <span className={styles.category}>{habit.category}</span>
        {facts.join(' · ')}
      </p>

      <dl className={styles.stats}>
        <div>
          <dt>Streak</dt>
          <dd className="num">{streakLabel(habit, run.current)}</dd>
        </div>
        <div>
          <dt>Best</dt>
          <dd className="num">{streakLabel(habit, run.best)}</dd>
        </div>
        <div>
          <dt>Last 30 days</dt>
          <dd className="num">{Math.round(completionRate(habit, keys, today) * 100)}%</dd>
        </div>
        <div>
          <dt>Avg. finish</dt>
          <dd className="num">{average === null ? '–' : clock(average)}</dd>
        </div>
      </dl>

      <HabitCalendar habit={habit} keys={keys} today={today} />

      {todayLog && (
        <label className={ui.field}>
          <span className={ui.label}>Note for today</span>
          <textarea
            id="habit-note"
            className={`${ui.input} ${styles.note}`}
            rows={2}
            maxLength={280}
            value={note}
            placeholder="How did it go?"
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (note.trim() !== todayLog.note) onSaveNote(todayLog, note)
            }}
          />
        </label>
      )}

      {history.length > 0 && (
        <div>
          <h3 className={styles.subhead}>History</h3>
          <ul className={styles.history}>
            {history.map((l) => (
              <li key={l.id}>
                <span className="num">
                  {parseDay(l.dayKey).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })},{' '}
                  {clock(minutesOfDay(new Date(l.completedAt)))}
                </span>
                {l.note && <span className={styles.historyNote}>{l.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className={ui.button} onClick={onEdit}>
        Edit habit
      </button>
    </Dialog>
  )
}
