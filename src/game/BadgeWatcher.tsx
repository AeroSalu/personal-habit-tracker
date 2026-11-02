import { useEffect } from 'react'
import { useSignedIn } from '../auth/authContext'
import { useToast } from '../components/toast'
import { useGame } from './useGame'

/**
 * Announces newly earned badges once per device. Only the IDs already announced are kept,
 * in localStorage; the badges themselves are always worked out from the records.
 */
export function BadgeWatcher() {
  const { user } = useSignedIn()
  const { loaded, badges } = useGame()
  const toast = useToast()
  const earned = badges.filter((b) => b.earnedOn)
  const earnedKey = earned.map((b) => b.id).join()

  useEffect(() => {
    if (!loaded) return
    const key = `lockin.seenBadges.${user.uid}`
    let seen: string[] | null = null
    try {
      seen = JSON.parse(localStorage.getItem(key) ?? 'null') as string[] | null
    } catch {
      return
    }
    const ids = earnedKey ? earnedKey.split(',') : []
    // First visit on this device: remember what's already earned without announcing it.
    if (seen) {
      const fresh = earned.filter((b) => !seen.includes(b.id))
      if (fresh.length === 1) toast(`Badge unlocked: ${fresh[0].name}`)
      else if (fresh.length > 1) toast(`${fresh.length} badges unlocked, including ${fresh[0].name}`)
    }
    try {
      localStorage.setItem(key, JSON.stringify([...new Set([...(seen ?? []), ...ids])]))
    } catch {
      // Without storage a badge may be announced again next visit.
    }
    // Runs when the set of earned badges changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, earnedKey, user.uid])

  return null
}
