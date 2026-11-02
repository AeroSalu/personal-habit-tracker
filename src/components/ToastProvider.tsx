import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ToastContext } from './toast'
import styles from './Toast.module.css'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback((text: string) => {
    clearTimeout(timer.current)
    setMessage(text)
    timer.current = setTimeout(() => setMessage(''), 4000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.toast} role="status" aria-live="polite" hidden={!message}>
        {message}
      </div>
    </ToastContext.Provider>
  )
}
