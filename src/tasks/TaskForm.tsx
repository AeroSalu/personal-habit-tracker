import { useState, type FormEvent } from 'react'
import { BookmarkPlus, Plus, Timer, Trash2, X } from 'lucide-react'
import { Dialog } from '../components/Dialog'
import { WEEK, weekday } from '../lib/dates'
import { CATEGORIES, type Category } from '../lib/habits'
import {
  PRIORITIES,
  STATUS_LABEL,
  STATUSES,
  taskError,
  type Priority,
  type Recurrence,
  type Status,
  type Subtask,
  type Task,
  type TaskFields,
} from '../lib/tasks'
import ui from '../components/ui.module.css'
import styles from './Tasks.module.css'

type Props = {
  task: Task | null
  /** Pre-filled deadline for a new task, such as the day picked on the calendar. */
  defaultDate?: string
  /** Starting values for a new task, such as from a template. */
  preset?: TaskFields
  onSave: (fields: TaskFields) => void
  onDelete?: () => void
  onFocus?: () => void
  /** Offers "Save as template" with the form's current details. */
  onSaveTemplate?: (name: string, fields: TaskFields) => void
  onClose: () => void
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const ESTIMATES = [15, 30, 60, 90, 120]
const newId = () => Math.random().toString(36).slice(2, 10)

export function TaskForm({ task, defaultDate = '', preset, onSave, onDelete, onFocus, onSaveTemplate, onClose }: Props) {
  const start = task ?? preset
  const [title, setTitle] = useState(start?.title ?? '')
  const [description, setDescription] = useState(start?.description ?? '')
  const [category, setCategory] = useState<Category>(start?.category ?? 'work')
  const [priority, setPriority] = useState<Priority>(start?.priority ?? 'medium')
  const [status, setStatus] = useState<Status>(start?.status ?? 'todo')
  const [dueDate, setDueDate] = useState(start?.dueDate || defaultDate)
  const [dueTime, setDueTime] = useState(start?.dueTime ?? '')
  const [recurrence, setRecurrence] = useState<Recurrence>(start?.recurrence ?? { type: 'none' })
  const [estimate, setEstimate] = useState(start?.estimateMinutes ?? 0)
  const [subtasks, setSubtasks] = useState<Subtask[]>(start?.subtasks ?? [])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [templateName, setTemplateName] = useState<string | null>(null)
  const [templateSaved, setTemplateSaved] = useState(false)
  const [error, setError] = useState('')

  const currentFields = (): TaskFields => ({
    title,
    description,
    category,
    priority,
    status,
    dueDate,
    dueTime: dueDate ? dueTime : '',
    subtasks,
    recurrence,
    estimateMinutes: estimate,
  })

  function setRepeat(type: Recurrence['type']) {
    if (type === 'custom') setRecurrence({ type, days: dueDate ? [weekday(dueDate)] : [1] })
    else setRecurrence({ type })
  }

  function toggleRepeatDay(day: number) {
    if (recurrence.type !== 'custom') return
    const days = recurrence.days.includes(day) ? recurrence.days.filter((d) => d !== day) : [...recurrence.days, day]
    setRecurrence({ type: 'custom', days })
  }

  function updateSubtask(id: string, change: Partial<Subtask>) {
    setSubtasks((list) => list.map((s) => (s.id === id ? { ...s, ...change } : s)))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const fields = currentFields()
    const problem = taskError(fields)
    setError(problem)
    if (!problem) {
      onSave(fields)
      onClose()
    }
  }

  return (
    <Dialog title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <label className={ui.field}>
          <span className={ui.label}>Task</span>
          <input
            id="task-title"
            className={ui.input}
            value={title}
            maxLength={120}
            placeholder="Finish the DSA assignment"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className={ui.field}>
          <span className={ui.label}>Description (optional)</span>
          <textarea
            id="task-description"
            className={`${ui.input} ${styles.textarea}`}
            rows={2}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <fieldset className={styles.fieldset}>
          <legend className={ui.label}>Priority</legend>
          <div className={ui.chips}>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                className={`${ui.chip} ${styles.priorityChip} ${styles[p]}`}
                aria-pressed={priority === p}
                onClick={() => setPriority(p)}
              >
                {capital(p)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={ui.label}>Category</legend>
          <div className={ui.chips}>
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className={ui.chip} aria-pressed={category === c} onClick={() => setCategory(c)}>
                {capital(c)}
              </button>
            ))}
          </div>
        </fieldset>

        {task && (
          <fieldset className={styles.fieldset}>
            <legend className={ui.label}>Status</legend>
            <div className={styles.segmented}>
              {STATUSES.map((s) => (
                <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className={styles.twoUp}>
          <label className={ui.field}>
            <span className={ui.label}>Due date</span>
            <input id="task-date" className={ui.input} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Time (optional)</span>
            <input
              id="task-time"
              className={ui.input}
              type="time"
              value={dueTime}
              disabled={!dueDate}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </label>
        </div>

        <fieldset className={styles.fieldset}>
          <legend className={ui.label}>Repeat</legend>
          <div className={ui.chips}>
            {(['none', 'daily', 'weekly', 'custom'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={ui.chip}
                aria-pressed={recurrence.type === type}
                onClick={() => setRepeat(type)}
              >
                {type === 'none' ? 'Never' : type === 'custom' ? 'Pick days' : capital(type)}
              </button>
            ))}
          </div>
          {recurrence.type === 'custom' && (
            <div className={styles.dayPicker} role="group" aria-label="Repeat on">
              {WEEK.map((w) => (
                <button
                  key={w.day}
                  type="button"
                  aria-pressed={recurrence.days.includes(w.day)}
                  aria-label={w.short}
                  onClick={() => toggleRepeatDay(w.day)}
                >
                  {w.letter}
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={ui.label}>Estimate (optional)</legend>
          <div className={ui.chips}>
            <button type="button" className={ui.chip} aria-pressed={estimate === 0} onClick={() => setEstimate(0)}>
              None
            </button>
            {ESTIMATES.map((m) => (
              <button key={m} type="button" className={ui.chip} aria-pressed={estimate === m} onClick={() => setEstimate(m)}>
                {m < 60 ? `${m}m` : `${m / 60}h`}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={ui.label}>Subtasks</legend>
          <ul className={styles.subtasks}>
            {subtasks.map((s, i) => (
              <li key={s.id}>
                <input
                  type="checkbox"
                  checked={s.done}
                  aria-label={`Subtask ${i + 1} done`}
                  onChange={(e) => updateSubtask(s.id, { done: e.target.checked })}
                />
                <input
                  className={ui.input}
                  value={s.title}
                  maxLength={120}
                  aria-label={`Subtask ${i + 1}`}
                  placeholder="Step"
                  onChange={(e) => updateSubtask(s.id, { title: e.target.value })}
                />
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`Remove subtask ${i + 1}`}
                  onClick={() => setSubtasks((list) => list.filter((x) => x.id !== s.id))}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`${ui.button} ${ui.ghost} ${styles.addStep}`}
            onClick={() => setSubtasks((list) => [...list, { id: newId(), title: '', done: false }])}
          >
            <Plus size={16} aria-hidden="true" />
            Add subtask
          </button>
        </fieldset>

        <p className={ui.error} role="alert">
          {error}
        </p>

        <div className={styles.formActions}>
          <button type="submit" className={`${ui.button} ${ui.primary}`}>
            Save task
          </button>
          {onFocus && task?.status !== 'done' && (
            <button type="button" className={ui.button} onClick={onFocus}>
              <Timer size={16} aria-hidden="true" />
              Start focus
            </button>
          )}
        </div>

        {onSaveTemplate &&
          (templateSaved ? (
            <p className={styles.saved} role="status">
              Saved as a template.
            </p>
          ) : templateName === null ? (
            <button
              type="button"
              className={`${ui.button} ${ui.ghost} ${styles.templateButton}`}
              onClick={() => setTemplateName(title.trim())}
            >
              <BookmarkPlus size={16} aria-hidden="true" />
              Save as template
            </button>
          ) : (
            <div className={styles.templateRow}>
              <label className={ui.field}>
                <span className={ui.label}>Template name</span>
                <input
                  id="template-name"
                  className={ui.input}
                  value={templateName}
                  maxLength={60}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={ui.button}
                disabled={!templateName.trim()}
                onClick={() => {
                  onSaveTemplate(templateName, currentFields())
                  setTemplateSaved(true)
                }}
              >
                Save template
              </button>
            </div>
          ))}

        {onDelete &&
          (confirmDelete ? (
            <div className={styles.confirm} role="alert">
              <span>Delete this task for good?</span>
              <button type="button" className={`${ui.button} ${styles.danger}`} onClick={onDelete}>
                Delete
              </button>
              <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
            </div>
          ) : (
            <button type="button" className={`${ui.button} ${ui.ghost} ${styles.deleteButton}`} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} aria-hidden="true" />
              Delete task
            </button>
          ))}
      </form>
    </Dialog>
  )
}
