import { useState } from 'react'
import * as m from 'motion/react-m'
import { CheckCircle2, Coffee, Pause, Play, Square, Volume2 } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useTasks } from '../data/tasks'
import { MIN_SAVED_MINUTES, remainingMs, suggestedBreak, timerText, type Summary } from '../lib/focus'
import { Ring } from '../components/Ring'
import { spring } from '../design/motion'
import { useFocus } from './focusContext'
import { SOUND_LABEL, SOUNDS, type Sound } from './sound'
import ui from '../components/ui.module.css'
import styles from './Focus.module.css'

function SoundPicker() {
  const { sound, setSound } = useFocus()
  return (
    <label className={styles.sound}>
      <Volume2 size={16} aria-hidden="true" />
      <select id="focus-sound" aria-label="Ambient sound" value={sound} onChange={(e) => setSound(e.target.value as Sound)}>
        {SOUNDS.map((s) => (
          <option key={s} value={s}>
            {SOUND_LABEL[s]}
          </option>
        ))}
      </select>
    </label>
  )
}

function SummaryView({ summary }: { summary: Summary }) {
  const focus = useFocus()
  const { user } = useSignedIn()
  const tasks = useTasks(user.uid)
  const [answered, setAnswered] = useState('')
  const [note, setNote] = useState('')
  const link = summary.plan.link
  const task = link?.kind === 'task' ? tasks.data.find((t) => t.id === link.id) : undefined
  const saved = summary.minutes >= MIN_SAVED_MINUTES
  const suggested = suggestedBreak(summary)
  const breakLength = (kind: 'short' | 'long') => (kind === 'long' ? summary.plan.longBreak : summary.plan.shortBreak)
  const other = suggested === 'long' ? 'short' : 'long'

  const heading =
    summary.outcome === 'completed'
      ? 'Session complete'
      : summary.strictStop
        ? 'Strict mode ended the session'
        : 'Session ended early'

  return (
    <div className={styles.panel}>
      {/* The session ring, completed (or as far as it got), keeps its identity so closing returns it to Today. */}
      <m.div layoutId="focus-ring" className={styles.summaryRing} transition={spring}>
        <Ring
          rings={[
            {
              value: summary.outcome === 'completed' ? 1 : summary.minutes / Math.max(1, summary.plan.focusMinutes),
              color: 'var(--ring-focus)',
              label: 'Session',
            },
          ]}
          size={136}
          stroke={10}
        >
          <CheckCircle2 size={40} className={summary.outcome === 'completed' ? styles.good : styles.muted} aria-hidden="true" />
        </Ring>
      </m.div>
      <h1 className={styles.heading}>{heading}</h1>
      <p className={styles.lead}>
        {saved ? (
          <>
            <strong className="num">{summary.minutes} min</strong> focused{link ? ` on ${link.title}` : ''} · session{' '}
            {summary.sessionNumber} today
          </>
        ) : (
          'Under a minute, so this one was not saved.'
        )}
      </p>
      {summary.strictStop && <p className={styles.warn}>You left the app for more than 30 seconds.</p>}
      {summary.leaves.length > 0 && !summary.strictStop && (
        <p className={styles.muted}>
          Left the app {summary.leaves.length} time{summary.leaves.length === 1 ? '' : 's'}
        </p>
      )}

      {task && task.status !== 'done' && !answered && (
        <div className={styles.question}>
          <p>Did you finish “{task.title}”?</p>
          <div className={styles.row}>
            <button
              type="button"
              className={`${ui.button} ${ui.primary}`}
              onClick={() => {
                focus.markTask('done')
                setAnswered('Task marked done')
              }}
            >
              Done
            </button>
            <button
              type="button"
              className={ui.button}
              onClick={() => {
                focus.markTask('in_progress')
                setAnswered('Task marked in progress')
              }}
            >
              Still working
            </button>
            <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setAnswered('Task left as it was')}>
              Not yet
            </button>
          </div>
        </div>
      )}
      {answered && <p className={styles.good}>{answered}</p>}
      {link?.kind === 'habit' && summary.outcome === 'completed' && <p className={styles.good}>{link.title} ticked for today</p>}

      {saved && (
        <label className={`${ui.field} ${styles.noteField}`}>
          <span className={ui.label}>Session note (optional)</span>
          <textarea
            id="session-note"
            className={`${ui.input} ${styles.note}`}
            rows={2}
            maxLength={280}
            value={note}
            placeholder="What did you get done?"
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note.trim() && focus.saveNote(note)}
          />
        </label>
      )}

      <div className={styles.actions}>
        <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => focus.startBreak(suggested)}>
          <Coffee size={18} aria-hidden="true" />
          Take a {breakLength(suggested)} min break
        </button>
        <button type="button" className={ui.button} onClick={() => focus.startBreak(other)}>
          {breakLength(other)} min instead
        </button>
        <button type="button" className={ui.button} onClick={focus.next}>
          Skip break, start next
        </button>
        <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={focus.close}>
          Done for now
        </button>
      </div>
    </div>
  )
}

