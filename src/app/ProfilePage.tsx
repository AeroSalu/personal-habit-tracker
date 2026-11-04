import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { signOut } from '../auth/authActions'
import { useSignedIn } from '../auth/authContext'
import { ProfileForm } from '../auth/ProfileForm'
import { updateProfile } from '../data/profile'
import { SocialSettings } from './SocialSettings'
import ui from '../components/ui.module.css'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  const { user, profile } = useSignedIn()
  const [status, setStatus] = useState('')
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
