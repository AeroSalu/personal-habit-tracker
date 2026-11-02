import { useState, type FormEvent } from 'react'
import { Dialog } from '../components/Dialog'
import { WEEK } from '../lib/dates'
import { CATEGORIES, habitError, type Category, type Habit, type HabitFields } from '../lib/habits'
import ui from '../components/ui.module.css'
import styles from './Habits.module.css'

type Props = {
  habit: Habit | null
  onSave: (fields: HabitFields) => void
  onArchive?: () => void
  onClose: () => void
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function HabitForm({ habit, onSave, onArchive, onClose }: Props) {
  const [name, setName] = useState(habit?.name ?? '')
  const [category, setCategory] = useState<Category>(habit?.category ?? 'personal')
  const [type, setType] = useState(habit?.schedule.type ?? 'days')
  const [days, setDays] = useState<number[]>(habit?.schedule.type === 'days' ? habit.schedule.days : [1, 2, 3, 4, 5])
  const [perWeek, setPerWeek] = useState(habit?.schedule.type === 'count' ? habit.schedule.perWeek : 3)
  const [usualTime, setUsualTime] = useState(habit?.usualTime ?? '')
  const [targetNote, setTargetNote] = useState(habit?.targetNote ?? '')
  const [error, setError] = useState('')

  function toggleDay(day: number) {
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const fields: HabitFields = {
      name,
      category,
      schedule: type === 'days' ? { type, days: [...days].sort() } : { type, perWeek },
      usualTime,
      targetNote,
    }
    const problem = habitError(fields)
    setError(problem)
    if (!problem) onSave(fields)
  }

  return (
    <Dialog title={habit ? 'Edit habit' : 'New habit'} onClose={onClose}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <label className={ui.field}>
          <span className={ui.label}>Habit</span>
          <input
            id="habit-name"
            className={ui.input}
            value={name}
            maxLength={80}
            placeholder="Read for 30 minutes"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <fieldset className={styles.fieldset}>
          <legend className={ui.label}>Category</legend>
          <div className={ui.chips}>
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className={ui.chip} aria-pressed={category === c} onClick={() => setCategory(c)}>
                {capital(c)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={ui.label}>How often</legend>
          <div className={styles.segmented}>
            <button type="button" aria-pressed={type === 'days'} onClick={() => setType('days')}>
              Exact days
            </button>
            <button type="button" aria-pressed={type === 'count'} onClick={() => setType('count')}>
              Times a week
            </button>
          </div>
          {type === 'days' ? (
            <div className={styles.dayPicker} role="group" aria-label="Days">
              {WEEK.map((w) => (
                <button
                  key={w.day}
                  type="button"
                  aria-pressed={days.includes(w.day)}
                  aria-label={w.short}
                  onClick={() => toggleDay(w.day)}
                >
                  {w.letter}
                </button>
              ))}
            </div>
          ) : (
            <div className={ui.chips} role="group" aria-label="Times each week">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button key={n} type="button" className={ui.chip} aria-pressed={perWeek === n} onClick={() => setPerWeek(n)}>
                  {n}×
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <div className={styles.twoUp}>
          <label className={ui.field}>
            <span className={ui.label}>Usual time (optional)</span>
            <input id="habit-time" className={ui.input} type="time" value={usualTime} onChange={(e) => setUsualTime(e.target.value)} />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Target (optional)</span>
            <input
              id="habit-target"
              className={ui.input}
              value={targetNote}
              maxLength={40}
              placeholder="45 minutes"
              onChange={(e) => setTargetNote(e.target.value)}
            />
          </label>
        </div>

        <p className={ui.error} role="alert">
          {error}
        </p>
        <div className={styles.formActions}>
          <button type="submit" className={`${ui.button} ${ui.primary}`}>
            Save habit
          </button>
          {onArchive && habit && (
            <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={onArchive}>
              {habit.archived ? 'Restore habit' : 'Archive habit'}
            </button>
          )}
        </div>
      </form>
    </Dialog>
  )
}
