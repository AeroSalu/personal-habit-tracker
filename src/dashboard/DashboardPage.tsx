import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, ChevronRight, Play, Plus, Repeat, SlidersHorizontal } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useHabitLogs, useHabits } from '../data/habits'
import { useSessions } from '../data/sessions'
import { useTasks } from '../data/tasks'
import { greeting, productivityScore, todayList, upcomingDeadlines, type TodayItem } from '../lib/dashboard'
import { dayKey } from '../lib/dates'
import { minutesOn } from '../lib/focus'
import { byUsualTime, isDue, keysFor, type Habit } from '../lib/habits'
import { firstName, formatMinutes } from '../lib/profile'
import { compareTasks, dueLabel, quickTask } from '../lib/tasks'
import { useNow } from '../lib/useNow'
import { useFocus } from '../focus/focusContext'
import { loadPrefs, planFromPrefs } from '../focus/prefs'
import { useHabitToggle } from '../habits/useHabitToggle'
import { useTaskActions } from '../tasks/useTaskActions'
import ui from '../components/ui.module.css'
import styles from './Dashboard.module.css'

const RING = 2 * Math.PI * 52

function FocusRing({ share }: { share: number }) {
  return (
    <svg className={styles.ring} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="52" className={styles.ringTrack} />
      <circle
        cx="60"
        cy="60"
        r="52"
        className={styles.ringValue}
        strokeDasharray={RING}
        strokeDashoffset={RING * (1 - Math.min(1, share))}
        transform="rotate(-90 60 60)"
      />
    </svg>
  )
}

