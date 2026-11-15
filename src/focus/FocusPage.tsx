import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as m from 'motion/react-m'
import { ChevronDown, Play } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useHabitLogs, useHabits } from '../data/habits'
import { useSessions } from '../data/sessions'
import { useTasks } from '../data/tasks'
import { clock, dayKey, minutesOfDay, parseDay } from '../lib/dates'
import { completedOn, minutesOn, planError, PRESETS, type FocusLink, type PresetId, type Session } from '../lib/focus'
import { byUsualTime, isDue, keysFor } from '../lib/habits'
import { formatMinutes } from '../lib/profile'
import { compareTasks } from '../lib/tasks'
import { useNow } from '../lib/useNow'
import { Ring } from '../components/Ring'
import { spring } from '../design/motion'
import { useFocus } from './focusContext'
import { loadPrefs, savePrefs } from './prefs'
import { SOUND_LABEL, SOUNDS, type Sound } from './sound'
import ui from '../components/ui.module.css'
import styles from './Focus.module.css'

const HISTORY_DAYS = 14

function SessionItem({ s }: { s: Session }) {
  const start = minutesOfDay(new Date(s.startedAt))
  const end = minutesOfDay(new Date(s.endedAt))
  return (
    <li className={styles.session}>
      <div className={styles.sessionMain}>
        <span className={styles.sessionTitle}>{s.title || 'Deep focus'}</span>
        <span className={`${styles.sessionMeta} num`}>
          {clock(start)} – {clock(end)}
          {s.leaves.length > 0 && ` · left ${s.leaves.length}×`}
        </span>
        {s.note && <span className={styles.sessionNote}>{s.note}</span>}
      </div>
      <div className={styles.sessionSide}>
        <strong className="num">{formatMinutes(s.minutes)}</strong>
        <span className={s.outcome === 'completed' ? styles.badgeDone : styles.badgeStopped}>
          {s.outcome === 'completed' ? 'Completed' : 'Ended early'}
        </span>
      </div>
    </li>
  )
}

