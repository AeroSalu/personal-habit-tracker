import { useState, type FormEvent } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { authMessage, confirmIdentity } from '../auth/authActions'
import { useSignedIn } from '../auth/authContext'
import { useToast } from '../components/toast'
import { deleteAccount, exportData } from '../data/account'
import { useTasks } from '../data/tasks'
import { tasksCsv } from '../lib/csv'
import { dayKey } from '../lib/dates'
import ui from '../components/ui.module.css'
import styles from './ProfilePage.module.css'

/** Hands the browser a file to save. */
function saveFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Download everything, or delete the account for good. */
export function AccountData() {
  const { user, profile } = useSignedIn()
  const tasks = useTasks(user.uid)
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [typed, setTyped] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const google = user.providerData.some((p) => p.providerId === 'google.com')
  const stamp = dayKey(new Date())

  async function download() {
    setBusy(true)
    try {
      const data = await exportData(user.uid, profile.username)
      saveFile(`cadence-data-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json')
    } catch {
      toast('Could not gather your data. Try again with a connection.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(e: FormEvent) {
    e.preventDefault()
    if (typed.trim() !== 'DELETE') return setError('Type DELETE in capitals to confirm.')
    setError('')
    setBusy(true)
    try {
      await confirmIdentity(user, password)
      await deleteAccount(user, profile.username)
      // Signed out now; the app returns to the sign-in page by itself.
    } catch (err) {
      setError(authMessage(err) || 'Something went wrong, and your account was not deleted. Check your connection and try again.')
      setBusy(false)
    }
  }

  return (
    <div className={`${ui.card} ${styles.section}`}>
      <h2>Your data</h2>
      <p className={styles.help}>Everything you’ve put into Cadence, yours to keep.</p>
      <div className={styles.photoActions}>
        <button type="button" className={ui.button} onClick={download} disabled={busy} aria-busy={busy && !deleting}>
          <Download size={16} aria-hidden="true" /> Download my data
        </button>
        <button
          type="button"
          className={`${ui.button} ${ui.ghost}`}
          disabled={!tasks.loaded}
          onClick={() => saveFile(`cadence-tasks-${stamp}.csv`, tasksCsv(tasks.data), 'text/csv')}
        >
          Tasks as a spreadsheet
        </button>
      </div>

      <div className={styles.danger}>
        <h3>Delete account</h3>
        {!deleting ? (
          <>
            <p className={styles.help}>
              Removes your tasks, habits, sessions, reviews, profile, friends and everything you shared. Groups and rooms you run are
              closed. This can’t be undone, so download your data first if you want a copy.
            </p>
            <button type="button" className={`${ui.button} ${styles.dangerButton}`} onClick={() => setDeleting(true)}>
              <Trash2 size={16} aria-hidden="true" /> Delete my account
            </button>
          </>
        ) : (
          <form className={styles.deleteForm} onSubmit={remove} noValidate>
            <label className={ui.field}>
              <span className={ui.label}>Type DELETE to confirm</span>
              <input className={ui.input} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" />
            </label>
            {!google && (
              <label className={ui.field}>
                <span className={ui.label}>Your password</span>
                <input
                  className={ui.input}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
            )}
            {google && <p className={styles.help}>Google will ask you to sign in once more.</p>}
            <p className={ui.error} role="alert">
              {error}
            </p>
            <div className={styles.photoActions}>
              <button type="submit" className={`${ui.button} ${styles.dangerButton}`} disabled={busy} aria-busy={busy}>
                {busy ? 'Deleting…' : 'Delete everything'}
              </button>
              <button
                type="button"
                className={`${ui.button} ${ui.ghost}`}
                disabled={busy}
                onClick={() => {
                  setDeleting(false)
                  setTyped('')
                  setPassword('')
                  setError('')
                }}
              >
                Keep my account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
