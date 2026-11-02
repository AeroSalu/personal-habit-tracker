import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Flame, Lock, Trophy } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useHabitLogs, useHabits } from '../data/habits'
import { useSessions } from '../data/sessions'
import { useTasks } from '../data/tasks'
import {
  levelFor,
  lineFor,
  lockInDays,
  lockInStreak,
  greeting,
  productivityScore,
  todaysTasks,
  upcomingDeadlines,
  xpBreakdown,
} from '../lib/dashboard'
import { dayKey } from '../lib/dates'
import { completedOn, minutesOn } from '../lib/focus'
import { byUsualTime, isDue, keysFor, type Habit } from '../lib/habits'
import { firstName, formatMinutes } from '../lib/profile'
import { compareTasks, dueLabel, isOverdue } from '../lib/tasks'
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

  const loaded = tasks.loaded && habits.loaded && logs.loaded && sessions.loaded

  const minutes = minutesOn(sessions.data, today)
  const goal = profile.dailyFocusGoalMinutes
  const sessionsToday = completedOn(sessions.data, today)

  const todays = todaysTasks(tasks.data, today)
  const pending = [...todays.pending].sort(compareTasks)
  const keysOf = (h: Habit) => keysFor(logs.data, h.id)
  const dueHabits = habits.data.filter((h) => !h.archived && isDue(h, keysOf(h), today)).sort(byUsualTime)
  const habitsDone = dueHabits.filter((h) => keysOf(h).has(today)).length

  const score = productivityScore({
    focusMinutes: minutes,
    focusGoal: goal,
    tasksDone: todays.done.length,
    tasksTotal: todays.done.length + todays.pending.length,
    habitsDone,
    habitsTotal: dueHabits.length,
  })
  const streak = lockInStreak(lockInDays(sessions.data, logs.data, tasks.data), today)
  const xp = xpBreakdown(tasks.data, habits.data, logs.data, sessions.data, today)
  const level = levelFor(xp.total)
  const deadlines = upcomingDeadlines(tasks.data, today).slice(0, 6)

  const prefs = loadPrefs()
  const nextUp = pending[0] ?? tasks.data.filter((t) => t.status !== 'done').sort(compareTasks)[0]
  const quickPlan = planFromPrefs(prefs, nextUp ? { kind: 'task', id: nextUp.id, title: nextUp.title } : null)

  const date = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <section className={styles.page} aria-busy={!loaded}>
      <header className={styles.head}>
        <p className={styles.date}>{date}</p>
        <h1>
          {greeting(now.getHours())}, {firstName(profile)}
        </h1>
        <p className={styles.line}>{lineFor(today)}</p>
      </header>

      <div className={styles.grid}>
        <article className={`${ui.card} ${styles.focus}`}>
          <div className={styles.ringWrap}>
            <FocusRing share={minutes / goal} />
            <div className={styles.ringLabel}>
              <strong className="num">{formatMinutes(minutes)}</strong>
              <span className="num">of {formatMinutes(goal)}</span>
            </div>
          </div>
          <div className={styles.focusBody}>
            <h2>Focus today</h2>
            <p className={`${styles.muted} num`}>
              {sessionsToday} session{sessionsToday === 1 ? '' : 's'} completed
              {minutes >= goal ? ' · goal reached' : ` · ${formatMinutes(goal - minutes)} to go`}
            </p>
            {nextUp && (
              <p className={styles.nextUp}>
                Next up: <strong>{nextUp.title}</strong>
              </p>
            )}
            <div className={styles.focusActions}>
              <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => focus.start(quickPlan)}>
                <Lock size={16} aria-hidden="true" />
                Lock in · {quickPlan.focusMinutes} min
              </button>
              <Link to="/focus" className={`${ui.button} ${ui.ghost}`}>
                Options
              </Link>
            </div>
          </div>
        </article>

        <article className={`${ui.card} ${styles.score}`}>
          <div className={styles.cardHead}>
            <h2>Productivity score</h2>
            <span className={`${styles.scoreValue} num`}>{score.score}</span>
          </div>
          <ul className={styles.parts} aria-label="How the score is made">
            {score.parts.map((p) => (
              <li key={p.id}>
                <div className={styles.partHead}>
                  <span>{p.label}</span>
                  <span className={`${styles.muted} num`}>
                    {p.detail} · {p.weight}%
                  </span>
                </div>
                <div className={styles.partBar}>
                  <span style={{ width: `${p.value * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className={styles.footnote}>Focus counts 40%, tasks 35% and habits 25%. Parts with nothing due today are left out.</p>
        </article>

        <article className={`${ui.card} ${styles.today}`}>
          <div className={styles.cardHead}>
            <h2>Today</h2>
            <Link to="/tasks" className={styles.more}>
              All tasks <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <p className={`${styles.subhead} num`}>
            Tasks · {todays.done.length} done, {todays.pending.length} pending
          </p>
          {pending.length ? (
            <ul className={styles.checklist}>
              {pending.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={styles.check}
                    aria-label={`Complete ${t.title}`}
                    onClick={() => taskActions.toggle(t)}
                  >
                    <Check size={14} strokeWidth={3} aria-hidden="true" />
                  </button>
                  <span className={styles.itemText}>{t.title}</span>
                  <span className={`${styles.badge} ${styles[t.priority]}`}>{t.priority}</span>
                </li>
              ))}
              {pending.length > 5 && <li className={styles.muted}>+{pending.length - 5} more</li>}
            </ul>
          ) : (
            <p className={styles.muted}>{todays.done.length ? 'All of today’s tasks are done.' : 'No tasks due today.'}</p>
          )}

          <p className={`${styles.subhead} num`}>
            Habits · {habitsDone} of {dueHabits.length} done
          </p>
          {dueHabits.length ? (
            <ul className={styles.checklist}>
              {dueHabits.map((h) => {
                const done = keysOf(h).has(today)
                return (
                  <li key={h.id} className={`${done ? styles.done : ''} ${ticked === h.id ? styles.pop : ''}`}>
                    <button
                      type="button"
                      className={styles.check}
                      aria-pressed={done}
                      aria-label={`${done ? 'Undo' : 'Complete'} ${h.name}`}
                      onClick={() => {
                        if (toggleHabit(h, keysOf(h), today)) setTicked(h.id)
                      }}
                    >
                      <Check size={14} strokeWidth={3} aria-hidden="true" />
                    </button>
                    <span className={styles.itemText}>{h.name}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className={styles.muted}>No habits due today.</p>
          )}
        </article>

        <article className={`${ui.card} ${styles.progress}`}>
          <div className={styles.stat}>
            <Flame size={22} className={styles.flame} aria-hidden="true" />
            <div>
              <strong className="num">
                {streak.current} day{streak.current === 1 ? '' : 's'}
              </strong>
              <span>Lock-in streak · best {streak.best}</span>
            </div>
          </div>
          <p className={styles.footnote}>A day counts when you finish a focus session, a habit or a task.</p>

          <div className={styles.stat}>
            <Trophy size={22} className={styles.trophy} aria-hidden="true" />
            <div>
              <strong className="num">Level {level.level}</strong>
              <span className="num">{xp.total} XP total</span>
            </div>
          </div>
          <div
            className={styles.xpBar}
            role="progressbar"
            aria-label="Progress to the next level"
            aria-valuemin={0}
            aria-valuemax={level.needed}
            aria-valuenow={level.into}
          >
            <span style={{ width: `${level.share * 100}%` }} />
          </div>
          <p className={`${styles.footnote} num`}>
            {level.needed - level.into} XP to level {level.level + 1} · tasks {xp.tasks} · habits {xp.habits} · focus {xp.sessions}
            {xp.allDone ? ` · all-done days ${xp.allDone}` : ''}
          </p>
        </article>

        <article className={`${ui.card} ${styles.deadlines}`}>
          <div className={styles.cardHead}>
            <h2>Upcoming deadlines</h2>
            <Link to="/calendar" className={styles.more}>
              Calendar <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {deadlines.length ? (
            <ul className={styles.deadlineList}>
              {deadlines.map((t) => (
                <li key={t.id}>
                  <span className={styles.itemText}>{t.title}</span>
                  <span className={`num ${isOverdue(t, now) ? styles.late : styles.muted}`}>{dueLabel(t, today)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Nothing due in the next 7 days.</p>
          )}
        </article>
      </div>
    </section>
  )
}
