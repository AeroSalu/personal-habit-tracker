import { useState } from 'react'
import { parseDay, WEEK } from '../../lib/dates'
import { formatMinutes } from '../../lib/profile'
import styles from './Charts.module.css'

type Cell = { key: string; minutes: number; lockedIn: boolean }

/** Darkest to brightest: nothing, locked in without focus, then by focus minutes. */
function level(c: Cell) {
  if (!c.lockedIn && !c.minutes) return 0
  if (c.minutes < 15) return 1
  if (c.minutes < 45) return 2
  if (c.minutes < 90) return 3
  return 4
}

function describe(c: Cell) {
  const date = parseDay(c.key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (!c.lockedIn && !c.minutes) return `${date}: nothing recorded`
  return `${date}: ${c.minutes ? `${formatMinutes(c.minutes)} focus` : 'locked in, no focus session'}`
}

/** Lock-in days by week, Monday at the top, with one tooltip shared by all cells. */
export function Heatmap({ cells }: { cells: Cell[] }) {
  const [hover, setHover] = useState<{ text: string; x: number; y: number } | null>(null)
  const lockedIn = cells.filter((c) => c.lockedIn).length

  return (
    <figure className={styles.figure}>
      <div className={styles.heatWrap} onPointerLeave={() => setHover(null)}>
        <div className={styles.heatDays} aria-hidden="true">
          {WEEK.map((w, i) => (
            <span key={w.day}>{i % 2 === 0 ? w.short : ''}</span>
          ))}
        </div>
        <div
          className={styles.heat}
          role="img"
          aria-label={`Locked in on ${lockedIn} of the last ${cells.length} days`}
          onPointerOver={(e) => {
            const el = e.target as HTMLElement
            const key = el.dataset.key
            const cell = key ? cells.find((c) => c.key === key) : undefined
            if (!cell) return
            const box = el.getBoundingClientRect()
            const parent = (e.currentTarget.parentElement ?? e.currentTarget).getBoundingClientRect()
            setHover({ text: describe(cell), x: box.left - parent.left + box.width / 2, y: box.top - parent.top })
          }}
        >
          {cells.map((c) => (
            <span key={c.key} data-key={c.key} className={styles[`h${level(c)}`]} />
          ))}
        </div>
        {hover && (
          <div className={styles.tooltip} style={{ left: hover.x, top: hover.y - 4 }}>
            <span>{hover.text}</span>
          </div>
        )}
      </div>
      <figcaption className={styles.caption}>
        <span className="num">
          Locked in on {lockedIn} of the last {cells.length} days
        </span>
        <span className={styles.scale} aria-hidden="true">
          Less <i className={styles.h0} />
          <i className={styles.h1} />
          <i className={styles.h2} />
          <i className={styles.h3} />
          <i className={styles.h4} /> More focus
        </span>
      </figcaption>
    </figure>
  )
}