/** Full-screen view for a running session, its summary, and breaks. */
export function FocusOverlay() {
  const focus = useFocus()
  const [confirmEnd, setConfirmEnd] = useState(false)
  const { state, now } = focus
  if (!state) return null

  if (state.phase === 'summary') {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Session summary">
        <SummaryView key={state.sessionId} summary={state} />
      </div>
    )
  }

  if (state.phase === 'break' || state.phase === 'breakOver') {
    const over = state.phase === 'breakOver'
    return (
      <div className={`${styles.overlay} ${styles.calm}`} role="dialog" aria-modal="true" aria-label="Break">
        <div className={styles.panel}>
          <p className={styles.label}>{over ? 'Break’s over' : state.kind === 'long' ? 'Long break' : 'Short break'}</p>
          {!over && <p className={`${styles.timer} ${styles.breakTimer} num`}>{timerText(remainingMs(state, now))}</p>}
          <p className={styles.lead}>{over ? 'Ready for the next round?' : 'Step away from the screen. Stretch, drink water.'}</p>
          <div className={styles.actions}>
            <button type="button" className={`${ui.button} ${ui.primary}`} onClick={focus.next}>
              <Play size={18} aria-hidden="true" />
              Start next session
            </button>
            <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={focus.close}>
              Done for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  const paused = state.pausedAt !== null
  const total = state.endsAt - state.startedAt - state.pausedMs
  const left = remainingMs(state, now)
  const progress = total > 0 ? 1 - left / total : 1
  const minutesSoFar = Math.round((total - left) / 60_000)

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Focus session">
      <div className={styles.panel}>
        <p className={styles.label}>{paused ? 'Paused' : 'Focusing on'}</p>
        <h1 className={styles.title}>{state.plan.link?.title ?? 'Deep focus'}</h1>
        {/* Shares its identity with Today's focus ring, so starting from Today expands it here. */}
        <m.div layoutId="focus-ring" className={styles.ringWrap} transition={spring}>
          <Ring rings={[{ value: progress, color: 'var(--ring-focus)', label: 'Session progress' }]} size={300} stroke={12}>
            <p className={`${styles.ringTimer} ${paused ? styles.pausedTimer : ''} num`} aria-live="off">
              {timerText(left)}
            </p>
          </Ring>
        </m.div>
        <p className={styles.meta}>
          Session {state.sessionNumber} · {state.plan.focusMinutes} min
          {state.plan.strict && <span className={styles.strict}>Strict</span>}
        </p>

        {confirmEnd ? (
          <div className={styles.question}>
            <p>
              {minutesSoFar >= MIN_SAVED_MINUTES
                ? `End now? The ${minutesSoFar} min so far will be saved.`
                : 'End now? Under a minute in, so nothing will be saved.'}
            </p>
            <div className={styles.row}>
              <button
                type="button"
                className={`${ui.button} ${ui.primary}`}
                onClick={() => {
                  setConfirmEnd(false)
                  focus.endEarly()
                }}
              >
                End session
              </button>
              <button type="button" className={ui.button} onClick={() => setConfirmEnd(false)}>
                Keep going
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.controls}>
            <button type="button" className={`${ui.button} ${styles.big}`} onClick={paused ? focus.resume : focus.pause}>
              {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className={`${ui.button} ${ui.ghost} ${styles.big}`} onClick={() => setConfirmEnd(true)}>
              <Square size={16} aria-hidden="true" />
              End
            </button>
          </div>
        )}
        <SoundPicker />
      </div>
    </div>
  )
}
