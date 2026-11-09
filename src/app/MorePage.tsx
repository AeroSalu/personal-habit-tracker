import { Link } from 'react-router-dom'
import { BOTTOM_BAR, PRIMARY, SECONDARY, SETTINGS } from './nav'
import styles from './MorePage.module.css'

const onBottomBar = new Set(BOTTOM_BAR.map((item) => item.path))
const ITEMS = [...PRIMARY.filter((item) => !onBottomBar.has(item.path)), ...SECONDARY, SETTINGS]

/** Phone-only list of every destination the bottom bar has no room for. */
export function MorePage() {
  return (
    <section className={styles.page}>
      <h1>More</h1>
      <ul className={styles.list}>
        {ITEMS.map((item) => {
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
    </section>
  )
}
