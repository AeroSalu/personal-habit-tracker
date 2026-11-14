import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './Dialog.module.css'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * A native modal dialog: a bottom sheet on phones, a centred panel on desktop. Escape, the
 * backdrop and the close button play the exit animation before calling `onClose`; a parent
 * that unmounts it directly (after saving, say) closes it at once.
 */
export function Dialog({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [closing, setClosing] = useState(false)

  const close = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) onClose()
    else setClosing(true)
  }

  useEffect(() => {
    if (!closing) return
    // The exit animation normally ends it; this covers a skipped animationend.
    const t = window.setTimeout(onClose, 500)
    return () => window.clearTimeout(t)
  }, [closing, onClose])

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${closing ? styles.closing : ''}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onClose()
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className={styles.body}>
        <header className={styles.header}>
          <h2>{title}</h2>
          <button type="button" className={styles.close} onClick={close} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
