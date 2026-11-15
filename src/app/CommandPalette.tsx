import { useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, CheckCircle2, Keyboard, Play, Plus, Repeat, type LucideIcon } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { Dialog } from '../components/Dialog'
import { useHabits } from '../data/habits'
import { useTasks } from '../data/tasks'
import { useFocus } from '../focus/focusContext'
import { loadPrefs, planFromPrefs } from '../focus/prefs'
import { parseTask } from '../lib/parseTask'
import { useTaskActions } from '../tasks/useTaskActions'
import { useToast } from '../components/toast'
import { PRIMARY, SECONDARY, SETTINGS } from './nav'
import styles from './CommandPalette.module.css'

type Item = { id: string; icon: LucideIcon; label: string; hint?: string; run: () => void }

const MAX_TASKS = 5
const MAX_HABITS = 3

/**
 * Ctrl/Cmd+K: search tasks and habits, jump to any screen, start focus, or add what you typed
 * as a task (read the same way as quick add). Arrow keys move, Enter runs, Escape closes.
 */
export function CommandPalette({ onClose, onShortcuts }: { onClose: () => void; onShortcuts: () => void }) {
  const { user } = useSignedIn()
  const tasks = useTasks(user.uid)
  const habits = useHabits(user.uid)
  const actions = useTaskActions(user.uid, tasks.data)
  const focus = useFocus()
  const navigate = useNavigate()
  const toast = useToast()
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)

  const q = text.trim().toLowerCase()
  const done = (fn: () => void) => () => {
    onClose()
    fn()
  }

  const items: Item[] = []
  if (q) {
    const { fields, parts } = parseTask(text, new Date())
    if (fields.title) {
      items.push({
        id: 'add',
        icon: Plus,
        label: `Add task “${fields.title}”`,
        hint: parts.map((p) => p.label).join(' · ') || 'No date',
        run: done(() => {
          actions.save(null, fields)
          toast('Task added')
        }),
      })
    }
    const openFirst = [...tasks.data].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done'))
    for (const t of openFirst.filter((t) => t.title.toLowerCase().includes(q)).slice(0, MAX_TASKS)) {
      items.push({
        id: `task-${t.id}`,
        icon: CheckCircle2,
        label: t.title,
        hint: t.status === 'done' ? 'Done task' : 'Task',
        run: done(() => navigate(`/tasks?q=${encodeURIComponent(t.title)}`)),
      })
    }
    for (const h of habits.data.filter((h) => !h.archived && h.name.toLowerCase().includes(q)).slice(0, MAX_HABITS)) {
      items.push({ id: `habit-${h.id}`, icon: Repeat, label: h.name, hint: 'Habit', run: done(() => navigate(`/habits?open=${h.id}`)) })
    }
  }

  const commands: Item[] = [
    {
      id: 'focus',
      icon: Play,
      label: 'Start focus',
      hint: 'F',
      run: done(() => {
        if (!focus.state) focus.start(planFromPrefs(loadPrefs(), null))
      }),
    },
    { id: 'new', icon: Plus, label: 'New task', hint: 'N', run: done(() => navigate('/tasks?new=1')) },
    { id: 'week', icon: CalendarCheck, label: 'Weekly review', run: done(() => navigate('/review')) },
    { id: 'keys', icon: Keyboard, label: 'Keyboard shortcuts', hint: '?', run: done(onShortcuts) },
    ...[...PRIMARY, ...SECONDARY, SETTINGS]
      .filter((n) => n.path)
      .map((n) => ({ id: `go-${n.path}`, icon: n.icon, label: `Go to ${n.label}`, run: done(() => navigate(n.path!)) })),
  ]
  items.push(...commands.filter((c) => !q || c.label.toLowerCase().includes(q)))

  const current = Math.min(active, Math.max(0, items.length - 1))

  function keys(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((current + step + items.length) % Math.max(1, items.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      items[current]?.run()
    }
  }

  return (
    <Dialog title="Search or add" onClose={onClose}>
      <input
        className={styles.input}
        data-autofocus
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setActive(0)
        }}
        onKeyDown={keys}
        placeholder="Search, go to, or type a new task…"
        aria-label="Search or add"
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-list"
        aria-activedescendant={items[current] ? `palette-${items[current].id}` : undefined}
        autoComplete="off"
        maxLength={200}
      />
      <ul id="palette-list" role="listbox" className={styles.list} aria-label="Results">
        {items.map((item, i) => {
          const Icon = item.icon
          return (
            <li
              key={item.id}
              id={`palette-${item.id}`}
              role="option"
              aria-selected={i === current}
              className={i === current ? styles.active : ''}
              onMouseMove={() => setActive(i)}
              onClick={item.run}
            >
              <Icon size={17} aria-hidden="true" />
              <span className={styles.label}>{item.label}</span>
              {item.hint && <span className={styles.hint}>{item.hint}</span>}
            </li>
          )
        })}
        {!items.length && <li className={styles.empty}>Nothing matches.</li>}
      </ul>
    </Dialog>
  )
}
