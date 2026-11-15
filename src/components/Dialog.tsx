import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useDragControls, type PanInfo } from 'motion/react'
import * as m from 'motion/react-m'
import styles from './Dialog.module.css'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * A native modal dialog: a bottom sheet on phones, a centred panel on desktop. Escape, the
 * backdrop and the close button play the exit animation before calling `onClose`; a parent
 * that unmounts it directly (after saving, say) closes it at once. On phones the sheet can be
 * dragged down by its handle or header to close, like a native sheet.
 */
export function Dialog({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [closing, setClosing] = useState(false)
  const drag = useDragControls()

  const close = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) onClose()
    else setClosing(true)
  }

  // A firm pull or a quick flick closes it; anything less springs back.
  const dragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 700) close()
  }
  const startDrag = (e: PointerEvent) => {
    if (window.matchMedia('(max-width: 639px)').matches && !(e.target as HTMLElement).closest('button')) drag.start(e)
  }

  useEffect(() => {
    if (!closing) return
    // The exit animation normally ends it; this covers a skipped animationend.
    const t = window.setTimeout(onClose, 500)
    return () => window.clearTimeout(t)
  }, [closing, onClose])

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) {
      dialog.showModal()
      // showModal focuses the first control, the close button; a field can ask to go first.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
  }, [])

  return (
    <m.dialog
      ref={ref}
      drag="y"
      dragControls={drag}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.8 }}
      dragSnapToOrigin
      onDragEnd={dragEnd}
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
      <div className={styles.grabber} onPointerDown={startDrag} aria-hidden="true" />
      <div className={styles.body}>
        <header className={styles.header} onPointerDown={startDrag}>
          <h2>{title}</h2>
          <button type="button" className={styles.close} onClick={close} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </m.dialog>
  )
}
