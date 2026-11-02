import { useEffect, useState } from 'react'

/**
 * The current time, refreshed every minute and whenever the app comes back to the
 * foreground, so "today" and overdue reminders roll over without a reload.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = setInterval(refresh, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return now
}
