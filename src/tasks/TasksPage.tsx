import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownUp, Columns3, LayoutTemplate, List, Plus, Search } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useSessions } from '../data/sessions'
import { useTasks } from '../data/tasks'
import { useTemplates } from '../data/templates'
import { byOrder } from '../lib/board'
import { minutesByTask } from '../lib/focus'
import { fieldsFromTemplate } from '../lib/templates'
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
  type TaskFields,
  type TaskFilter,
} from '../lib/tasks'
import { useNow } from '../lib/useNow'
import { TaskBoard } from './TaskBoard'
import { TaskForm } from './TaskForm'
import { TaskRow } from './TaskRow'
import { TemplatePicker } from './TemplatePicker'
import { useTaskActions } from './useTaskActions'
import ui from '../components/ui.module.css'
import styles from './Tasks.module.css'

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const DONE_SHOWN = 30
const VIEW_KEY = 'lockin.tasksView'

type View = 'list' | 'board'
type Sort = 'smart' | 'manual'
type Editing = { task: Task } | { preset?: TaskFields } | null

function loadView(): { view: View; sort: Sort } {
  try {
    const saved = JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}')
    return { view: saved.view === 'board' ? 'board' : 'list', sort: saved.sort === 'manual' ? 'manual' : 'smart' }
  } catch {
    return { view: 'list', sort: 'smart' }
  }
}

export function TasksPage() {
  const { user } = useSignedIn()
  const tasks = useTasks(user.uid)
  const templates = useTemplates(user.uid)
  const focused = minutesByTask(useSessions(user.uid).data)
  const actions = useTaskActions(user.uid, tasks.data)
  const navigate = useNavigate()
  const now = useNow()
  const today = dayKey(now)

  const [filter, setFilter] = useState<TaskFilter>(DEFAULT_FILTER)
  const [editing, setEditing] = useState<Editing>(null)
  const [picking, setPicking] = useState(false)
  const [{ view, sort }, setLayout] = useState(loadView)

  function changeLayout(change: Partial<{ view: View; sort: Sort }>) {
    setLayout((l) => {
      const next = { ...l, ...change }
      try {
        localStorage.setItem(VIEW_KEY, JSON.stringify(next))
      } catch {
        // The choice just won't be remembered.
      }
      return next
    })
  }

  const onBoard = view === 'board'
  // The board shows every status, so the status filter only applies to the list.
  const visible = tasks.data.filter((t) => matchesFilter(t, onBoard ? { ...filter, status: 'all' } : filter))
  const groups = groupTasks(visible, now)
  const open = tasks.data.filter((t) => t.status !== 'done')
  const filtered = filter.query || filter.category !== 'all' || filter.priority !== 'all' || filter.status !== 'active'
  const set = (change: Partial<TaskFilter>) => setFilter((f) => ({ ...f, ...change }))
  const current = editing && 'task' in editing ? tasks.data.find((t) => t.id === editing.task.id) ?? null : null
  const overdueCount = groups.find((g) => g.id === 'overdue')?.tasks.length ?? 0

  const row = (t: Task, i: number) => (
    <TaskRow
      key={t.id}
      index={i}
      task={t}
      now={now}
      today={today}
      focusMinutes={focused.get(t.id)}
      onToggle={() => actions.toggle(t)}
      onOpen={() => setEditing({ task: t })}
    />
  )

  if (!tasks.loaded) return <section className={styles.page} aria-busy="true" />

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Tasks</h1>
          <p className={`${styles.sub} num`}>
            {open.length} open{overdueCount ? ` · ${overdueCount} overdue` : ''}
          </p>
        </div>
        <div className={styles.headActions}>
          <button type="button" className={ui.button} onClick={() => setPicking(true)}>
            <LayoutTemplate size={16} aria-hidden="true" />
            <span className={styles.hideNarrow}>From template</span>
            <span className={styles.showNarrow}>Template</span>
          </button>
          <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => setEditing({})}>
            <Plus size={18} aria-hidden="true" />
            New task
          </button>
        </div>
      </header>

      {tasks.data.length > 0 && (
        <div className={styles.layoutBar}>
          <div className={styles.viewSwitch} role="group" aria-label="View">
            <button type="button" aria-pressed={!onBoard} onClick={() => changeLayout({ view: 'list' })}>
              <List size={16} aria-hidden="true" />
              List
            </button>
            <button type="button" aria-pressed={onBoard} onClick={() => changeLayout({ view: 'board' })}>
              <Columns3 size={16} aria-hidden="true" />
              Board
            </button>
          </div>
          {!onBoard && (
            <label className={styles.sortPick}>
              <ArrowDownUp size={14} aria-hidden="true" />
              <select id="task-sort" aria-label="Sort" value={sort} onChange={(e) => changeLayout({ sort: e.target.value as Sort })}>
                <option value="smart">By deadline and priority</option>
                <option value="manual">Manual order</option>
              </select>
            </label>
          )}
        </div>
      )}

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
            {!onBoard && (
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
            )}
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
          <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => setEditing({})}>
            Add a task
          </button>
        </div>
      ) : onBoard ? (
        <TaskBoard
          tasks={visible}
          now={now}
          today={today}
          focused={focused}
          onOpen={(t) => setEditing({ task: t })}
          onMove={actions.move}
        />
      ) : sort === 'manual' ? (
        visible.length ? (
          <div className={styles.group}>
            <p className={styles.quiet}>In your own order. Drag cards on the board to change it.</p>
            <ul className={styles.list}>{[...visible].sort(byOrder).map(row)}</ul>
          </div>
        ) : (
          <p className={styles.quiet}>No tasks match these filters.</p>
        )
      ) : !groups.length ? (
        <p className={styles.quiet}>{filtered ? 'No tasks match these filters.' : 'Nothing open. Add a task or show done ones.'}</p>
      ) : (
        groups.map((group) => (
          <div key={group.id} className={styles.group}>
            <h2 className={`${styles.groupTitle} ${group.id === 'overdue' ? styles.lateTitle : ''}`}>
              {GROUP_LABEL[group.id]} <span className="num">{group.tasks.length}</span>
            </h2>
            <ul className={styles.list}>{group.tasks.slice(0, group.id === 'done' ? DONE_SHOWN : undefined).map(row)}</ul>
          </div>
        ))
      )}

      {picking && (
        <TemplatePicker
          saved={templates.data}
          onUse={(t) => {
            setPicking(false)
            setEditing({ preset: fieldsFromTemplate(t, today) })
          }}
          onDelete={actions.removeTemplate}
          onClose={() => setPicking(false)}
        />
      )}

      {editing && (
        <TaskForm
          key={current?.id ?? 'new'}
          task={current}
          preset={'preset' in editing ? editing.preset : undefined}
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
          onSaveTemplate={actions.saveTemplate}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}
