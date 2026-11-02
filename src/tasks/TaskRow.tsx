import { Check, Clock3, ListChecks, Repeat } from 'lucide-react'
import { clock, parseClock } from '../lib/dates'
import { formatMinutes } from '../lib/profile'
import { dueLabel, isOverdue, STATUS_LABEL, subtaskProgress, type Task } from '../lib/tasks'
import styles from './Tasks.module.css'

type Props = {
  task: Task
  now: Date
  today: string
  onToggle: () => void
  onOpen: () => void
  /** Hide the date where the surrounding list already shows it, as on the calendar. */
  hideDate?: boolean
}

export function TaskRow({ task, now, today, onToggle, onOpen, hideDate }: Props) {
  const done = task.status === 'done'
  const late = isOverdue(task, now)
  const steps = subtaskProgress(task)
  const due = hideDate ? (task.dueTime ? clock(parseClock(task.dueTime)) : '') : dueLabel(task, today)

  return (
    <li className={`${styles.row} ${done ? styles.done : ''}`}>
      <button
        type="button"
        className={styles.check}
        aria-pressed={done}
        aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title}`}
        onClick={onToggle}
      >
        <Check size={16} strokeWidth={3} aria-hidden="true" />
      </button>
      <button type="button" className={styles.rowBody} onClick={onOpen}>
        <span className={styles.title}>{task.title}</span>
        <span className={styles.meta}>
          <span className={`${styles.priority} ${styles[task.priority]}`}>{task.priority}</span>
          {task.status === 'in_progress' && <span className={styles.progress}>{STATUS_LABEL.in_progress}</span>}
          {due && <span className={late ? styles.late : ''}>{due}</span>}
          {steps.total > 0 && (
            <span className={styles.metaIcon}>
              <ListChecks size={13} aria-hidden="true" />
              <span className="num">
                {steps.done}/{steps.total}
              </span>
            </span>
          )}
          {task.recurrence.type !== 'none' && (
            <span className={styles.metaIcon} title="Repeats">
              <Repeat size={13} aria-label="Repeats" />
            </span>
          )}
          {task.estimateMinutes > 0 && (
            <span className={styles.metaIcon}>
              <Clock3 size={13} aria-hidden="true" />
              {formatMinutes(task.estimateMinutes)}
            </span>
          )}
          <span className={styles.categoryText}>{task.category}</span>
        </span>
      </button>
    </li>
  )
}