export function FocusPage() {
  const { user, profile } = useSignedIn()
  const uid = user.uid
  const focus = useFocus()
  const tasks = useTasks(uid)
  const habits = useHabits(uid)
  const habitLogs = useHabitLogs(uid)
  const sessions = useSessions(uid)
  const [params] = useSearchParams()
  const now = useNow()
  const today = dayKey(now)

  const [prefs] = useState(loadPrefs)
  const [preset, setPreset] = useState<PresetId>(prefs.preset)
  const [custom, setCustom] = useState({ focus: prefs.customFocus, short: prefs.customShort, long: prefs.customLong })
  const [strict, setStrict] = useState(prefs.strict)
  const [target, setTarget] = useState(() => {
    if (params.get('task')) return `task:${params.get('task')}`
    if (params.get('habit')) return `habit:${params.get('habit')}`
    return ''
  })
  const [error, setError] = useState('')

  const openTasks = tasks.data.filter((t) => t.status !== 'done').sort(compareTasks)
  const dueHabits = habits.data
    .filter((h) => !h.archived && isDue(h, keysFor(habitLogs.data, h.id), today))
    .sort(byUsualTime)

  const minutesToday = minutesOn(sessions.data, today)
  const goal = profile.dailyFocusGoalMinutes
  const share = Math.min(1, minutesToday / goal)

  const recent = sessions.data
    .filter((s) => s.dayKey >= dayKey(new Date(now.getTime() - HISTORY_DAYS * 86_400_000)))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const days = [...new Set(recent.map((s) => s.dayKey))]

  function link(): FocusLink {
    const [kind, id] = target.split(':')
    if (kind === 'task') {
      const t = tasks.data.find((x) => x.id === id)
      return t ? { kind: 'task', id, title: t.title } : null
    }
    if (kind === 'habit') {
      const h = habits.data.find((x) => x.id === id)
      return h ? { kind: 'habit', id, title: h.name } : null
    }
    return null
  }

  const chosen = PRESETS.find((p) => p.id === preset)
  const lengths = chosen
    ? { focusMinutes: chosen.focus, shortBreak: chosen.short, longBreak: chosen.long }
    : { focusMinutes: custom.focus, shortBreak: custom.short, longBreak: custom.long }
  const faceMinutes = Number.isFinite(lengths.focusMinutes) && lengths.focusMinutes > 0 ? lengths.focusMinutes : 0

  function start() {
    const problem = planError(lengths)
    setError(problem)
    if (problem) return
    savePrefs({ ...loadPrefs(), preset, customFocus: custom.focus, customShort: custom.short, customLong: custom.long, strict })
    focus.start({ preset, ...lengths, strict, link: link() })
  }

  const number = (value: number, set: (n: number) => void, id: string, label: string, max: number) => (
    <label className={ui.field}>
      <span className={ui.label}>{label}</span>
      <input
        id={id}
        className={ui.input}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) => set(e.target.valueAsNumber)}
      />
    </label>
  )

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1>Focus</h1>
      </header>

      <div className={styles.stage}>
        {/* The ring that grows into focus mode when the session starts. */}
        <m.div layoutId={focus.state ? undefined : 'focus-ring'} transition={spring} className={styles.stageRing}>
          <Ring rings={[{ value: share, color: 'var(--ring-focus)', label: 'Today’s focus goal' }]} size={260} stroke={10}>
            <p className={`${styles.stageTime} num`}>{faceMinutes}:00</p>
            <p className={`${styles.stageSub} num`}>
              {formatMinutes(minutesToday)} of {formatMinutes(goal)} today
            </p>
          </Ring>
        </m.div>
        <p className={`${styles.stageMeta} num`}>
          {completedOn(sessions.data, today)} session{completedOn(sessions.data, today) === 1 ? '' : 's'} completed today
        </p>

        <div className={styles.segmented} role="group" aria-label="Focus and break length">
          {[...PRESETS.map((p) => ({ id: p.id as PresetId, top: `${p.focus}`, sub: `${p.short} break` })), { id: 'custom' as PresetId, top: 'Custom', sub: 'your lengths' }].map(
            (p) => (
              <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>
                {preset === p.id && <m.span layoutId="preset-pill" className={styles.segmentPill} transition={spring} aria-hidden="true" />}
                <strong className="num">{p.top}</strong>
                <span className="num">{p.sub}</span>
              </button>
            ),
          )}
        </div>
        {preset === 'custom' && (
          <div className={styles.custom}>
            {number(custom.focus, (n) => setCustom((c) => ({ ...c, focus: n })), 'custom-focus', 'Focus (min)', 240)}
            {number(custom.short, (n) => setCustom((c) => ({ ...c, short: n })), 'custom-short', 'Break', 60)}
            {number(custom.long, (n) => setCustom((c) => ({ ...c, long: n })), 'custom-long', 'Long break', 90)}
          </div>
        )}

        <label className={`${ui.field} ${styles.target}`}>
          <span className={ui.label}>What are you working on?</span>
          <select id="focus-target" className={ui.input} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Nothing specific</option>
            {openTasks.length > 0 && (
              <optgroup label="Tasks">
                {openTasks.map((t) => (
                  <option key={t.id} value={`task:${t.id}`}>
                    {t.title}
                  </option>
                ))}
              </optgroup>
            )}
            {dueHabits.length > 0 && (
              <optgroup label="Habits due today">
                {dueHabits.map((h) => (
                  <option key={h.id} value={`habit:${h.id}`}>
                    {h.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        <p className={ui.error} role="alert">
          {error}
        </p>
        <button type="button" className={`${ui.button} ${ui.primary} ${styles.start}`} onClick={start}>
          <Play size={18} aria-hidden="true" />
          Start focus
        </button>

        <details className={styles.more}>
          <summary>
            Sound and strict mode
            <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
          </summary>
          <div className={styles.options}>
            <label className={styles.toggle}>
              <input id="focus-strict" type="checkbox" role="switch" className={ui.switch} checked={strict} onChange={(e) => setStrict(e.target.checked)} />
              <span>
                <strong>Strict mode</strong>
                <small>Leaving the app for over 30 seconds ends the session.</small>
              </span>
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Ambient sound</span>
              <select
                id="focus-sound-setup"
                className={ui.input}
                value={focus.sound}
                onChange={(e) => focus.setSound(e.target.value as Sound)}
              >
                {SOUNDS.map((s) => (
                  <option key={s} value={s}>
                    {SOUND_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
      </div>

      <div className={styles.history}>
        <h2 className={styles.groupTitle}>Session history</h2>
        {!days.length ? (
          <p className={styles.muted}>Finished sessions show up here, with how long you focused and any notes.</p>
        ) : (
          days.map((d) => {
            const list = recent.filter((s) => s.dayKey === d)
            return (
              <div key={d} className={styles.day}>
                <p className={styles.dayHead}>
                  <span>
                    {d === today ? 'Today' : parseDay(d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="num">{formatMinutes(minutesOn(list, d))}</span>
                </p>
                <ul className={styles.sessions}>
                  {list.map((s) => (
                    <SessionItem key={s.id} s={s} />
                  ))}
                </ul>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
