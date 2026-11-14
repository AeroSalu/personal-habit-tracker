import type { CSSProperties } from 'react'
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
  /** Minutes of focus sessions spent on this task. */
  focusMinutes?: number
  /** Position in the list, for the staggered entrance. */
  index?: number
}

export function TaskRow({ task, now, today, onToggle, onOpen, hideDate, focusMinutes = 0, index = 0 }: Props) {
  const done = task.status === 'done'
  const late = isOverdue(task, now)
  const steps = subtaskProgress(task)
  const due = hideDate ? (task.dueTime ? clock(parseClock(task.dueTime)) : '') : dueLabel(task, today)

  return (
    <li className={`${styles.row} ${done ? styles.done : ''} enter`} style={{ '--i': index } as CSSProperties}>
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
          {(task.estimateMinutes > 0 || focusMinutes > 0) && (
            <span
              className={`${styles.metaIcon} ${task.estimateMinutes && focusMinutes > task.estimateMinutes ? styles.over : ''}`}
              title={task.estimateMinutes ? 'Focused / estimated' : 'Focused'}
            >
              <Clock3 size={13} aria-hidden="true" />
              <span className="num">
                {focusMinutes > 0 && formatMinutes(focusMinutes)}
                {focusMinutes > 0 && task.estimateMinutes > 0 && ' / '}
                {task.estimateMinutes > 0 && formatMinutes(task.estimateMinutes)}
              </span>
            </span>
          )}
          <span className={styles.categoryText}>{task.category}</span>
        </span>
      </button>
    </li>
  )
}
