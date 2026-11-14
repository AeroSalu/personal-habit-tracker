import { useEffect, useState, type FormEvent } from 'react'
import {
  authMessage,
  redirectError,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from './authActions'
import ui from '../components/ui.module.css'
import { Logo } from '../components/Logo'
import styles from './AuthPage.module.css'

type Mode = 'signin' | 'signup' | 'reset'

const COPY: Record<Mode, { heading: string; button: string }> = {
  signin: { heading: 'Welcome back', button: 'Sign in' },
  signup: { heading: 'Create your account', button: 'Create account' },
  reset: { heading: 'Reset your password', button: 'Send reset email' },
}

const LOOP = ['Plan', 'Focus', 'Track', 'Improve']

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  )
}

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    redirectError.then((message) => {
      if (message) setError(message)
    })
  }, [])

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const address = email.trim()
    if (!address) {
      setError('Enter your email address.')
      return
    }
    if (mode === 'reset') {
      run(async () => {
        await resetPassword(address)
        setMode('signin')
        setNotice('Reset email sent. Check your inbox, then sign in with your new password.')
      })
    } else if (mode === 'signup') {
      run(() => signUpWithEmail(address, password))
    } else {
      run(() => signInWithEmail(address, password))
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <p className={styles.brand}>
          <Logo size={44} animated />
          CADENCE
        </p>
        <h1 className={styles.tagline}>
          Stop planning.
          <br />
          <span>Start executing.</span>
        </h1>
        <ol className={styles.loop} aria-label="How Cadence works">
          {LOOP.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className={`${ui.card} ${styles.panel}`}>
        <h2>{COPY[mode].heading}</h2>

        {mode !== 'reset' && (
          <>
            <button
              type="button"
              className={`${ui.button} ${ui.block}`}
              disabled={busy}
              onClick={() => run(signInWithGoogle)}
            >
              <GoogleMark />
              Continue with Google
            </button>
            <p className={styles.or}>
              <span>or</span>
            </p>
          </>
        )}

        <form className={styles.form} onSubmit={submit} noValidate>
          <label className={ui.field}>
            <span className={ui.label}>Email</span>
            <input
              id="auth-email"
              className={ui.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode !== 'reset' && (
            <label className={ui.field}>
              <span className={ui.label}>Password</span>
              <input
                id="auth-password"
                className={ui.input}
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          {notice && <p className={styles.notice}>{notice}</p>}
          <p className={ui.error} role="alert">
            {error}
          </p>
          <button type="submit" className={`${ui.button} ${ui.primary} ${ui.block}`} disabled={busy}>
            {COPY[mode].button}
          </button>
        </form>

        <div className={styles.links}>
          {mode === 'signin' ? (
            <>
              <button type="button" className={ui.link} onClick={() => switchMode('signup')}>
                Create an account
              </button>
              <button type="button" className={ui.link} onClick={() => switchMode('reset')}>
                Forgot password?
              </button>
            </>
          ) : (
            <button type="button" className={ui.link} onClick={() => switchMode('signin')}>
              Back to sign in
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
