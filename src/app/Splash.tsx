import { Lock } from 'lucide-react'
import styles from './Splash.module.css'

export function Splash() {
  return (
    <div className={styles.splash} role="status" aria-label="Loading">
      <Lock size={28} aria-hidden="true" />
    </div>
  )
}
