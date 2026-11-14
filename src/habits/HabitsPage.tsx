import { useMemo, useState } from 'react'
import { BellRing, Plus } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useToast } from '../components/toast'
import { createHabit, setHabitArchived, setLogNote, updateHabit, useHabitLogs, useHabits } from '../data/habits'
import { addDays, clock, dayKey, parseClock, WEEK, weekday } from '../lib/dates'
import {
  byUsualTime,
  isDue,
  isOverdue,
  scheduleLabel,
  weekProgress,
  type Habit,
  type HabitFields,
  type HabitLog,
} from '../lib/habits'
import { useNow } from '../lib/useNow'
import { HabitCard } from './HabitCard'
import { HabitDetail } from './HabitDetail'
import { HabitForm } from './HabitForm'
import { useHabitToggle } from './useHabitToggle'
import ui from '../components/ui.module.css'
import styles from './Habits.module.css'

function nextDueLabel(habit: Habit, keys: Set<string>, today: string): string {
  if (habit.schedule.type === 'count') {
    const week = weekProgress(habit, keys, today)
    return week.done >= week.target ? 'Done for this week' : `${week.done} of ${week.target} this week`
  }
  for (let i = 1; i <= 7; i += 1) {
    const k = addDays(today, i)
    if (habit.schedule.days.includes(weekday(k))) {
      return i === 1 ? 'Next: tomorrow' : `Next: ${WEEK.find((w) => w.day === weekday(k))?.short}`
    }
  }
  return ''
}

export function HabitsPage() {
  const { user } = useSignedIn()
  const uid = user.uid
  const habits = useHabits(uid)
  const logs = useHabitLogs(uid)
  const toast = useToast()
  const toggleHabit = useHabitToggle(uid)
  const now = useNow()
  const today = dayKey(now)

  const [form, setForm] = useState<Habit | 'new' | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [justDone, setJustDone] = useState('')

  const logsByHabit = useMemo(() => {
    const map = new Map<string, HabitLog[]>()
    for (const l of logs.data) map.set(l.habitId, [...(map.get(l.habitId) ?? []), l])
    return map
  }, [logs.data])
  const keysOf = (h: Habit) => new Set((logsByHabit.get(h.id) ?? []).map((l) => l.dayKey))

  const active = habits.data.filter((h) => !h.archived)
  const due = active.filter((h) => isDue(h, keysOf(h), today)).sort(byUsualTime)
  const later = active.filter((h) => !isDue(h, keysOf(h), today)).sort(byUsualTime)
  const archived = habits.data.filter((h) => h.archived).sort(byUsualTime)
  const overdue = due.filter((h) => isOverdue(h, keysOf(h), now))
  const doneCount = due.filter((h) => keysOf(h).has(today)).length
  const open = habits.data.find((h) => h.id === openId)

  const failed = () => toast('That change could not be saved. Check your connection.')

  function toggle(habit: Habit) {
    if (toggleHabit(habit, keysOf(habit), today)) setJustDone(habit.id)
  }

  function save(fields: HabitFields) {
    if (form === 'new') createHabit(uid, fields).catch(failed)
    else if (form) updateHabit(uid, form.id, fields).catch(failed)
    setForm(null)
  }

  if (!habits.loaded || !logs.loaded) {
    return <section className={styles.page} aria-busy="true" />
  }

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Habits</h1>
          {due.length > 0 && (
            <p className={`${styles.sub} num`}>
              {doneCount} of {due.length} done today
            </p>
          )}
        </div>
        <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => setForm('new')}>
          <Plus size={18} aria-hidden="true" />
          New habit
        </button>
      </header>

      {overdue.length > 0 && (
        <p className={styles.reminder} role="status">
          <BellRing size={16} aria-hidden="true" />
          {overdue.length === 1
            ? `${overdue[0].name} was due at ${clock(parseClock(overdue[0].usualTime))}.`
            : `${overdue.length} habits are past their usual time.`}
        </p>
      )}

      {!active.length ? (
        <div className={styles.empty}>
          <h2>Build your first habit</h2>
          <p>Pick something you want to do regularly, like solving 2 LeetCode problems or reading for 30 minutes.</p>
          <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => setForm('new')}>
            Add a habit
          </button>
        </div>
      ) : (
        <>
          <div className={styles.group}>
            <h2 className={styles.groupTitle}>Today</h2>
            {due.length ? (
              <ul className={styles.cards}>
                {due.map((h, i) => (
                  <HabitCard
                    key={h.id}
                    index={i}
                    habit={h}
                    keys={keysOf(h)}
                    today={today}
                    log={logsByHabit.get(h.id)?.find((l) => l.dayKey === today)}
                    overdue={overdue.includes(h)}
                    pop={justDone === h.id}
                    onToggle={() => toggle(h)}
                    onOpen={() => setOpenId(h.id)}
                  />
                ))}
              </ul>
            ) : (
              <p className={styles.quiet}>Nothing due today.</p>
            )}
          </div>

          {later.length > 0 && (
            <div className={styles.group}>
              <h2 className={styles.groupTitle}>Not today</h2>
              <ul className={styles.rows}>
                {later.map((h) => (
                  <li key={h.id}>
                    <button type="button" className={styles.row} onClick={() => setOpenId(h.id)}>
                      <span className={styles.name}>{h.name}</span>
                      <span className={styles.meta}>
                        {scheduleLabel(h.schedule)} · {nextDueLabel(h, keysOf(h), today)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {archived.length > 0 && (
        <details className={styles.group}>
          <summary className={styles.groupTitle}>Archived ({archived.length})</summary>
          <ul className={styles.rows}>
            {archived.map((h) => (
              <li key={h.id}>
                <button type="button" className={styles.row} onClick={() => setForm(h)}>
                  <span className={styles.name}>{h.name}</span>
                  <span className={styles.meta}>{scheduleLabel(h.schedule)}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {open && !form && (
        <HabitDetail
          key={open.id}
          habit={open}
          logs={logsByHabit.get(open.id) ?? []}
          keys={keysOf(open)}
          today={today}
          onSaveNote={(log, note) => setLogNote(uid, log.id, note).catch(failed)}
          onEdit={() => setForm(open)}
          onClose={() => setOpenId(null)}
        />
      )}

      {form && (
        <HabitForm
          habit={form === 'new' ? null : form}
          onSave={save}
          onArchive={
            form === 'new'
              ? undefined
              : () => {
                  setHabitArchived(uid, form.id, !form.archived).catch(failed)
                  setForm(null)
                  setOpenId(null)
                  toast(form.archived ? `${form.name} restored` : `${form.name} archived`)
                }
          }
          onClose={() => setForm(null)}
        />
      )}
    </section>
  )
}
