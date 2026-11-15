import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastAction } from './toast'
import styles from './Toast.module.css'

/** How long a message stays (longer with an action to reach), and its exit fade (--dur-2). */
const SHOW_MS = 4000
const ACTION_MS = 6000
const LEAVE_MS = 250

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [action, setAction] = useState<ToastAction | null>(null)
  const [leaving, setLeaving] = useState(false)
  // A counter so a new message restarts the entrance even when the text is the same.
  const [serial, setSerial] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const hide = useCallback(() => {
    timers.current.forEach(clearTimeout)
    setLeaving(true)
    timers.current = [setTimeout(() => setMessage(''), LEAVE_MS)]
  }, [])

  const show = useCallback((text: string, next?: ToastAction) => {
    timers.current.forEach(clearTimeout)
    setMessage(text)
    setAction(next ?? null)
    setLeaving(false)
    setSerial((n) => n + 1)
    const stay = next ? ACTION_MS : SHOW_MS
    timers.current = [setTimeout(() => setLeaving(true), stay), setTimeout(() => setMessage(''), stay + LEAVE_MS)]
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
        <span>{message}</span>
        {action && (
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              action.run()
              hide()
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </ToastContext.Provider>
  )
}
