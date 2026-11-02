import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useTasks } from '../data/tasks'
import { addDays, dayKey, parseDay, WEEK, weekStart } from '../lib/dates'
import { isOverdue, tasksOn, type Task } from '../lib/tasks'
import { useNow } from '../lib/useNow'
import { TaskForm } from '../tasks/TaskForm'
import { TaskRow } from '../tasks/TaskRow'
import { useTaskActions } from '../tasks/useTaskActions'
import ui from '../components/ui.module.css'
import styles from './Calendar.module.css'

type View = 'month' | 'week'

function monthStart(key: string) {
  return `${key.slice(0, 7)}-01`
}

function shiftMonth(key: string, n: number) {
  const d = parseDay(monthStart(key))
  return dayKey(new Date(d.getFullYear(), d.getMonth() + n, 1, 12))
}

/** Monday-first days covering the month, padded to whole weeks. */
function monthCells(key: string): string[] {
  const first = monthStart(key)
  const next = shiftMonth(key, 1)
  const cells: string[] = []
  for (let k = weekStart(first); k < next || cells.length % 7; k = addDays(k, 1)) cells.push(k)
  return cells
}

export function CalendarPage() {
  const { user } = useSignedIn()
  const tasks = useTasks(user.uid)
  const actions = useTaskActions(user.uid, tasks.data)
  const navigate = useNavigate()
  const now = useNow()
  const today = dayKey(now)

  const [view, setView] = useState<View>('month')
  const [selected, setSelected] = useState(today)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)

  const cells = view === 'month' ? monthCells(selected) : Array.from({ length: 7 }, (_, i) => addDays(weekStart(selected), i))
  const title =
    view === 'month'
      ? parseDay(selected).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `Week of ${parseDay(cells[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  const dayTasks = tasksOn(tasks.data, selected)
  const current = editing && editing !== 'new' ? tasks.data.find((t) => t.id === editing.id) ?? null : null

  function move(n: number) {
    setSelected(view === 'month' ? shiftMonth(selected, n) : addDays(selected, 7 * n))
  }

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1>Calendar</h1>
        <div className={styles.segmented} role="group" aria-label="View">
          {(['month', 'week'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
              {v === 'month' ? 'Month' : 'Week'}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.nav}>
        <button type="button" className={styles.navButton} onClick={() => move(-1)} aria-label={`Previous ${view}`}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <h2>{title}</h2>
        <button type="button" className={styles.navButton} onClick={() => move(1)} aria-label={`Next ${view}`}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        {selected !== today && (
          <button type="button" className={`${ui.button} ${styles.todayButton}`} onClick={() => setSelected(today)}>
            Today
          </button>
        )}
      </div>

      <div className={`${styles.grid} ${view === 'week' ? styles.week : ''}`} aria-busy={!tasks.loaded}>
        {WEEK.map((w) => (
          <span key={w.day} className={styles.weekday}>
            {w.short}
          </span>
        ))}
        {cells.map((k) => {
          const list = tasksOn(tasks.data, k)
          const open = list.filter((t) => t.status !== 'done')
          const late = open.some((t) => isOverdue(t, now))
          const outside = view === 'month' && k.slice(0, 7) !== selected.slice(0, 7)
          const shown = view === 'week' ? list : list.slice(0, 2)
          return (
            <button
              key={k}
              type="button"
              className={[
                styles.cell,
                k === today ? styles.today : '',
                k === selected ? styles.selected : '',
                outside ? styles.outside : '',
              ].join(' ')}
              aria-pressed={k === selected}
              aria-label={`${parseDay(k).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, ${open.length} open task${open.length === 1 ? '' : 's'}`}
              onClick={() => setSelected(k)}
            >
              <span className={`${styles.date} num`}>{Number(k.slice(8))}</span>
              {list.length > 0 && (
                <>
                  <span className={styles.dots} aria-hidden="true">
                    {list.slice(0, 3).map((t) => (
                      <i key={t.id} className={t.status === 'done' ? styles.dotDone : late ? styles.dotLate : styles.dot} />
                    ))}
                  </span>
                  <span className={styles.titles} aria-hidden="true">
                    {shown.map((t) => (
                      <span
                        key={t.id}
                        className={`${styles.chip} ${t.status === 'done' ? styles.chipDone : isOverdue(t, now) ? styles.chipLate : ''}`}
                      >
                        {t.title}
                      </span>
                    ))}
                    {list.length > shown.length && <span className={styles.more}>+{list.length - shown.length} more</span>}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>

      <div className={styles.day}>
        <div className={styles.dayHead}>
          <h2>
            {selected === today
              ? 'Today'
              : parseDay(selected).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
          <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => setEditing('new')}>
            <Plus size={16} aria-hidden="true" />
            Add task
          </button>
        </div>
        {dayTasks.length ? (
          <ul className={styles.list}>
            {dayTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                now={now}
                today={today}
                hideDate
                onToggle={() => actions.toggle(t)}
                onOpen={() => setEditing(t)}
              />
            ))}
          </ul>
        ) : (
          <p className={styles.quiet}>Nothing due this day.</p>
        )}
      </div>

      {editing && (
        <TaskForm
          key={current?.id ?? `new-${selected}`}
          task={current}
          defaultDate={selected}
          onSave={(fields) => actions.save(current, fields)}
          onDelete={
            current
              ? () => {
                  actions.remove(current)
                  setEditing(null)
                }
              : undefined
          }
          onFocus={current ? () => navigate(`/focus?task=${current.id}`) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}
