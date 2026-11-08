// Focus rooms: who's here and what they're doing, the shared session timer, and the room's
// goal. Presence is a heartbeat, so anyone silent for a while is shown as away.

export type RoomState = 'idle' | 'focusing' | 'break'
export type Presence = RoomState | 'away'

export type RoomSession = { startedAt: string; endsAt: string; minutes: number }

export type RoomMember = {
  uid: string
  displayName: string
  username: string
  state: RoomState
  heartbeatAt: string
  minutes: number
}

export const HEARTBEAT_MS = 60_000
/** Two missed heartbeats and someone counts as away. */
export const AWAY_AFTER_MS = 2 * HEARTBEAT_MS + 10_000
export const ROOM_SESSION_LENGTHS = [25, 50, 90]

export function presenceOf(m: Pick<RoomMember, 'state' | 'heartbeatAt'>, now: number): Presence {
  if (!m.heartbeatAt || now - new Date(m.heartbeatAt).getTime() > AWAY_AFTER_MS) return 'away'
  return m.state
}

export const PRESENCE_LABEL: Record<Presence, string> = {
  focusing: 'Focusing',
  break: 'On a break',
  idle: 'In the room',
  away: 'Away',
}

/** Milliseconds left in the shared session, or 0 when there's none or it has ended. */
export function sessionRemaining(session: RoomSession | null, now: number): number {
  if (!session) return 0
  return Math.max(0, new Date(session.endsAt).getTime() - now)
}

export function newSession(minutes: number, now: number): RoomSession {
  return {
    startedAt: new Date(now).toISOString(),
    endsAt: new Date(now + minutes * 60_000).toISOString(),
    minutes,
  }
}

/** Focusing first, then on a break, in the room, and away; by name within each. */
export function sortMembers(members: RoomMember[], now: number): RoomMember[] {
  const order: Record<Presence, number> = { focusing: 0, break: 1, idle: 2, away: 3 }
  return [...members].sort((a, b) => order[presenceOf(a, now)] - order[presenceOf(b, now)] || a.displayName.localeCompare(b.displayName))
}

export function roomProgress(members: Pick<RoomMember, 'minutes'>[], goalMinutes: number) {
  const minutes = members.reduce((sum, m) => sum + m.minutes, 0)
  return { minutes, goal: goalMinutes, share: goalMinutes ? Math.min(1, minutes / goalMinutes) : 0, done: goalMinutes > 0 && minutes >= goalMinutes }
}

export function roomNameError(name: string): string {
  if (!name.trim()) return 'Give the room a name.'
  if (name.trim().length > 40) return 'Keep the name under 40 characters.'
  return ''
}
