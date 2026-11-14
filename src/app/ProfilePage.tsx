import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { signOut } from '../auth/authActions'
import { useSignedIn } from '../auth/authContext'
import { ProfileForm } from '../auth/ProfileForm'
import { updateProfile } from '../data/profile'
import { setBadgeAlerts } from '../data/social'
import { SocialSettings } from './SocialSettings'
import { loadTheme, saveTheme, type ThemeChoice } from './theme'
import ui from '../components/ui.module.css'
import styles from './ProfilePage.module.css'

const THEMES: [ThemeChoice, string][] = [
  ['system', 'Match device'],
  ['light', 'Light'],
  ['dark', 'Dark'],
]

export function ProfilePage() {
  const { user, profile } = useSignedIn()
  const [status, setStatus] = useState('')
  const [theme, setTheme] = useState(loadTheme)
  const method = user.providerData.some((p) => p.providerId === 'google.com') ? 'Google' : 'Email and password'

  return (
    <section className={styles.page}>
      <h1>Profile &amp; Settings</h1>

      <div className={`${ui.card} ${styles.section}`}>
        <h2>Profile</h2>
        <ProfileForm
          initial={profile}
          submitLabel="Save changes"
          onSubmit={(fields) => {
            setStatus('Saved')
            updateProfile(user.uid, fields).catch(() => setStatus('Could not save. Try again.'))
          }}
        />
        <p className={styles.status} role="status">
          {status}
        </p>
      </div>

      <div className={`${ui.card} ${styles.section}`}>
        <h2>Preferences</h2>
        <div className={styles.themeRow}>
          <span id="theme-label">
            <strong>Theme</strong>
            <small>Saved on this device.</small>
          </span>
          <div className={ui.chips} role="group" aria-labelledby="theme-label">
            {THEMES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={ui.chip}
                aria-pressed={theme === value}
                onClick={() => {
                  setTheme(value)
                  saveTheme(value)
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className={styles.toggle}>
          <input
            id="badge-alerts"
            type="checkbox"
            checked={profile.badgeAlerts}
            onChange={(e) => setBadgeAlerts(user.uid, e.target.checked).catch(() => setStatus('Could not save that setting.'))}
          />
          <span>
            <strong>Show XP and badge alerts</strong>
            <small>Pop up a message when you earn a badge. Your badges are always on the Challenges page.</small>
          </span>
        </label>
      </div>

      <SocialSettings />

      <div className={`${ui.card} ${styles.section}`}>
        <h2>Account</h2>
        <dl className={styles.facts}>
          <div>
            <dt>Email</dt>
            <dd>{user.email ?? 'None'}</dd>
          </div>
          <div>
            <dt>Sign-in method</dt>
            <dd>{method}</dd>
          </div>
        </dl>
        <button type="button" className={ui.button} onClick={() => signOut()}>
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </section>
  )
}
