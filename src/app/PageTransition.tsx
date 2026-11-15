import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType, useOutlet } from 'react-router-dom'
import { AnimatePresence, type Variants } from 'motion/react'
import * as m from 'motion/react-m'
import { dur, ease } from '../design/motion'

/** How deep a path is: "/" and "/tasks" are both tabs (1); "/friends/abc" is a detail page (2). */
const depthOf = (path: string) => Math.max(1, path.split('/').filter(Boolean).length)

/**
 * Screens change with intent: tabs crossfade with a hint of rise; going into a detail page
 * pushes in from the right, and coming back slides the other way. The old screen leaves while
 * the new one arrives (popLayout), so nothing waits on an animation.
 */
const variants: Variants = {
  enter: (dir: number) => (dir === 0 ? { opacity: 0, y: 6 } : { opacity: 0, x: dir * 28 }),
  center: (dir: number) => ({
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: dir === 0 ? dur.standard : dur.emphasized, ease: ease.enter },
  }),
  exit: (dir: number) => ({
    opacity: 0,
    x: dir === 0 ? 0 : dir * -20,
    transition: { duration: dur.quick, ease: ease.exit },
  }),
}

/** Remembers where each screen was scrolled, so Back returns you to the same spot. */
const scrollByKey = new Map<string, number>()

export function PageTransition() {
  const location = useLocation()
  const navType = useNavigationType()
  const outlet = useOutlet()
  const depth = depthOf(location.pathname)
  const last = useRef(depth)
  const dir = depth > last.current ? 1 : depth < last.current ? -1 : 0

  useLayoutEffect(() => {
    last.current = depth
  }, [depth])

  // New screens start at the top; Back and Forward return to where you were.
  useLayoutEffect(() => {
    const key = location.key
    window.scrollTo(0, navType === 'POP' ? (scrollByKey.get(key) ?? 0) : 0)
    return () => {
      scrollByKey.set(key, window.scrollY)
    }
  }, [location.key, navType])

  return (
    <AnimatePresence mode="popLayout" initial={false} custom={dir}>
      <m.div key={location.pathname} custom={dir} variants={variants} initial="enter" animate="center" exit="exit">
        {outlet}
      </m.div>
    </AnimatePresence>
  )
}