function timeLabel(time: string) {
  const [h, m] = time.split(':').map(Number)
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function DashboardPage() {
  const { user, profile } = useSignedIn()
  const uid = user.uid
  const tasks = useTasks(uid)
  const habits = useHabits(uid)
  const logs = useHabitLogs(uid)
  const sessions = useSessions(uid)
  const focus = useFocus()
  const taskActions = useTaskActions(uid, tasks.data)
  const toggleHabit = useHabitToggle(uid)
  const now = useNow()
  const today = dayKey(now)
  const [ticked, setTicked] = useState('')
  const [draft, setDraft] = useState('')

  const loaded = tasks.loaded && habits.loaded && logs.loaded && sessions.loaded

  const minutes = minutesOn(sessions.data, today)
  const goal = profile.dailyFocusGoalMinutes

  const keysOf = (h: Habit) => keysFor(logs.data, h.id)
  const dueHabits = habits.data.filter((h) => !h.archived && isDue(h, keysOf(h), today)).sort(byUsualTime)
  const items = todayList(tasks.data, dueHabits, logs.data, now)
  const doneCount = items.filter((i) => i.done).length
  const taskItems = items.filter((i) => i.kind === 'task')
  const habitItems = items.filter((i) => i.kind === 'habit')

  const score = productivityScore({
    focusMinutes: minutes,
    focusGoal: goal,
    tasksDone: taskItems.filter((i) => i.done).length,
    tasksTotal: taskItems.length,
    habitsDone: habitItems.filter((i) => i.done).length,
    habitsTotal: habitItems.length,
  })
  const comingUp = upcomingDeadlines(tasks.data, today)
    .filter((t) => t.dueDate > today)
    .slice(0, 3)

  const firstOpen = items.find((i) => i.kind === 'task' && !i.done)
  const nextUp =
    firstOpen?.kind === 'task' ? firstOpen.task : tasks.data.filter((t) => t.status !== 'done').sort(compareTasks)[0]
  const quickPlan = planFromPrefs(loadPrefs(), nextUp ? { kind: 'task', id: nextUp.id, title: nextUp.title } : null)

  const date = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  function add(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    taskActions.save(null, quickTask(draft, today))
    setDraft('')
  }

  function toggle(item: TodayItem) {
    setTicked(item.done ? '' : item.id)
    if (item.kind === 'task') taskActions.toggle(item.task)
    else if (!toggleHabit(item.habit, keysOf(item.habit), today)) setTicked('')
  }

  return (
    <section className={styles.page} aria-busy={!loaded}>
      <header className={styles.head}>
        <p className={styles.date}>{date}</p>
        <h1>
          {greeting(now.getHours())}, {firstName(profile)}
        </h1>
      </header>

      <article className={`${ui.card} ${styles.focus}`}>
        <div className={styles.focusMain}>
          <div className={styles.ringWrap}>
            <FocusRing share={minutes / goal} />
            <div className={styles.ringLabel}>
              <strong className="num">{formatMinutes(minutes)}</strong>
              <span className="num">of {formatMinutes(goal)}</span>
            </div>
          </div>
          <div className={styles.focusBody}>
            <p className={styles.toGo}>
              {minutes >= goal ? 'Focus goal reached' : `${formatMinutes(goal - minutes)} of focus to go`}
            </p>
            {nextUp && (
              <p className={styles.nextUp}>
                Next: <strong>{nextUp.title}</strong>
              </p>
            )}
            <div className={styles.focusActions}>
              <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => focus.start(quickPlan)}>
                <Play size={16} aria-hidden="true" />
                Start focus<span className={styles.minutes}> · {quickPlan.focusMinutes} min</span>
              </button>
              <Link to="/focus" className={`${ui.button} ${ui.ghost} ${styles.iconButton}`} aria-label="Focus options" title="Focus options">
                <SlidersHorizontal size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <details className={styles.score}>
          <summary>
            <span>Productivity score</span>
            <strong className="num">{score.score}</strong>
            <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
          </summary>
          <ul className={styles.parts}>
            {score.parts.map((p) => (
              <li key={p.id}>
                <span>{p.label}</span>
                <div className={styles.partBar} aria-hidden="true">
                  <span style={{ width: `${p.value * 100}%` }} />
                </div>
                <span className={`${styles.faint} num`}>
                  {p.detail} · {p.weight}%
                </span>
              </li>
            ))}
          </ul>
        </details>
      </article>

      <article className={`${ui.card} ${styles.today}`}>
        <div className={styles.cardHead}>
          <h2>Today</h2>
          {items.length > 0 && (
            <span className={`${styles.faint} num`}>
              {doneCount} of {items.length} done
            </span>
          )}
        </div>

        <form className={styles.quickAdd} onSubmit={add}>
          <Plus size={18} aria-hidden="true" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a task for today"
            aria-label="Add a task for today"
            maxLength={120}
            enterKeyHint="done"
          />
          {draft.trim() && (
            <button type="submit" className={`${ui.button} ${ui.primary} ${styles.addButton}`}>
              Add
            </button>
          )}
        </form>

        {items.length ? (
          <ul className={styles.checklist}>
            {items.map((item) => {
              const title = item.kind === 'task' ? item.task.title : item.habit.name
              const meta =
                item.kind === 'task' && item.overdue
                  ? item.task.dueDate < today
                    ? dueLabel(item.task, today)
                    : `Overdue · ${timeLabel(item.time)}`
                  : item.time
                    ? timeLabel(item.time)
                    : ''
              return (
                <li
                  key={`${item.kind}-${item.id}`}
                  className={`${item.done ? styles.done : ''} ${ticked === item.id ? styles.pop : ''}`}
                >
                  <button
                    type="button"
                    className={styles.check}
                    aria-pressed={item.done}
                    aria-label={`${item.done ? 'Undo' : 'Complete'} ${title}`}
                    onClick={() => toggle(item)}
                  >
                    <Check size={14} strokeWidth={3} aria-hidden="true" />
                  </button>
                  <span className={styles.itemText}>
                    {title}
                    {item.kind === 'habit' && (
                      <Repeat size={13} className={styles.habitIcon} aria-label="Habit" role="img" />
                    )}
                  </span>
                  {item.kind === 'task' && !item.done && (item.task.priority === 'urgent' || item.task.priority === 'high') && (
                    <span
                      className={`${styles.dot} ${styles[item.task.priority]}`}
                      role="img"
                      aria-label={`${item.task.priority} priority`}
                      title={`${item.task.priority} priority`}
                    />
                  )}
                  {meta && !item.done && (
                    <span className={`num ${item.overdue ? styles.late : styles.faint}`}>{meta}</span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className={styles.empty}>Nothing due today. Add a task above to plan your day.</p>
        )}
      </article>

      {comingUp.length > 0 && (
        <section className={styles.comingUp} aria-labelledby="coming-up">
          <div className={styles.cardHead}>
            <h2 id="coming-up">Coming up</h2>
            <Link to="/calendar" className={styles.more}>
              Calendar <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <ul>
            {comingUp.map((t) => (
              <li key={t.id}>
                <span className={styles.itemText}>{t.title}</span>
                <span className={`${styles.faint} num`}>{dueLabel(t, today)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}
