import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Check, Clock3, Repeat } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useToast } from '../components/toast'
import { markPlanned, saveDayReview, useDays } from '../data/days'
import { useHabitLogs, useHabits } from '../data/habits'
import { setDue, useTasks } from '../data/tasks'
import { dayKey } from '../lib/dates'
import { isDue, keysFor } from '../lib/habits'
import { agenda, carry, leftToday, MAX_NOTE, MAX_WINS, planGroups, planLoad, REVIEW_FROM_HOUR } from '../lib/plan'
import { formatMinutes } from '../lib/profile'
import { dueLabel, type Task } from '../lib/tasks'
import type { DayRecord } from '../lib/plan'
import { useNow } from '../lib/useNow'
import ui from '../components/ui.module.css'
import styles from './Plan.module.css'

const RATINGS = ['Rough', 'Meh', 'Okay', 'Good', 'Great']

function timeLabel(time: string) {
  const [h, m] = time.split(':').map(Number)
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** Morning: pick today's tasks and place them in the day. Evening: wrap the day up. */
export function PlanPage() {
  const { user } = useSignedIn()
  const uid = user.uid
  const tasks = useTasks(uid)
  const habits = useHabits(uid)
  const logs = useHabitLogs(uid)
  const days = useDays(uid)
  const toast = useToast()
  const navigate = useNavigate()
  const now = useNow()
  const today = dayKey(now)
  const record = days.data.find((d) => d.key === today) ?? null

  const [mode, setMode] = useState<'plan' | 'review'>(now.getHours() >= REVIEW_FROM_HOUR ? 'review' : 'plan')
  const failed = () => toast('That change could not be saved. Check your connection.')

  if (!tasks.loaded || !habits.loaded || !logs.loaded || !days.loaded) return <section className={styles.page} aria-busy="true" />

  const groups = planGroups(tasks.data, today)
  const planned = tasks.data.filter((t) => t.dueDate === today)
  const load = planLoad(planned, now)
  const dueHabits = habits.data.filter((h) => !h.archived && isDue(h, keysFor(logs.data, h.id), today))
  const ticked = new Set(logs.data.filter((l) => l.dayKey === today).map((l) => l.habitId))
  const day = agenda(tasks.data, dueHabits, ticked, today)

  const toggle = (t: Task) => {
    if (t.dueDate === today) {
      // Taking a task off today leaves it undated; a repeating task needs a date, so it stays.
      if (t.recurrence.type !== 'none') return toast('A repeating task needs a date. Edit it on the Tasks page.')
      setDue(uid, t.id, '', '').catch(failed)
    } else {
      setDue(uid, t.id, today, t.dueTime).catch(failed)
    }
  }

  const row = (t: Task, i: number, note?: string) => {
    const inToday = t.dueDate === today
    return (
      <li key={t.id} className="enter" style={{ '--i': i } as CSSProperties}>
        <button
          type="button"
          className={`${styles.pick} ${inToday ? styles.picked : ''}`}
          aria-pressed={inToday}
          aria-label={`${inToday ? 'Remove from today' : 'Add to today'}: ${t.title}`}
          onClick={() => toggle(t)}
        >
          <Check size={14} strokeWidth={3} aria-hidden="true" />
        </button>
        <span className={styles.title}>
          {t.title}
          {t.recurrence.type !== 'none' && <Repeat size={13} className={styles.inline} aria-label="Repeats" role="img" />}
        </span>
        {(note || t.estimateMinutes > 0) && (
          <span className={`${styles.meta} num`}>
            {[note, t.estimateMinutes ? formatMinutes(t.estimateMinutes) : ''].filter(Boolean).join(' · ')}
          </span>
        )}
      </li>
    )
  }

  const left = leftToday(tasks.data, today)
  const doneToday = [
    ...tasks.data.filter((t) => t.status === 'done' && t.completedAt && dayKey(new Date(t.completedAt)) === today).map((t) => t.title),
    ...dueHabits.filter((h) => ticked.has(h.id)).map((h) => h.name),
  ]

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <p className={styles.date}>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1>{mode === 'plan' ? 'Plan your day' : 'Wrap up your day'}</h1>
        <div className={styles.switch} role="group" aria-label="Plan or review">
          <button type="button" aria-pressed={mode === 'plan'} onClick={() => setMode('plan')}>
            Plan
          </button>
          <button type="button" aria-pressed={mode === 'review'} onClick={() => setMode('review')}>
            Review
          </button>
        </div>
      </header>

      {mode === 'plan' ? (
        <>
          <article className={`${ui.card} ${styles.card}`}>
            <h2>Pick today’s tasks</h2>
            <p className={styles.muted}>Tick what you’ll do today. Untick to take a task off today.</p>
            {[
              { title: 'Overdue', list: groups.overdue, note: (t: Task) => dueLabel(t, today) },
              { title: 'Due today', list: groups.today },
              { title: 'No date', list: groups.undated },
              { title: 'Coming up this week', list: groups.soon, note: (t: Task) => dueLabel(t, today) },
            ]
              .filter((g) => g.list.length)
              .map((g) => (
                <div key={g.title} className={styles.group}>
                  <h3>{g.title}</h3>
                  <ul className={styles.rows}>{g.list.map((t, i) => row(t, i, g.note?.(t)))}</ul>
                </div>
              ))}
            {!tasks.data.some((t) => t.status !== 'done') && <p className={styles.muted}>No open tasks. Add some on Today or Tasks.</p>}
          </article>

          <article className={`${ui.card} ${styles.card}`}>
            <h2>Your day</h2>
            <p className={`${styles.load} ${load.over ? styles.over : ''} num`}>
              <Clock3 size={15} aria-hidden="true" />
              {formatMinutes(load.estimate)} planned · {formatMinutes(load.free)} left before 10 PM
              {load.unestimated ? ` · ${load.unestimated} without an estimate` : ''}
            </p>
            {load.over && <p className={styles.warn}>That’s more than the time left today. Consider moving something to tomorrow.</p>}

            {day.timed.length > 0 && (
              <ol className={styles.timeline}>
                {day.timed.map((item) => (
                  <li key={`${item.kind}-${item.id}`} className={item.done ? styles.done : ''}>
                    <span className={`${styles.time} num`}>{timeLabel(item.time)}</span>
                    <span className={styles.dot} aria-hidden="true" />
                    <span className={styles.title}>
                      {item.title}
                      {item.kind === 'habit' && <Repeat size={13} className={styles.inline} aria-label="Habit" role="img" />}
                    </span>
                    {item.kind === 'task' && (
                      <input
                        type="time"
                        className={styles.timeInput}
                        aria-label={`Time for ${item.title}`}
                        value={item.time}
                        onChange={(e) => setDue(uid, item.id, today, e.target.value).catch(failed)}
                      />
                    )}
                  </li>
                ))}
              </ol>
            )}

            {day.anytime.length > 0 && (
              <div className={styles.group}>
                <h3>Any time today</h3>
                <ul className={styles.rows}>
                  {day.anytime.map((item) => (
                    <li key={item.id} className={item.done ? styles.done : ''}>
                      <CalendarClock size={16} className={styles.faint} aria-hidden="true" />
                      <span className={styles.title}>{item.title}</span>
                      <input
                        type="time"
                        className={styles.timeInput}
                        aria-label={`Set a time for ${item.title}`}
                        value=""
                        onChange={(e) => e.target.value && setDue(uid, item.id, today, e.target.value).catch(failed)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!day.timed.length && !day.anytime.length && <p className={styles.muted}>Nothing for today yet. Tick tasks above.</p>}
          </article>

          <button
            type="button"
            className={`${ui.button} ${ui.primary} ${ui.block}`}
            onClick={() => {
              markPlanned(uid, today).catch(failed)
              toast('Day planned. Go get it.')
              navigate('/')
            }}
          >
            Done planning
          </button>
        </>
      ) : (
        <>
          <article className={`${ui.card} ${styles.card}`}>
            <h2>Done today</h2>
            {doneToday.length ? (
              <ul className={styles.doneList}>
                {doneToday.map((title, i) => (
                  <li key={`${title}-${i}`}>
                    <Check size={15} aria-hidden="true" /> {title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>Nothing ticked off yet. Tomorrow is a fresh start.</p>
            )}
          </article>

          {left.length > 0 && (
            <article className={`${ui.card} ${styles.card}`}>
              <h2>Still open</h2>
              <p className={styles.muted}>Decide where each one goes, so tomorrow starts clean.</p>
              <ul className={styles.rows}>
                {left.map((t) => {
                  const off = carry(t, 'undated', today)
                  const tomorrow = carry(t, 'tomorrow', today)!
                  return (
                    <li key={t.id} className={styles.carryRow}>
                      <span className={styles.title}>{t.title}</span>
                      <span className={styles.carry}>
                        <button type="button" className={ui.chip} onClick={() => setDue(uid, t.id, tomorrow.dueDate, tomorrow.dueTime).catch(failed)}>
                          Tomorrow
                        </button>
                        <input
                          type="date"
                          className={styles.dateInput}
                          aria-label={`Pick a date for ${t.title}`}
                          min={today}
                          value=""
                          onChange={(e) => e.target.value && setDue(uid, t.id, e.target.value, t.dueTime).catch(failed)}
                        />
                        {off && (
                          <button type="button" className={ui.chip} onClick={() => setDue(uid, t.id, '', '').catch(failed)}>
                            No date
                          </button>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </article>
          )}

          <DayReviewForm key={today} uid={uid} today={today} record={record} />
        </>
      )}
    </section>
  )
}

/** Rating, wins and a note for the day. Mounted once the day's record has loaded. */
function DayReviewForm({ uid, today, record }: { uid: string; today: string; record: DayRecord | null }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [rating, setRating] = useState(record?.rating ?? 0)
  const [note, setNote] = useState(record?.note ?? '')
  const [wins, setWins] = useState<string[]>(() => [...(record?.wins ?? []), '', '', ''].slice(0, MAX_WINS))

  function finishReview() {
    saveDayReview(uid, today, { rating, note, wins }).catch(() => toast('That change could not be saved. Check your connection.'))
    toast('Day wrapped up. Rest well.')
    navigate('/')
  }

  return (
    <>
      <article className={`${ui.card} ${styles.card}`}>
        <h2>How did today go?</h2>
        <div className={ui.chips} role="group" aria-label="Rate today">
          {RATINGS.map((label, i) => (
            <button key={label} type="button" className={ui.chip} aria-pressed={rating === i + 1} onClick={() => setRating(rating === i + 1 ? 0 : i + 1)}>
              {label}
            </button>
          ))}
        </div>
        <div className={ui.field} role="group" aria-labelledby="wins-label">
          <span id="wins-label" className={ui.label}>Wins (up to {MAX_WINS})</span>
          {wins.map((w, i) => (
            <input
              key={i}
              className={ui.input}
              value={w}
              maxLength={80}
              placeholder={i === 0 ? 'Finished the mock test' : 'Another win'}
              aria-label={`Win ${i + 1}`}
              onChange={(e) => setWins(wins.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
        </div>
        <label className={ui.field}>
          <span className={ui.label}>Note</span>
          <textarea
            className={`${ui.input} ${styles.note}`}
            value={note}
            maxLength={MAX_NOTE}
            rows={3}
            placeholder="What helped, what got in the way?"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </article>

      <button type="button" className={`${ui.button} ${ui.primary} ${ui.block}`} onClick={finishReview}>
        Finish the day
      </button>
    </>
  )
}
