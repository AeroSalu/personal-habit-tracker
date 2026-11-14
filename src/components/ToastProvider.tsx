import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ToastContext } from './toast'
import styles from './Toast.module.css'

/** How long a message stays, and how long its exit fade takes (matches --dur-2). */
const SHOW_MS = 4000
const LEAVE_MS = 260

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [leaving, setLeaving] = useState(false)
  // A counter so a new message restarts the entrance even when the text is the same.
  const [serial, setSerial] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const show = useCallback((text: string) => {
    timers.current.forEach(clearTimeout)
    setMessage(text)
    setLeaving(false)
    setSerial((n) => n + 1)
    timers.current = [
      setTimeout(() => setLeaving(true), SHOW_MS),
      setTimeout(() => setMessage(''), SHOW_MS + LEAVE_MS),
    ]
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        key={serial}
        className={`${styles.toast} ${leaving ? styles.leaving : ''}`}
        role="status"
        aria-live="polite"
        hidden={!message}
      >
        {message}
      </div>
    </ToastContext.Provider>
  )
}
