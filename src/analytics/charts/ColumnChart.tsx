import { useState } from 'react'
import type { Point } from '../../lib/analytics'
import { minuteTicks, tickLabel } from '../../lib/chartScale'
import { parseDay } from '../../lib/dates'
import { formatMinutes } from '../../lib/profile'
import { useWidth } from './useWidth'
import styles from './Charts.module.css'

type Props = {
  points: Point[]
  /** Names the chart for screen readers and the data table. */
  label: string
  /** The key drawn at full strength, such as today; the rest are softened. */
  current?: string
  /** Show every nth x label when columns are dense. */
  labelEvery?: number
  height?: number
}

const PAD = { top: 10, right: 4, bottom: 22, left: 36 }
const MAX_BAR = 24
const RADIUS = 4

/** Day keys read as "Mon, Nov 2"; other keys, such as time blocks, are already words. */
function name(key: string) {
  return /^\d{4}-\d\d-\d\d$/.test(key)
    ? parseDay(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : key
}

/** A rounded data-end on top and a square foot on the baseline. */
function columnPath(x: number, y: number, w: number, base: number) {
  const r = Math.min(RADIUS, w / 2, base - y)
  if (r <= 0) return ''
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`
}

/** One series of minutes as columns from a shared baseline, with a tooltip per column. */
export function ColumnChart({ points, label, current, labelEvery = 1, height = 180 }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(0, ...points.map((p) => p.minutes))
  const ticks = minuteTicks(max)
  const top = ticks[ticks.length - 1]
  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = height - PAD.top - PAD.bottom
  const slot = points.length ? plotW / points.length : 0
  const barW = Math.max(2, Math.min(MAX_BAR, slot - 4))
  const base = PAD.top + plotH
  const y = (m: number) => PAD.top + plotH - (m / top) * plotH
  const shown = hover === null ? null : points[hover]

  return (
    <figure className={styles.figure}>
      <div ref={ref} className={styles.plot} onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={`${label}. Peak ${formatMinutes(max)}.`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className={t ? styles.grid : styles.axis} />
                <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className={styles.tick}>
                  {tickLabel(t)}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const x = PAD.left + i * slot + (slot - barW) / 2
              const softened = current !== undefined && p.key !== current
              return (
                <g key={p.key}>
                  {p.minutes > 0 && (
                    <path
                      d={columnPath(x, y(p.minutes), barW, base)}
                      className={`${styles.bar} ${softened ? styles.soft : ''} ${hover === i ? styles.lifted : ''}`}
                    />
                  )}
                  {i % labelEvery === 0 && (
                    <text x={x + barW / 2} y={height - 6} textAnchor="middle" className={styles.tick}>
                      {p.label}
                    </text>
                  )}
                  {/* The hit area is the whole slot, far bigger than the painted bar. */}
                  <rect
                    x={PAD.left + i * slot}
                    y={PAD.top}
                    width={slot}
                    height={plotH}
                    className={styles.hit}
                    tabIndex={0}
                    aria-label={`${name(p.key)}: ${formatMinutes(p.minutes)}`}
                    onPointerEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                  />
                </g>
              )
            })}
          </svg>
        )}
        {shown && hover !== null && (
          <div
            className={styles.tooltip}
            style={{
              left: Math.min(Math.max(PAD.left + (hover + 0.5) * slot, 60), width - 60),
              top: Math.max(0, y(shown.minutes) - 8),
            }}
          >
            <strong>{formatMinutes(shown.minutes)}</strong>
            <span>{name(shown.key)}</span>
          </div>
        )}
        {max === 0 && <p className={styles.empty}>No focus time in this period.</p>}
      </div>
      <details className={styles.table}>
        <summary>Show data</summary>
        <table>
          <caption className={styles.srOnly}>{label}</caption>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Focus</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.key}>
                <td>{name(p.key)}</td>
                <td className="num">{formatMinutes(p.minutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
