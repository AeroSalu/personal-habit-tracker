import styles from './Skeleton.module.css'

/**
 * A quiet stand-in for a page while its data loads: a title and a few cards of lines, with a
 * slow shimmer (still under reduced motion). Hidden from screen readers; the page around it
 * says it's busy.
 */
export function PageSkeleton({ cards = 2, rows = 3 }: { cards?: number; rows?: number }) {
  return (
    <div className={styles.page} aria-hidden="true">
      <span className={`${styles.block} ${styles.title}`} />
      {Array.from({ length: cards }, (_, c) => (
        <div key={c} className={styles.card}>
          <span className={`${styles.block} ${styles.heading}`} />
          {Array.from({ length: rows }, (_, r) => (
            <span key={r} className={styles.row}>
              <span className={`${styles.block} ${styles.dot}`} />
              <span className={`${styles.block} ${styles.line}`} style={{ width: `${72 - ((r * 17 + c * 11) % 30)}%` }} />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
