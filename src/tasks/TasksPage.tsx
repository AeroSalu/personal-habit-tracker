import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useSessions } from '../data/sessions'
import { useTasks } from '../data/tasks'
import { minutesByTask } from '../lib/focus'
import { dayKey } from '../lib/dates'
import { CATEGORIES } from '../lib/habits'
import {
  DEFAULT_FILTER,
  GROUP_LABEL,
  groupTasks,
  matchesFilter,
  PRIORITIES,
  STATUS_LABEL,
  type Task,
  type TaskFilter,
} from '../lib/tasks'
import { useNow } from '../lib/useNow'
import { TaskForm } from './TaskForm'
import { TaskRow } from './TaskRow'
import { useTaskActions } from './useTaskActions'
import ui from '../components/ui.module.css'
import styles from './Tasks.module.css'

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const DONE_SHOWN = 30

export function TasksPage() {
  const { user } = useSignedIn()
  const tasks = useTasks(user.uid)
  const focused = minutesByTask(useSessions(user.uid).data)
  const actions = useTaskActions(user.uid, tasks.data)
  const navigate = useNavigate()
  const now = useNow()
  const today = dayKey(now)

  const [filter, setFilter] = useState<TaskFilter>(DEFAULT_FILTER)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)

  const visible = tasks.data.filter((t) => matchesFilter(t, filter))
  const groups = groupTasks(visible, now)
  const open = tasks.data.filter((t) => t.status !== 'done')
  const filtered = filter.query || filter.category !== 'all' || filter.priority !== 'all' || filter.status !== 'active'
  const set = (change: Partial<TaskFilter>) => setFilter((f) => ({ ...f, ...change }))
  const current = editing && editing !== 'new' ? tasks.data.find((t) => t.id === editing.id) ?? null : null

  if (!tasks.loaded) return <section className={styles.page} aria-busy="true" />

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Tasks</h1>
          <p className={`${styles.sub} num`}>
            {open.length} open{groups.find((g) => g.id === 'overdue') ? ` · ${groups.find((g) => g.id === 'overdue')!.tasks.length} overdue` : ''}
          </p>
        </div>
        <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => setEditing('new')}>
          <Plus size={18} aria-hidden="true" />
          New task
        </button>
      </header>

      {tasks.data.length > 0 && (
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Search size={16} aria-hidden="true" />
            <input
              id="task-search"
              type="search"
              placeholder="Search tasks"
              aria-label="Search tasks"
              value={filter.query}
              onChange={(e) => set({ query: e.target.value })}
            />
          </label>
          <div className={styles.filters}>
            <select
              id="filter-status"
              aria-label="Status"
              value={filter.status}
              onChange={(e) => set({ status: e.target.value as TaskFilter['status'] })}
            >
              <option value="active">Open</option>
              <option value="todo">{STATUS_LABEL.todo}</option>
              <option value="in_progress">{STATUS_LABEL.in_progress}</option>
              <option value="done">{STATUS_LABEL.done}</option>
              <option value="all">All</option>
            </select>
            <select
              id="filter-priority"
              aria-label="Priority"
              value={filter.priority}
              onChange={(e) => set({ priority: e.target.value as TaskFilter['priority'] })}
            >
              <option value="all">Any priority</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {capital(p)}
                </option>
              ))}
            </select>
            <select
              id="filter-category"
              aria-label="Category"
              value={filter.category}
              onChange={(e) => set({ category: e.target.value as TaskFilter['category'] })}
            >
              <option value="all">Any category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {capital(c)}
                </option>
              ))}
            </select>
            {filtered && (
              <button type="button" className={ui.link} onClick={() => setFilter(DEFAULT_FILTER)}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {!tasks.data.length ? (
        <div className={styles.empty}>
          <h2>Plan what matters</h2>
          <p>Add the things you need to get done, with a priority and a deadline. Big ones can be split into subtasks.</p>
          <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => setEditing('new')}>
            Add a task
          </button>
        </div>
      ) : !groups.length ? (
        <p className={styles.quiet}>{filtered ? 'No tasks match these filters.' : 'Nothing open. Add a task or show done ones.'}</p>
      ) : (
        groups.map((group) => (
          <div key={group.id} className={styles.group}>
            <h2 className={`${styles.groupTitle} ${group.id === 'overdue' ? styles.lateTitle : ''}`}>
              {GROUP_LABEL[group.id]} <span className="num">{group.tasks.length}</span>
            </h2>
            <ul className={styles.list}>
              {group.tasks.slice(0, group.id === 'done' ? DONE_SHOWN : undefined).map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  now={now}
                  today={today}
                  focusMinutes={focused.get(t.id)}
                  onToggle={() => actions.toggle(t)}
                  onOpen={() => setEditing(t)}
                />
              ))}
            </ul>
          </div>
        ))
      )}

      {editing && (
        <TaskForm
          key={current?.id ?? 'new'}
          task={current}
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
