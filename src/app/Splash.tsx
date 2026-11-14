import { CircleCheck } from 'lucide-react'
import styles from './Splash.module.css'

export function Splash() {
  return (
    <div className={styles.splash} role="status" aria-label="Loading">
      <CircleCheck size={28} aria-hidden="true" />
    </div>
  )
}
