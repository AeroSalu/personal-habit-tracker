import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './Dialog.module.css'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
}

/** A native modal dialog: a bottom sheet on phones, a centred panel on desktop. Escape closes it. */
export function Dialog({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.body}>
        <header className={styles.header}>
          <h2>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
