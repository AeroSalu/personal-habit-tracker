import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { parseTask } from '../lib/parseTask'
import type { TaskFields } from '../lib/tasks'
import ui from '../components/ui.module.css'
import styles from './QuickAdd.module.css'

type Props = {
  /** Tasks with no date read in the text are due today (Today's box) or undated (Tasks). */
  defaultToday: boolean
  placeholder: string
  onAdd: (fields: TaskFields, summary: string) => void
  /** Starting text, as when something is shared into the app. */
  initial?: string
}

/**
 * Type a task in plain words; chips under the box show what was understood before you add it.
 * Marked with `data-quick-add` so the "/" shortcut can find it.
 */
export function QuickAdd({ defaultToday, placeholder, onAdd, initial = '' }: Props) {
  const [draft, setDraft] = useState(initial)
  const parsed = draft.trim() ? parseTask(draft, new Date(), { defaultToday }) : null

  function add(e: FormEvent) {
    e.preventDefault()
    if (!parsed || !parsed.fields.title) return
    onAdd(parsed.fields, parsed.parts.map((p) => p.label).join(' · '))
    setDraft('')
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.box} onSubmit={add}>
        <Plus size={18} aria-hidden="true" />
        <input
          data-quick-add
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-describedby="quick-add-hint"
          maxLength={200}
          enterKeyHint="done"
          autoComplete="off"
        />
        {draft.trim() && (
          <button type="submit" className={`${ui.button} ${ui.primary} ${styles.add}`}>
            Add
          </button>
        )}
      </form>
      <p id="quick-add-hint" className={styles.chips} aria-live="polite">
        {parsed?.parts.length ? (
          parsed.parts.map((p) => (
            <span key={p.kind} className={`${styles.chip} ${styles[p.kind]}`}>
              {p.label}
            </span>
          ))
        ) : (
          <span className={styles.hint}>Try “gym tomorrow 6pm #fitness !high”</span>
        )}
      </p>
    </div>
  )
}
