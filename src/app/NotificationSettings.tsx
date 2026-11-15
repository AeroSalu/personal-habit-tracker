import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useToast } from '../components/toast'
import { setReminderPrefs } from '../data/push'
import { disablePush, enablePush, pushStatus, testReminder, type PushStatus } from '../data/pushDevice'
import type { ReminderPrefs } from '../lib/reminders'
import ui from '../components/ui.module.css'
import styles from './ProfilePage.module.css'

const NOTES: Partial<Record<PushStatus, string>> = {
  'not-set-up': 'Reminders work in the live app once they’re set up. (They can’t be sent while testing locally.)',
  'needs-install': 'On iPhone, add Cadence to your Home Screen first (Share → Add to Home Screen), then turn reminders on from there.',
  unsupported: 'This browser can’t show reminders while the app is closed.',
  denied: 'Notifications are blocked for Cadence. Allow them in your browser or phone settings, then come back.',
}

/** Reminders while the app is closed: this device's switch, what to remind about, and quiet hours. */
export function NotificationSettings() {
  const { user, profile } = useSignedIn()
  const prefs = profile.reminders
  const toast = useToast()
  const [status, setStatus] = useState<PushStatus>(pushStatus)
  const [busy, setBusy] = useState(false)
  const failed = () => toast('That change could not be saved. Check your connection.')
  const save = (change: Partial<ReminderPrefs>) => setReminderPrefs(user.uid, { ...prefs, ...change }).catch(failed)

  async function toggleDevice() {
    setBusy(true)
    try {
      if (status === 'on') {
        await disablePush(user.uid)
        setStatus(pushStatus())
      } else {
        const next = await enablePush(user.uid)
        setStatus(next)
        if (next === 'on') {
          if (!prefs.on) save({ on: true })
          toast('Reminders are on for this device')
        }
      }
    } catch {
      toast('Could not turn reminders on. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const check = (key: 'habits' | 'tasks' | 'plan' | 'review' | 'streak', title: string, text: string) => (
    <label className={styles.toggle}>
      <input type="checkbox" checked={prefs[key]} onChange={(e) => save({ [key]: e.target.checked })} />
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </label>
  )
  const time = (key: 'planTime' | 'reviewTime' | 'quietStart' | 'quietEnd', label: string) => (
    <label className={styles.timeField}>
      <span>{label}</span>
      <input type="time" className={ui.input} value={prefs[key]} onChange={(e) => e.target.value && save({ [key]: e.target.value })} />
    </label>
  )

  return (
    <div className={`${ui.card} ${styles.section}`}>
      <h2>Reminders</h2>
      <div className={styles.themeRow}>
        <span>
          <strong>Reminders on this device</strong>
          <small>Even when Cadence is closed. Turn them on for each phone or computer.</small>
        </span>
        {(status === 'on' || status === 'off') && (
          <button type="button" className={`${ui.button} ${status === 'on' ? '' : ui.primary}`} onClick={toggleDevice} disabled={busy}>
            <BellRing size={16} aria-hidden="true" /> {status === 'on' ? 'Turn off' : 'Turn on'}
          </button>
        )}
      </div>
      {NOTES[status] && <p className={styles.help}>{NOTES[status]}</p>}
      {status === 'on' && (
        <button type="button" className={`${ui.button} ${ui.ghost} ${styles.inlineButton}`} onClick={() => testReminder().catch(() => toast('Could not show a test.'))}>
          Show a test reminder
        </button>
      )}

      <label className={styles.toggle}>
        <input type="checkbox" checked={prefs.on} onChange={(e) => save({ on: e.target.checked })} />
        <span>
          <strong>Send me reminders</strong>
          <small>Turn off to pause them on every device.</small>
        </span>
      </label>

      <fieldset className={styles.reminderKinds} disabled={!prefs.on}>
        {check('habits', 'Habits', 'At each habit’s usual time, unless it’s already ticked.')}
        {check('tasks', 'Tasks with a time', prefs.taskLead ? '15 minutes before they’re due.' : 'When they’re due.')}
        <div className={ui.chips} role="group" aria-label="When to remind about tasks">
          <button type="button" className={ui.chip} aria-pressed={prefs.taskLead === 0} onClick={() => save({ taskLead: 0 })}>
            At the time
          </button>
          <button type="button" className={ui.chip} aria-pressed={prefs.taskLead === 15} onClick={() => save({ taskLead: 15 })}>
            15 min before
          </button>
        </div>
        {check('plan', 'Plan your day', 'A morning nudge until today is planned.')}
        {prefs.plan && time('planTime', 'At')}
        {check('review', 'Wrap up your day', 'An evening nudge until today is reviewed.')}
        {prefs.review && time('reviewTime', 'At')}
        {check('streak', 'Streak about to end', 'At 8 PM, only if nothing’s done yet that day.')}
        <div className={styles.quiet}>
          <strong>Quiet hours</strong>
          <div className={styles.quietTimes}>
            {time('quietStart', 'From')}
            {time('quietEnd', 'Until')}
          </div>
          <small>Nothing is sent in this window. Set both the same to turn quiet hours off.</small>
        </div>
      </fieldset>
      <p className={styles.help}>Reminders can arrive up to 15 minutes late. Open Cadence at least every couple of days so they stay up to date.</p>
    </div>
  )
}
