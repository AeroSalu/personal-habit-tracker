import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ChevronDown, Ellipsis, Search } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { Avatar } from '../components/Avatar'
import { Logo } from '../components/Logo'
import { CommandPalette } from './CommandPalette'
import { BOTTOM_BAR, PRIMARY, SECONDARY, type NavItem } from './nav'
import { ShortcutsHelp } from './ShortcutsHelp'
import { useShortcuts } from './useShortcuts'
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
  const [overlay, setOverlay] = useState<'palette' | 'help' | null>(null)
  const open = useMemo(() => ({ palette: () => setOverlay('palette'), help: () => setOverlay('help') }), [])
  useShortcuts(open)
  // Opening a page that lives under More unfolds it; the user can still fold it again.
  const [wasInMore, setWasInMore] = useState(inMore)
  if (inMore !== wasInMore) {
    setWasInMore(inMore)
    if (inMore) setMoreOpen(true)
  }

  // One highlight that slides to the active item, instead of each item lighting up on its own.
  const navRef = useRef<HTMLElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const nav = navRef.current
    const pill = pillRef.current
    if (!nav || !pill) return
    const active = nav.querySelector<HTMLElement>('a[aria-current="page"]')
    if (!active || active.closest('[inert]')) {
      pill.style.opacity = '0'
      return
    }
    // Appearing from hidden jumps into place; moving between items glides.
    const wasHidden = pill.style.opacity !== '1'
    if (wasHidden) pill.style.transition = 'none'
    pill.style.transform = `translateY(${active.offsetTop}px)`
    pill.style.height = `${active.offsetHeight}px`
    if (wasHidden) {
      void pill.offsetHeight
      pill.style.transition = ''
    }
    pill.style.opacity = '1'
  }, [pathname, showMore])

  return (
    <div className={styles.frame}>
      <aside className={styles.sidebar}>
        <p className={styles.brand}>
          <Logo size={22} />
          CADENCE
        </p>
        <button type="button" className={styles.searchButton} onClick={open.palette}>
          <Search size={16} aria-hidden="true" />
          <span className={styles.label}>Search or add</span>
          <kbd className={styles.kbd}>{/Mac/.test(navigator.platform) ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <nav aria-label="Main" className={styles.nav} ref={navRef}>
          <span className={styles.pill} ref={pillRef} aria-hidden="true" />
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
          {/* Always rendered so it can unfold smoothly; inert while folded. */}
          <div className={`${styles.fold} ${showMore ? styles.open : ''}`} inert={!showMore}>
            <ul id="sidebar-more">
              {SECONDARY.map((item) => (
                <SidebarItem key={item.label} item={item} />
              ))}
            </ul>
          </div>
        </nav>
        <NavLink to="/profile" className={styles.me}>
          <Avatar name={profile.displayName} photo={profile.photo} size={30} />
          <span className={styles.label}>{profile.displayName}</span>
        </NavLink>
      </aside>

      <main className={styles.main}>
        {/* Keyed by path so each screen fades and rises in as you move between them. */}
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
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
      {overlay === 'palette' && <CommandPalette onClose={() => setOverlay(null)} onShortcuts={open.help} />}
      {overlay === 'help' && <ShortcutsHelp onClose={() => setOverlay(null)} />}
    </div>
  )
}
