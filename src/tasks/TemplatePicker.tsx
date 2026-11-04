import { useState } from 'react'
import { Repeat, Trash2 } from 'lucide-react'
import { Dialog } from '../components/Dialog'
import { formatMinutes } from '../lib/profile'
import { recurrenceLabel } from '../lib/tasks'
import { BUILT_IN_TEMPLATES, type Template } from '../lib/templates'
import ui from '../components/ui.module.css'
import styles from './Tasks.module.css'

type Props = {
  saved: Template[]
  onUse: (template: Template) => void
  onDelete: (template: Template) => void
  onClose: () => void
}

function summary(t: Template) {
  const parts: string[] = [t.category.charAt(0).toUpperCase() + t.category.slice(1)]
  if (t.steps.length) parts.push(`${t.steps.length} subtask${t.steps.length === 1 ? '' : 's'}`)
  if (t.estimateMinutes) parts.push(formatMinutes(t.estimateMinutes))
  return parts.join(' · ')
}

export function TemplatePicker({ saved, onUse, onDelete, onClose }: Props) {
  const [confirming, setConfirming] = useState('')

  const row = (t: Template) => (
    <li key={t.id} className={styles.templateItem}>
      <button type="button" className={styles.templateUse} onClick={() => onUse(t)}>
        <span className={styles.title}>{t.name}</span>
        <span className={styles.meta}>
          <span>{summary(t)}</span>
          {t.recurrence.type !== 'none' && (
            <span className={styles.metaIcon}>
              <Repeat size={13} aria-hidden="true" />
              {recurrenceLabel(t.recurrence)}
            </span>
          )}
        </span>
      </button>
      {!t.builtIn &&
        (confirming === t.id ? (
          <span className={styles.inlineConfirm}>
            <button type="button" className={`${ui.button} ${styles.danger}`} onClick={() => onDelete(t)}>
              Delete
            </button>
            <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setConfirming('')}>
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`Delete template ${t.name}`}
            onClick={() => setConfirming(t.id)}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        ))}
    </li>
  )

  return (
    <Dialog title="New task from a template" onClose={onClose}>
      {saved.length > 0 && (
        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Your templates</h3>
          <ul className={styles.list}>{saved.map(row)}</ul>
        </div>
      )}
      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Starters</h3>
        <ul className={styles.list}>{BUILT_IN_TEMPLATES.map(row)}</ul>
      </div>
      {!saved.length && (
        <p className={styles.quiet}>Save any task as a template from its edit screen to reuse it here.</p>
      )}
    </Dialog>
  )
}
