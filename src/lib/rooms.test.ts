import { describe, expect, it } from 'vitest'
import { startFocus, type Plan } from './focus'
import { newSession, presenceOf, roomNameError, roomProgress, sessionRemaining, sortMembers, type RoomMember } from './rooms'

const T = Date.UTC(2026, 10, 8, 10, 0)
const iso = (ms: number) => new Date(ms).toISOString()
const member = (name: string, state: RoomMember['state'], beatAgoMs: number, minutes = 0): RoomMember => ({
  uid: name,
  displayName: name,
  username: name,
  state,
  heartbeatAt: iso(T - beatAgoMs),
  minutes,
})

describe('presence', () => {
  it('uses the reported state while the heartbeat is fresh', () => {
    expect(presenceOf(member('a', 'focusing', 30_000), T)).toBe('focusing')
    expect(presenceOf(member('a', 'break', 90_000), T)).toBe('break')
  })

  it('shows someone silent for over two heartbeats as away', () => {
    expect(presenceOf(member('a', 'focusing', 3 * 60_000), T)).toBe('away')
    expect(presenceOf({ state: 'idle', heartbeatAt: '' }, T)).toBe('away')
  })

  it('sorts focusing people first, away people last', () => {
    const sorted = sortMembers([member('Zed', 'idle', 0), member('Amy', 'focusing', 3 * 60_000), member('Bo', 'focusing', 0), member('Cy', 'break', 0)], T)
    expect(sorted.map((m) => m.displayName)).toEqual(['Bo', 'Cy', 'Zed', 'Amy'])
  })
})

describe('shared session', () => {
  it('counts down to the shared end and stops at zero', () => {
    const s = newSession(50, T)
    expect(sessionRemaining(s, T + 10 * 60_000)).toBe(40 * 60_000)
    expect(sessionRemaining(s, T + 60 * 60_000)).toBe(0)
    expect(sessionRemaining(null, T)).toBe(0)
  })

  it('lets someone join late and still finish at the same moment', () => {
    const s = newSession(50, T)
    const plan: Plan = { preset: 'custom', focusMinutes: 38, shortBreak: 10, longBreak: 20, strict: false, link: null }
    const joined = startFocus('u', plan, 1, T + 12 * 60_000, 'x', new Date(s.endsAt).getTime())
    expect(joined.endsAt).toBe(new Date(s.endsAt).getTime())
    expect(joined.startedAt).toBe(T + 12 * 60_000)
  })
})

describe('room goal', () => {
  it('adds up everyone’s minutes against the goal', () => {
    expect(roomProgress([{ minutes: 50 }, { minutes: 25 }], 120)).toEqual({ minutes: 75, goal: 120, share: 0.625, done: false })
    expect(roomProgress([{ minutes: 130 }], 120).done).toBe(true)
    expect(roomProgress([{ minutes: 10 }], 0)).toMatchObject({ share: 0, done: false })
  })

  it('validates room names', () => {
    expect(roomNameError('DSA Lock-in')).toBe('')
    expect(roomNameError(' ')).not.toBe('')
  })
})
