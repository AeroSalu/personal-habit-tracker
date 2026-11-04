import type { CategoryShare } from '../../lib/analytics'
import { formatMinutes } from '../../lib/profile'
import styles from './Charts.module.css'

const NAMES: Record<CategoryShare['id'], string> = {
  study: 'Study',
  work: 'Work',
  fitness: 'Fitness',
  personal: 'Personal',
  none: 'No task linked',
}

/** Focus time split by category: one stacked bar, with the legend carrying every value. */
export function ShareBar({ shares }: { shares: CategoryShare[] }) {
  const total = shares.reduce((sum, s) => sum + s.minutes, 0)
  if (!total) return <p className={styles.emptyText}>No focus time in this period.</p>

  return (
    <figure className={styles.figure}>
      <div className={styles.share} role="img" aria-label={shares.map((s) => `${NAMES[s.id]} ${formatMinutes(s.minutes)}`).join(', ')}>
        {shares.map((s) => (
          <span
            key={s.id}
            className={styles.segment}
            style={{ flexGrow: s.minutes, background: `var(--cat-${s.id})` }}
            title={`${NAMES[s.id]}: ${formatMinutes(s.minutes)}`}
          />
        ))}
      </div>
      <ul className={styles.legend}>
        {shares.map((s) => (
          <li key={s.id}>
            <span className={styles.swatch} style={{ background: `var(--cat-${s.id})` }} aria-hidden="true" />
            <span>{NAMES[s.id]}</span>
            <strong className="num">{formatMinutes(s.minutes)}</strong>
            <span className={`${styles.legendPct} num`}>{Math.round((s.minutes / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}
