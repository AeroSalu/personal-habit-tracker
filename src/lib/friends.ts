// Friend relationships and the activity feed, as pure rules. Document IDs here must match
// the ones firestore.rules expects.

export type FriendRequest = {
  id: string
  from: string
  to: string
  fromUsername: string
  fromName: string
  toUsername: string
  status: 'pending' | 'declined'
  createdAt: string
}

export type Friendship = { id: string; members: [string, string]; since: string }

export type ActivityKind = 'task' | 'habit' | 'badge' | 'level'
export type Activity = { id: string; uid: string; kind: ActivityKind; title: string; at: string }

/** Friendships are stored once per pair, under both IDs in sorted order. */
export function pairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`
}

export function requestId(from: string, to: string): string {
  return `${from}_${to}`
}

export function friendOf(f: Pick<Friendship, 'members'>, me: string): string {
  return f.members[0] === me ? f.members[1] : f.members[0]
}

export type Relation = 'self' | 'friend' | 'incoming' | 'outgoing' | 'declined' | 'none'

/** How `them` relates to `me`, for the button shown next to a search result. */
export function relation(
  me: string,
  them: string,
  state: { friends: string[]; incoming: FriendRequest[]; outgoing: FriendRequest[] },
): Relation {
  if (me === them) return 'self'
  if (state.friends.includes(them)) return 'friend'
  if (state.incoming.some((r) => r.from === them && r.status === 'pending')) return 'incoming'
  const sent = state.outgoing.find((r) => r.to === them)
  if (sent) return sent.status === 'declined' ? 'declined' : 'outgoing'
  return 'none'
}

/** Activity IDs are fixed per thing, so posting twice overwrites and undoing can delete it. */
export const activityIds = {
  task: (uid: string, taskId: string) => `${uid}_task_${taskId}`,
  habit: (uid: string, habitId: string, day: string) => `${uid}_habit_${habitId}_${day}`,
  badge: (uid: string, badgeId: string) => `${uid}_badge_${badgeId}`,
  level: (uid: string, level: number) => `${uid}_level_${level}`,
}

/** Newest first, without duplicates, capped. */
export function mergeFeed(lists: Activity[][], max = 50): Activity[] {
  const seen = new Map<string, Activity>()
  for (const list of lists) for (const a of list) seen.set(a.id, a)
  return [...seen.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, max)
}

export function activityVerb(a: Pick<Activity, 'kind'>): string {
  if (a.kind === 'task') return 'completed'
  if (a.kind === 'habit') return 'kept up'
  if (a.kind === 'badge') return 'earned'
  return 'reached'
}

/** "just now", "5m ago", "3h ago", "yesterday", "4d ago", or a date. */
export function timeAgo(iso: string, now: number): string {
  const ms = now - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ---- Cheers ----

export const CHEERS = ['👏', '🔥', '💪', '🎉'] as const
export type CheerEmoji = (typeof CHEERS)[number]
export type Cheer = { id: string; activityId: string; owner: string; uid: string; emoji: CheerEmoji; at: string }

/** One person's cheer on one item has a fixed ID, so cheering again replaces it. */
export const cheerId = (activityId: string, uid: string) => `${activityId}_${uid}`

/** Per item: how many of each emoji (in the fixed order, used ones only), who gave them, and mine. */
export function cheerSummary(cheers: Cheer[], me: string) {
  const byItem = new Map<string, { counts: { emoji: CheerEmoji; count: number }[]; from: string[]; mine: CheerEmoji | null }>()
  const grouped = new Map<string, Cheer[]>()
  for (const c of cheers) grouped.set(c.activityId, [...(grouped.get(c.activityId) ?? []), c])
  for (const [id, list] of grouped) {
    const sorted = [...list].sort((a, b) => a.at.localeCompare(b.at))
    byItem.set(id, {
      counts: CHEERS.map((emoji) => ({ emoji, count: list.filter((c) => c.emoji === emoji).length })).filter((c) => c.count),
      from: sorted.map((c) => c.uid),
      mine: list.find((c) => c.uid === me)?.emoji ?? null,
    })
  }
  return byItem
}

/** "Ben", "Ben and Cat", "Ben, Cat and 2 others" */
export function namesLine(names: string[]): string {
  if (names.length <= 2) return names.join(' and ')
  return `${names[0]}, ${names[1]} and ${names.length - 2} other${names.length === 3 ? '' : 's'}`
}
