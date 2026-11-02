import { useState, type FormEvent } from 'react'
import {
  FOCUS_GOAL_PRESETS,
  formatMinutes,
  profileError,
  type ProfileFields,
} from '../lib/profile'
import ui from '../components/ui.module.css'
import styles from './ProfileForm.module.css'

type Props = {
  initial: ProfileFields
  submitLabel: string
  onSubmit: (fields: ProfileFields) => void
}

/** Name and daily focus goal, shared by first-time setup and Profile & Settings. */
export function ProfileForm({ initial, submitLabel, onSubmit }: Props) {
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [goal, setGoal] = useState(initial.dailyFocusGoalMinutes)
  const [custom, setCustom] = useState(!FOCUS_GOAL_PRESETS.includes(initial.dailyFocusGoalMinutes))
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const fields = { displayName, dailyFocusGoalMinutes: goal }
    const problem = profileError(fields)
    setError(problem)
    if (!problem) onSubmit(fields)
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label className={ui.field}>
        <span className={ui.label}>Your name</span>
        <input
          id="profile-name"
          className={ui.input}
          value={displayName}
          maxLength={40}
          autoComplete="name"
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>

      <fieldset className={styles.goal}>
        <legend className={ui.label}>Daily focus goal</legend>
        <p className={styles.hint}>How much focused work you aim for each day.</p>
        <div className={ui.chips}>
          {FOCUS_GOAL_PRESETS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={ui.chip}
              aria-pressed={!custom && goal === minutes}
              onClick={() => {
                setCustom(false)
                setGoal(minutes)
              }}
            >
              {formatMinutes(minutes)}
            </button>
          ))}
          <button
            type="button"
            className={ui.chip}
            aria-pressed={custom}
            onClick={() => setCustom(true)}
          >
            Custom
          </button>
        </div>
        {custom && (
          <label className={ui.field}>
            <span className={ui.label}>Minutes per day</span>
            <input
              id="profile-goal-minutes"
              className={ui.input}
              type="number"
              inputMode="numeric"
              min={15}
              max={960}
              step={15}
              value={Number.isNaN(goal) ? '' : goal}
              onChange={(e) => setGoal(e.target.valueAsNumber)}
            />
          </label>
        )}
      </fieldset>

      <p className={ui.error} role="alert">
        {error}
      </p>
      <button type="submit" className={`${ui.button} ${ui.primary} ${ui.block}`}>
        {submitLabel}
      </button>
    </form>
  )
}
