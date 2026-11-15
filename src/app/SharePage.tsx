import { useNavigate, useSearchParams } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useTasks } from '../data/tasks'
import { useToast } from '../components/toast'
import { sharedParts } from '../lib/share'
import { QuickAdd } from '../tasks/QuickAdd'
import { useTaskActions } from '../tasks/useTaskActions'
import ui from '../components/ui.module.css'
import styles from './SharePage.module.css'

/** The share target: Android and desktop Chrome send shared text and links here. */
export function SharePage() {
  const { user } = useSignedIn()
  const tasks = useTasks(user.uid)
  const actions = useTaskActions(user.uid, tasks.data)
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { words, url } = sharedParts(params)

  return (
    <section className={styles.page}>
      <h1>Add to Cadence</h1>
      <article className={`${ui.card} ${styles.card}`}>
        <p className={styles.muted}>Edit it if you like, add a date or #tag, then press Add.</p>
        <QuickAdd
          defaultToday={false}
          initial={words || url}
          placeholder="Name the task"
          onAdd={(fields, summary) => {
            actions.save(null, { ...fields, description: url && words ? url : fields.description })
            toast(summary ? `Added · ${summary}` : 'Added to your tasks')
            navigate('/tasks', { replace: true })
          }}
        />
        {url && words && (
          <p className={styles.link}>
            <Link2 size={14} aria-hidden="true" /> {url}
          </p>
        )}
      </article>
    </section>
  )
}
