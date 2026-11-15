import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A short-lived "it worked" flag for a button that stays on screen after saving: `flash()`
 * turns it on, and it turns itself off after a moment. Pair it with `data-saved` on a
 * `ui.button`, whose label then reads "Saved" with a tick.
 */
export function useFlash(ms = 1600): [boolean, () => void] {
  const [on, setOn] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const flash = useCallback(() => {
    window.clearTimeout(timer.current)
    setOn(true)
    timer.current = window.setTimeout(() => setOn(false), ms)
  }, [ms])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return [on, flash]
}
