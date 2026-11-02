import { NavLink, Outlet } from 'react-router-dom'
import { Ellipsis, Lock } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { BOTTOM_BAR, NAV_GROUPS, type NavItem } from './nav'
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

  return (
    <div className={styles.frame}>
      <aside className={styles.sidebar}>
        <p className={styles.brand}>
          <Lock size={18} aria-hidden="true" />
          LOCKIN
        </p>
        <nav aria-label="Main">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className={styles.group}>
              <p className={styles.groupTitle}>{group.title}</p>
              <ul>
                {group.items.map((item) => (
                  <SidebarItem key={item.label} item={item} />
                ))}
              </ul>
            </div>
          ))}
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
