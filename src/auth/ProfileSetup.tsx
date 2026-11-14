import { useState } from 'react'
import type { User } from 'firebase/auth'
import { createProfile } from '../data/profile'
import { signOut } from './authActions'
import { ProfileForm } from './ProfileForm'
import ui from '../components/ui.module.css'
import styles from './ProfileSetup.module.css'

export function ProfileSetup({ user }: { user: User }) {
  const [error, setError] = useState('')

  return (
    <div className={styles.page}>
      <section className={`${ui.card} ${styles.panel}`}>
        <p className={styles.step}>One last step</p>
        <h1>Set up your day</h1>
        <p className={styles.lead}>
          Your daily focus goal drives the progress ring on your dashboard. You can change it any time.
        </p>
        <ProfileForm
          initial={{ displayName: user.displayName ?? '', dailyFocusGoalMinutes: 120 }}
          submitLabel="Get started"
          onSubmit={(fields) =>
            createProfile(user.uid, fields).catch(() =>
              setError('Your profile could not be saved. Check your connection and try again.'),
            )
          }
        />
        {error && (
          <p className={ui.error} role="alert">
            {error}
          </p>
        )}
        <button type="button" className={ui.link} onClick={() => signOut()}>
          Use a different account
        </button>
      </section>
    </div>
  )
}
