import { useEffect } from 'react'
import { Logo } from '../components/Logo'
import styles from './Splash.module.css'

/**
 * The loading screen: the animated mark over the page background. Once loading ends it
 * stays mounted while it fades away over the app, then calls `onGone`.
 */
export function Splash({ leaving = false, onGone }: { leaving?: boolean; onGone?: () => void }) {
  useEffect(() => {
    if (!leaving || !onGone) return
    // The fade normally ends it; this covers browsers that skip the transition event.
    const t = window.setTimeout(onGone, 700)
    return () => window.clearTimeout(t)
  }, [leaving, onGone])

  return (
    <div
      className={`${styles.splash} ${leaving ? styles.leaving : ''}`}
      role="status"
      aria-label="Loading"
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && leaving) onGone?.()
      }}
    >
      <Logo size={76} animated />
      <span className={styles.word}>Cadence</span>
    </div>
  )
}
