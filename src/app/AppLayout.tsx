import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ChevronDown, CircleCheck, Ellipsis } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { BOTTOM_BAR, PRIMARY, SECONDARY, type NavItem } from './nav'
import styles from './AppLayout.module.css'

function SidebarItem({ item }: { item: NavItem }) {
  const Icon = item.icon
  if (!item.path) {
    return (
      <li>
        <span className={styles.item} aria-disabled="true">
          <Icon size={18} aria-hidden="true" />
          <span className={styles.label}>{item.label}</span>
          <span className={styles.soon}>Soon</span>
        </span>
      </li>
    )
  }
  return (
    <li>
      <NavLink
        to={item.path}
        end={item.path === '/'}
        className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
      >
        <Icon size={18} aria-hidden="true" />
        <span className={styles.label}>{item.label}</span>
      </NavLink>
    </li>
  )
}

export function AppLayout() {
  const { profile } = useSignedIn()
  const { pathname } = useLocation()
  const inMore = SECONDARY.some((item) => item.path && pathname.startsWith(item.path))
  const [showMore, setMoreOpen] = useState(inMore)
  // Opening a page that lives under More unfolds it; the user can still fold it again.
  const [wasInMore, setWasInMore] = useState(inMore)
  if (inMore !== wasInMore) {
    setWasInMore(inMore)
    if (inMore) setMoreOpen(true)
  }

  return (
    <div className={styles.frame}>
      <aside className={styles.sidebar}>
        <p className={styles.brand}>
          <CircleCheck size={18} aria-hidden="true" />
          CADENCE
        </p>
        <nav aria-label="Main">
          <ul>
            {PRIMARY.map((item) => (
              <SidebarItem key={item.label} item={item} />
            ))}
          </ul>
          <button
            type="button"
            className={`${styles.item} ${styles.moreToggle}`}
            aria-expanded={showMore}
            aria-controls="sidebar-more"
            onClick={() => setMoreOpen(!showMore)}
          >
            <Ellipsis size={18} aria-hidden="true" />
            <span className={styles.label}>More</span>
            <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
          </button>
          {showMore && (
            <ul id="sidebar-more">
              {SECONDARY.map((item) => (
                <SidebarItem key={item.label} item={item} />
              ))}
            </ul>
          )}
        </nav>
        <NavLink to="/profile" className={styles.me}>
          <span className={styles.avatar} aria-hidden="true">
            {profile.displayName.trim().charAt(0).toUpperCase()}
          </span>
          <span className={styles.label}>{profile.displayName}</span>
        </NavLink>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.bottomBar} aria-label="Main">
        {[...BOTTOM_BAR, { label: 'More', icon: Ellipsis, path: '/more' }].map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.label}
              to={item.path!}
              end={item.path === '/'}
              className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
