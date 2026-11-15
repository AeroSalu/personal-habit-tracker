import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { waitForPendingWrites } from 'firebase/firestore'
import { db } from '../firebase'
import styles from './OfflineBar.module.css'

type State = 'online' | 'offline' | 'syncing' | 'synced'

/**
 * A slim note when the connection drops: everything still works and saves on this device.
 * Back online, it shows "Syncing…" until Firestore has sent what was saved, then fades away.
 */
export function OfflineBar() {
  const [state, setState] = useState<State>(() => (navigator.onLine ? 'online' : 'offline'))

  useEffect(() => {
    let alive = true
    let timer: number | undefined
    const offline = () => setState('offline')
    const online = () => {
      setState('syncing')
      waitForPendingWrites(db)
        .then(() => {
          if (!alive) return
          setState('synced')
          timer = window.setTimeout(() => alive && setState('online'), 2000)
        })
        .catch(() => alive && setState('online'))
    }
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => {
      alive = false
      window.clearTimeout(timer)
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
    }
  }, [])

  if (state === 'online') return null
  return (
    <div className={`${styles.bar} ${state === 'synced' ? styles.leaving : ''}`} role="status">
      {state === 'offline' ? (
        <>
          <CloudOff size={15} aria-hidden="true" /> Offline · changes are saved and will sync
        </>
      ) : (
        <>
          <RefreshCw size={15} className={state === 'syncing' ? styles.spin : ''} aria-hidden="true" />
          {state === 'syncing' ? 'Back online · syncing…' : 'All changes synced'}
        </>
      )}
    </div>
  )
}
