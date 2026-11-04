import { useEffect } from 'react'
import { useSignedIn } from '../auth/authContext'
import { postActivity } from '../data/activity'
import { activityIds } from '../lib/friends'
import { useGame } from './useGame'

/**
 * Posts earned badges and new levels to friends' feeds when "Share achievements" is on.
 * Each has a fixed ID, so posting from two devices or twice is harmless; the per-device list
 * of what's been posted only avoids repeat writes.
 */
export function AchievementPoster() {
  const { user, profile } = useSignedIn()
  const { loaded, badges, level } = useGame()
  const on = profile.shareAchievements && Boolean(profile.username)
  const earned = badges.filter((b) => b.earnedOn)
  const earnedKey = earned.map((b) => b.id).join()

  useEffect(() => {
    if (!loaded || !on) return
    const key = `lockin.posted.${user.uid}`
    let posted: string[] = []
    try {
      posted = JSON.parse(localStorage.getItem(key) ?? '[]') as string[]
    } catch {
      posted = []
    }
    const add: string[] = []
    for (const b of earned) {
      const id = activityIds.badge(user.uid, b.id)
      if (posted.includes(id)) continue
      postActivity(id, { uid: user.uid, kind: 'badge', title: b.name, at: `${b.earnedOn}T12:00:00.000Z` }).catch(() => {})
      add.push(id)
    }
    if (level.level >= 2) {
      const id = activityIds.level(user.uid, level.level)
      if (!posted.includes(id)) {
        postActivity(id, { uid: user.uid, kind: 'level', title: `Level ${level.level}`, at: new Date().toISOString() }).catch(() => {})
        add.push(id)
      }
    }
    if (add.length) {
      try {
        localStorage.setItem(key, JSON.stringify([...posted, ...add]))
      } catch {
        // Without storage, the same items may be written again; their fixed IDs keep that harmless.
      }
    }
    // Runs when what's earned changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, on, earnedKey, level.level, user.uid])

  return null
}
