import { useState, type CSSProperties } from 'react'
import styles from './Avatar.module.css'

/**
 * A person's photo in a circle, or the first letter of their name when there is none or it
 * fails to load. Decorative: the name always appears beside it, so it's hidden from screen
 * readers.
 */
export function Avatar({ name, photo = '', size = 36 }: { name: string; photo?: string; size?: number }) {
  // Remember which photo failed, so a new one gets a fresh try.
  const [failed, setFailed] = useState('')
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const show = photo && failed !== photo

  return (
    <span className={styles.avatar} style={{ '--size': `${size}px` } as CSSProperties} aria-hidden="true">
      {show ? (
        <img src={photo} alt="" referrerPolicy="no-referrer" draggable={false} onError={() => setFailed(photo)} />
      ) : (
        initial
      )}
    </span>
  )
}
