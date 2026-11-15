import { useState, type CSSProperties } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CalendarCheck, ChevronDown, ChevronRight, Moon, Play, Repeat, SlidersHorizontal, Sunrise, Target } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useToast } from '../components/toast'
import { useDays, useWeeks } from '../data/days'
import { useHabitLogs, useHabits } from '../data/habits'
import { useSessions } from '../data/sessions'
import { useTasks } from '../data/tasks'
import { greeting, productivityScore, todayList, upcomingDeadlines, weekRings, type TodayItem } from '../lib/dashboard'
import { dayKey, weekStart } from '../lib/dates'
import { reviewWeekStart, todayPrompt } from '../lib/plan'
import { minutesOn } from '../lib/focus'
import { byUsualTime, isDue, keysFor, type Habit } from '../lib/habits'
import { firstName, formatMinutes } from '../lib/profile'
import { compareTasks, dueLabel } from '../lib/tasks'
import { QuickAdd } from '../tasks/QuickAdd'
import { useNow } from '../lib/useNow'
import { useFocus } from '../focus/focusContext'
import { loadPrefs, planFromPrefs } from '../focus/prefs'
import { useFlip } from '../components/useFlip'
import { useHabitToggle } from '../habits/useHabitToggle'
import { useTaskActions } from '../tasks/useTaskActions'
import * as m from 'motion/react-m'
import { Ring } from '../components/Ring'
import { spring } from '../design/motion'
import { Tick } from '../components/Tick'
import ui from '../components/ui.module.css'
import styles from './Dashboard.module.css'

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
  const days = useDays(uid)
  const weeks = useWeeks(uid)
  const focus = useFocus()
  const taskActions = useTaskActions(uid, tasks.data)
  const toggleHabit = useHabitToggle(uid)
  const now = useNow()
  const toast = useToast()
  const today = dayKey(now)
  const [ticked, setTicked] = useState('')
  const listRef = useFlip<HTMLUListElement>()

  const loaded = tasks.loaded && habits.loaded && logs.loaded && sessions.loaded

  // One gentle prompt at a time: plan in the morning, wrap up in the evening, review on Sunday.
  const prompt =
    days.loaded && weeks.loaded
      ? todayPrompt(
          now,
          days.data.find((d) => d.key === today) ?? null,
          Boolean(weeks.data.find((w) => w.key === reviewWeekStart(today))?.reviewedAt),
        )
      : null
  const PROMPTS = {
    plan: { icon: Sunrise, title: 'Plan your day', text: 'Pick today’s tasks and give them a time.', to: '/plan', cta: 'Plan' },
    review: { icon: Moon, title: 'Wrap up your day', text: 'Move what’s left and note how it went.', to: '/plan', cta: 'Review' },
    week: { icon: CalendarCheck, title: 'Review your week', text: 'Look back and pick next week’s focus.', to: '/review', cta: 'Review' },
  }
  const focusIds = weeks.data.find((w) => w.key === weekStart(today))?.focus ?? []
  const weekFocus = focusIds.map((id) => tasks.data.find((t) => t.id === id)).filter((t) => t !== undefined)

  const minutes = minutesOn(sessions.data, today)
  const goal = profile.dailyFocusGoalMinutes

  const keysOf = (h: Habit) => keysFor(logs.data, h.id)
  const dueHabits = habits.data.filter((h) => !h.archived && isDue(h, keysOf(h), today)).sort(byUsualTime)
  const items = todayList(tasks.data, dueHabits, logs.data, now)
  const doneCount = items.filter((i) => i.done).length
  const taskItems = items.filter((i) => i.kind === 'task')
  const habitItems = items.filter((i) => i.kind === 'habit')

  const tasksDone = taskItems.filter((i) => i.done).length
  const habitsDone = habitItems.filter((i) => i.done).length
  const rings = [
    {
      id: 'focus',
      label: 'Focus',
      value: minutes / goal,
      color: 'var(--ring-focus)',
      detail: `${formatMinutes(minutes)} of ${formatMinutes(goal)}`,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      value: taskItems.length ? tasksDone / taskItems.length : 0,
      color: 'var(--ring-tasks)',
      detail: taskItems.length ? `${tasksDone} of ${taskItems.length}` : 'None due',
    },
    {
      id: 'habits',
      label: 'Habits',
      value: habitItems.length ? habitsDone / habitItems.length : 0,
      color: 'var(--ring-habits)',
      detail: habitItems.length ? `${habitsDone} of ${habitItems.length}` : 'None due',
    },
  ]
  const week = weekRings({ sessions: sessions.data, tasks: tasks.data, habits: habits.data, logs: logs.data, goal }, today)

  const score = productivityScore({
    focusMinutes: minutes,
    focusGoal: goal,
    tasksDone,
    tasksTotal: taskItems.length,
    habitsDone,
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

      {prompt && (
        <Link to={PROMPTS[prompt].to} className={`${ui.card} ${styles.prompt}`}>
          {(() => {
            const Icon = PROMPTS[prompt].icon
            return <Icon size={20} className={styles.promptIcon} aria-hidden="true" />
          })()}
          <span className={styles.promptText}>
            <strong>{PROMPTS[prompt].title}</strong>
            <span>{PROMPTS[prompt].text}</span>
          </span>
          <span className={styles.promptCta}>
            {PROMPTS[prompt].cta} <ChevronRight size={14} aria-hidden="true" />
          </span>
        </Link>
      )}

      {weekFocus.length > 0 && (
        <article className={`${ui.card} ${styles.weekFocus}`}>
          <h2>
            <Target size={16} aria-hidden="true" /> This week’s focus
          </h2>
          <ul className={styles.checklist}>
            {weekFocus.map((t) => (
              <li key={t.id} className={t.status === 'done' ? styles.done : ''}>
                <button
                  type="button"
                  className={styles.check}
                  aria-pressed={t.status === 'done'}
                  aria-label={`${t.status === 'done' ? 'Undo' : 'Complete'} ${t.title}`}
                  onClick={() => taskActions.toggle(t)}
                >
                  <Tick />
                </button>
                <span className={styles.itemText}>
                  <span className={styles.title}>{t.title}</span>
                </span>
                {t.dueDate && t.status !== 'done' && <span className={`${styles.faint} num`}>{dueLabel(t, today)}</span>}
              </li>
            ))}
          </ul>
        </article>
      )}

      <article className={`${ui.card} ${styles.focus}`} aria-label="Today at a glance">
        <div className={styles.focusMain}>
          <div className={styles.ringWrap}>
            {/* While a session runs, focus mode owns the ring; starting from here expands it there. */}
            <m.div layoutId={focus.state ? undefined : 'focus-ring'} transition={spring}>
              <Ring rings={rings} size={128} stroke={12} gap={3} />
            </m.div>
          </div>
          <ul className={styles.legend}>
            {rings.map((r) => (
              <li key={r.id}>
                <span className={styles.swatch} style={{ background: r.color }} aria-hidden="true" />
                <span className={styles.legendLabel}>{r.label}</span>
                <span className={`${styles.legendValue} num`}>{r.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.focusBody}>
          <p className={styles.nextUp}>
            {nextUp ? (
              <>
                Next: <strong>{nextUp.title}</strong>
              </>
            ) : minutes >= goal ? (
              'Focus goal reached'
            ) : (
              `${formatMinutes(goal - minutes)} of focus to go`
            )}
          </p>
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

        <div className={styles.week}>
          <div className={styles.cardHead}>
            <h3>This week</h3>
            <Link to="/analytics" className={styles.more}>
              Analytics <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <ol className={styles.weekDays}>
            {week.map((d) => (
              <li
                key={d.key}
                className={`${d.future ? styles.future : ''} ${d.today ? styles.isToday : ''}`}
                aria-current={d.today ? 'date' : undefined}
              >
                <Ring
                  size={40}
                  stroke={4}
                  gap={1.5}
                  rings={[
                    { value: d.focus, color: 'var(--ring-focus)', label: `${d.label} focus` },
                    {
                      value: d.tasks ?? 0,
                      color: 'var(--ring-tasks)',
                      label: d.tasks === null ? `${d.label} tasks, none due,` : `${d.label} tasks`,
                    },
                    {
                      value: d.habits ?? 0,
                      color: 'var(--ring-habits)',
                      label: d.habits === null ? `${d.label} habits, none due,` : `${d.label} habits`,
                    },
                  ].map((r) => (d.future ? { ...r, value: 0 } : r))}
                />
                <span className={styles.dayLabel} aria-hidden="true">
                  {d.label.slice(0, 1)}
                </span>
              </li>
            ))}
          </ol>
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

        <QuickAdd
          defaultToday
          placeholder="Add a task for today"
          onAdd={(fields, summary) => {
            taskActions.save(null, fields)
            if (fields.dueDate !== today) toast(`Added for ${summary || 'later'}`)
          }}
        />

        {items.length ? (
          <ul className={styles.checklist} ref={listRef}>
            {items.map((item, i) => {
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
                  data-flip={`${item.kind}-${item.id}`}
                  className={`${item.done ? styles.done : ''} ${ticked === item.id ? styles.pop : ''} enter`}
                  style={{ '--i': i } as CSSProperties}
                >
                  <button
                    type="button"
                    className={styles.check}
                    aria-pressed={item.done}
                    aria-label={`${item.done ? 'Undo' : 'Complete'} ${title}`}
                    onClick={() => toggle(item)}
                  >
                    <Tick />
                  </button>
                  <span className={styles.itemText}>
                    <span className={styles.title}>{title}</span>
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
          <EmptyState compact icon={Sun} title="A clear day">
            Nothing is due today. Add a task above to plan it.
          </EmptyState>
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
