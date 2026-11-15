import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignedIn } from '../auth/authContext'
import { useToast } from '../components/toast'
import { saveWeekReview, setWeekFocus, useDays, useWeeks } from '../data/days'
import { useHabitLogs, useHabits } from '../data/habits'
import { useSessions } from '../data/sessions'
import { useTasks } from '../data/tasks'
import { rangeFor, rangeLabel, report, summarize } from '../lib/analytics'
import { addDays, dayKey, parseDay } from '../lib/dates'
import { MAX_FOCUS, MAX_NOTE, reviewWeekStart, weekDays, type WeekRecord } from '../lib/plan'
import { formatMinutes } from '../lib/profile'
import { compareTasks, type Task } from '../lib/tasks'
import { useNow } from '../lib/useNow'
import ui from '../components/ui.module.css'
import { PageSkeleton } from '../components/Skeleton'
import styles from './Plan.module.css'

const RATINGS = ['', 'Rough', 'Meh', 'Okay', 'Good', 'Great']
const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`)

/** Sunday's look back: the week's numbers and notes, and up to 3 focus tasks for next week. */
export function ReviewPage() {
  const { user } = useSignedIn()
  const uid = user.uid
  const tasks = useTasks(uid)
  const habits = useHabits(uid)
  const logs = useHabitLogs(uid)
  const sessions = useSessions(uid)
  const days = useDays(uid)
  const weeks = useWeeks(uid)
  const now = useNow()
  const today = dayKey(now)

  const loaded = [tasks, habits, logs, sessions, days, weeks].every((r) => r.loaded)
  if (!loaded) {
    return (
      <section className={styles.page} aria-busy="true">
        <PageSkeleton />
      </section>
    )
  }

  const start = reviewWeekStart(today)
  const range = rangeFor('week', start)
  const data = { tasks: tasks.data, habits: habits.data, logs: logs.data, sessions: sessions.data, today }
  const s = summarize(data, range)
  const lines = report(data, range)
  const notes = weekDays(days.data, start)
  const next = addDays(start, 7)

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <p className={styles.date}>Week of {rangeLabel(range)}</p>
        <h1>Weekly review</h1>
      </header>

      <article className={`${ui.card} ${styles.card}`}>
        <h2>Your week in numbers</h2>
        <dl className={`${styles.numbers} num`}>
          <div>
            <dt>Focus</dt>
            <dd>{formatMinutes(s.focusMinutes)}</dd>
          </div>
          <div>
            <dt>Sessions</dt>
            <dd>{s.sessions}</dd>
          </div>
          <div>
            <dt>Tasks done</dt>
            <dd>{s.tasksDone}</dd>
          </div>
          <div>
            <dt>Habits kept</dt>
            <dd>{pct(s.habitRate)}</dd>
          </div>
        </dl>
        {lines.length > 0 && (
          <ul className={styles.report}>
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
      </article>

      <article className={`${ui.card} ${styles.card}`}>
        <h2>Your days</h2>
        {notes.length ? (
          <ul className={styles.dayNotes}>
            {notes.map((d) => (
              <li key={d.key}>
                <strong>{parseDay(d.key).toLocaleDateString('en-US', { weekday: 'short' })}</strong>
                <span>
                  {d.rating > 0 && <small>{RATINGS[d.rating]}</small>}
                  {d.wins.length > 0 && <p>Wins: {d.wins.join(' · ')}</p>}
                  {d.note && <p>{d.note}</p>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>No evening reviews this week. They show up here when you wrap up a day.</p>
        )}
      </article>

      <WeekForm
        key={start}
        uid={uid}
        week={start}
        next={next}
        record={weeks.data.find((w) => w.key === start) ?? null}
        nextRecord={weeks.data.find((w) => w.key === next) ?? null}
        open={tasks.data.filter((t) => t.status !== 'done').sort(compareTasks)}
      />
    </section>
  )
}

/** Picks next week's focus tasks and a note. Mounted once the records have loaded. */
function WeekForm(props: { uid: string; week: string; next: string; record: WeekRecord | null; nextRecord: WeekRecord | null; open: Task[] }) {
  const { uid, week, next, record, nextRecord, open } = props
  const toast = useToast()
  const navigate = useNavigate()
  const [focus, setFocus] = useState<string[]>(nextRecord?.focus ?? [])
  const [note, setNote] = useState(record?.note ?? '')

  function toggle(id: string) {
    if (!focus.includes(id) && focus.length >= MAX_FOCUS) toast(`Pick up to ${MAX_FOCUS}. Unpick one first.`)
    // From the latest list, so quick taps don't undo each other.
    setFocus((list) => (list.includes(id) ? list.filter((f) => f !== id) : list.length >= MAX_FOCUS ? list : [...list, id]))
  }

  function finish() {
    const failed = () => toast('That change could not be saved. Check your connection.')
    setWeekFocus(uid, next, focus).catch(failed)
    saveWeekReview(uid, week, note).catch(failed)
    toast('Week reviewed. Have a good one.')
    navigate('/')
  }

  return (
    <>
      <article className={`${ui.card} ${styles.card}`}>
        <h2>Focus for next week</h2>
        <p className={styles.muted}>Pick up to {MAX_FOCUS} tasks that matter most. They’ll sit at the top of Today all week.</p>
        {open.length ? (
          <div className={ui.chips} role="group" aria-label="Focus tasks for next week">
            {open.slice(0, 30).map((t) => (
              <button key={t.id} type="button" className={ui.chip} aria-pressed={focus.includes(t.id)} onClick={() => toggle(t.id)}>
                {t.title}
              </button>
            ))}
          </div>
        ) : (
          <p className={styles.muted}>No open tasks to pick from.</p>
        )}
        <label className={ui.field}>
          <span className={ui.label}>Note to yourself</span>
          <textarea
            className={`${ui.input} ${styles.note}`}
            value={note}
            rows={3}
            maxLength={MAX_NOTE}
            placeholder="What worked this week? What will you change?"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </article>
      <button type="button" className={`${ui.button} ${ui.primary} ${ui.block}`} onClick={finish}>
        Finish the review
      </button>
    </>
  )
}
