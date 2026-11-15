import { useEffect, useState, type ReactNode } from 'react'
import styles from './Ring.module.css'

export type RingValue = {
  /** 0–1; anything above 1 shows as full. */
  value: number
  /** A ring colour token, such as var(--ring-focus). */
  color: string
  /** Read out with the value, so a ring never relies on colour alone. */
  label: string
}

/**
 * Progress rings after Apple Fitness: one ring, or several nested, each on a faint track of
 * its own colour. They sweep in from empty on first show and ease to new values after.
 * The centre can hold anything, such as a number.
 */
export function Ring({ rings, size = 120, stroke = 10, gap = 3, children }: { rings: RingValue[]; size?: number; stroke?: number; gap?: number; children?: ReactNode }) {
  // Start empty for one frame so the first show sweeps in.
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const c = size / 2
  const description = rings.map((r) => `${r.label} ${Math.round(Math.min(1, Math.max(0, r.value)) * 100)}%`).join(', ')

  return (
    <div className={styles.ring} style={{ width: size }} role="img" aria-label={description}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {rings.map((r, i) => {
          const radius = c - stroke / 2 - i * (stroke + gap)
          const share = shown ? Math.min(1, Math.max(0, r.value)) : 0
          return (
            <g key={r.label} transform={`rotate(-90 ${c} ${c})`}>
              <circle className={styles.track} cx={c} cy={c} r={radius} strokeWidth={stroke} style={{ stroke: r.color }} />
              <circle
                className={styles.value}
                cx={c}
                cy={c}
                r={radius}
                strokeWidth={stroke}
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset={1 - share}
                style={{ stroke: r.color, opacity: share > 0 ? 1 : 0 }}
              />
            </g>
          )
        })}
      </svg>
      {children && <div className={styles.center}>{children}</div>}
    </div>
  )
}
