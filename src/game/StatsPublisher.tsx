import { useEffect, useMemo, useRef } from 'react'
import { useSignedIn } from '../auth/authContext'
import { publishMember, useMyGroups } from '../data/groups'
import { publishProfile, publishStats } from '../data/social'
import { lockInStreak } from '../lib/dashboard'
import { publicStats } from '../lib/social'
import { useFocus } from '../focus/focusContext'
import { useGame } from './useGame'

const MIN_GAP_MS = 30_000

/**
 * Keeps the public summary friends see up to date, at most once every 30 seconds. Nothing
 * is published until a username is chosen.
 */
export function StatsPublisher() {
  const { user, profile } = useSignedIn()
  const { loaded, ix, xp, level, badges, today } = useGame()
  const focus = useFocus()
  const running = focus.state?.phase === 'focus' && focus.state.pausedAt === null ? focus.state.endsAt : null

  const stats = useMemo(
    () =>
      publicStats(ix, {
        level: level.level,
        xp: xp.total,
        badges: badges.filter((b) => b.earnedOn).map((b) => b.id),
        streak: lockInStreak(new Set(ix.lockIn), today).current,
        focusingUntil: running,
      }),
    [ix, level.level, xp.total, badges, today, running],
  )
  const key = JSON.stringify(stats)
  const cardKey = `${profile.username}|${profile.displayName}|${level.level}`

  const last = useRef({ key: '', card: '', at: 0 })
  // Each group I'm in keeps its own copy of my weekly numbers, so members can rank everyone.
  const groups = useMyGroups(user.uid)
  const groupsKey = groups.data.map((g) => g.id).join()

  useEffect(() => {
    if (!loaded || !groups.loaded || !profile.username) return
    const allKey = `${key}#${groupsKey}`
    if (last.current.key === allKey && last.current.card === cardKey) return
    // Starting or ending a focus session, or joining a group, goes out straight away.
    const urgent =
      JSON.parse(last.current.key.split('#')[0] || '{}').focusing?.until !== stats.focusing?.until ||
      last.current.key.split('#')[1] !== groupsKey
    const wait = urgent ? 0 : Math.max(0, last.current.at + MIN_GAP_MS - Date.now())
    const timer = setTimeout(() => {
      publishStats(user.uid, stats).catch(() => {})
      const me = { uid: user.uid, username: profile.username, displayName: profile.displayName }
      for (const g of groups.data) publishMember(me, g, stats).catch(() => {})
      if (last.current.card !== cardKey) {
        publishProfile(user.uid, { username: profile.username, displayName: profile.displayName, level: level.level }).catch(() => {})
      }
      last.current = { key: allKey, card: cardKey, at: Date.now() }
    }, wait)
    return () => clearTimeout(timer)
  }, [loaded, groups.loaded, groups.data, groupsKey, key, cardKey, stats, user.uid, profile.username, profile.displayName, level.level])

  return null
}
