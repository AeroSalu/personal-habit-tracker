import { Link } from 'react-router-dom'
import { BOTTOM_BAR, NAV_GROUPS } from './nav'
import styles from './MorePage.module.css'

const onBottomBar = new Set(BOTTOM_BAR.map((item) => item.path))

/** Phone-only list of every destination the bottom bar has no room for. */
export function MorePage() {
  return (
    <section className={styles.page}>
      <h1>More</h1>
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => !item.path || !onBottomBar.has(item.path))
        if (!items.length) return null
        return (
          <div key={group.title}>
            <p className={styles.groupTitle}>{group.title}</p>
            <ul className={styles.list}>
              {items.map((item) => {
                const Icon = item.icon
                const body = (
                  <>
                    <Icon size={18} aria-hidden="true" />
                    <span className={styles.label}>{item.label}</span>
                    {!item.path && <span className={styles.soon}>Soon</span>}
                  </>
                )
                return (
                  <li key={item.label}>
                    {item.path ? (
                      <Link to={item.path} className={styles.row}>
                        {body}
                      </Link>
                    ) : (
                      <span className={`${styles.row} ${styles.disabled}`}>{body}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
