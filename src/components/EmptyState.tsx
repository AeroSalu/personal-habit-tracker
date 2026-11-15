import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import styles from './EmptyState.module.css'

/**
 * What a screen or section shows when there's nothing in it yet: a quiet icon, one line that
 * says what belongs here, a sentence on how to start, and at most one action. `compact` sits
 * inside a card; the full one stands alone on a page.
 */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  compact = false,
}: {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={`${styles.empty} ${compact ? styles.compact : ''}`}>
      <span className={styles.icon} aria-hidden="true">
        <Icon size={compact ? 20 : 24} />
      </span>
      <p className={styles.title}>{title}</p>
      {children && <p className={styles.text}>{children}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
