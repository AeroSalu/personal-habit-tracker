import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as m from 'motion/react-m'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { PageSkeleton } from '../components/Skeleton'
import { Tick } from '../components/Tick'
import { useToast } from '../components/toast'
import { setHabitArchived, setLogNote, updateHabit, useHabitLogs, useHabits } from '../data/habits'
import { spring } from '../design/motion'
import { clock, dayKey, minutesOfDay, parseClock, parseDay } from '../lib/dates'
import {
  averageTime,
  completionRate,
  isDue,
  scheduleLabel,
  streak,
  streakLabel,
  type Habit,
  type HabitLog,
} from '../lib/habits'
import { useNow } from '../lib/useNow'
import { HabitCalendar } from './HabitCalendar'
import { HabitForm } from './HabitForm'
import { useHabitToggle } from './useHabitToggle'
import ui from '../components/ui.module.css'
import styles from './Habits.module.css'

/** The note for today's tick, saved when the box loses focus. */
function TodayNote({ log, onSave }: { log: HabitLog; onSave: (note: string) => void }) {
  const [note, setNote] = useState(log.note)
  return (
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
          if (note.trim() !== log.note) onSave(note)
        }}
      />
    </label>
  )
}

/**
 * One habit in full: its card grows into the top of this page (shared layout with the card on
 * Habits), then streaks, the month calendar, today's note and the history.
 */
export function HabitPage() {
  const { id = '' } = useParams()
  const { user } = useSignedIn()
  const uid = user.uid
  const habits = useHabits(uid)
  const allLogs = useHabitLogs(uid)
  const toggleHabit = useHabitToggle(uid)
  const toast = useToast()
  const navigate = useNavigate()
  const now = useNow()
  const today = dayKey(now)
  const [editing, setEditing] = useState(false)
  const [pop, setPop] = useState(false)

  const back = (
    <Link to="/habits" className={styles.back}>
      <ArrowLeft size={16} aria-hidden="true" /> Habits
    </Link>
  )

  if (!habits.loaded || !allLogs.loaded) {
    return (
      <section className={styles.page} aria-busy="true">
        {back}
        <PageSkeleton />
      </section>
    )
  }

  const habit: Habit | undefined = habits.data.find((h) => h.id === id)
  if (!habit) {
    return (
      <section className={styles.page}>
        {back}
        <p className={styles.quiet}>This habit no longer exists.</p>
      </section>
    )
  }

  const failed = () => toast('That change could not be saved. Check your connection.')
  const logs = allLogs.data.filter((l) => l.habitId === habit.id)
  const keys = new Set(logs.map((l) => l.dayKey))
  const todayLog = logs.find((l) => l.dayKey === today)
  const run = streak(habit, keys, today)
  const average = averageTime(logs)
  const history = [...logs].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 12)

  const facts = [scheduleLabel(habit.schedule)]
  if (habit.usualTime) facts.push(`usually ${clock(parseClock(habit.usualTime))}`)
  if (habit.targetNote) facts.push(habit.targetNote)

  return (
    <section className={styles.page}>
      {back}

      <m.div
        layoutId={`habit-card-${habit.id}`}
        transition={spring}
        className={`${styles.card} ${styles.hero} ${todayLog ? styles.done : ''} ${pop ? styles.pop : ''}`}
      >
        {(todayLog || (!habit.archived && isDue(habit, keys, today))) && (
          <button
            type="button"
            className={styles.tick}
            aria-pressed={Boolean(todayLog)}
            aria-label={`${todayLog ? 'Undo' : 'Complete'} ${habit.name}`}
            onClick={() => setPop(toggleHabit(habit, keys, today))}
          >
            <Tick size={20} />
          </button>
        )}
        <div className={styles.cardBody}>
          <h1 className={styles.heroName}>{habit.name}</h1>
          <p className={styles.meta}>
            <span className={styles.category}>{habit.category}</span>
            {habit.archived ? 'Archived' : facts.join(' · ')}
          </p>
        </div>
        <button
          type="button"
          className={`${ui.button} ${ui.ghost} ${styles.heroEdit}`}
          aria-label={`Edit ${habit.name}`}
          title="Edit habit"
          onClick={() => setEditing(true)}
        >
          <Pencil size={18} aria-hidden="true" />
        </button>
      </m.div>

      <dl className={`${styles.stats} ${styles.pageStats}`}>
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

      <div className={`${ui.card} ${styles.panel}`}>
        <HabitCalendar habit={habit} keys={keys} today={today} />
      </div>

      {todayLog && (
        <TodayNote key={todayLog.id} log={todayLog} onSave={(note) => setLogNote(uid, todayLog.id, note).catch(failed)} />
      )}

      {history.length > 0 && (
        <div>
          <h2 className={styles.subhead}>History</h2>
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

      {editing && (
        <HabitForm
          habit={habit}
          onSave={(fields) => {
            updateHabit(uid, habit.id, fields).catch(failed)
            setEditing(false)
          }}
          onArchive={() => {
            setHabitArchived(uid, habit.id, !habit.archived).catch(failed)
            setEditing(false)
            toast(habit.archived ? `${habit.name} restored` : `${habit.name} archived`)
            if (!habit.archived) navigate('/habits')
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  )
}
