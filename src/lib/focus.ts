// Focus sessions as a pure state machine over timestamps, so it can be saved, restored after
// a reload, and tested with fake times. `now` is always passed in, never read here.

export const PRESETS = [
  { id: '25/5', focus: 25, short: 5, long: 15 },
  { id: '50/10', focus: 50, short: 10, long: 20 },
  { id: '90/15', focus: 90, short: 15, long: 30 },
] as const

export type PresetId = (typeof PRESETS)[number]['id'] | 'custom'

/** What the session is for: a task, a habit, or nothing in particular. */
export type FocusLink = { kind: 'task' | 'habit'; id: string; title: string } | null

export type Plan = {
  preset: PresetId
  focusMinutes: number
  shortBreak: number
  longBreak: number
  strict: boolean
  link: FocusLink
  /** Set when the session was joined from a focus room, so its minutes count toward the room's goal. */
  roomId?: string
}

export type Leave = { at: number; ms: number }

/** In strict mode, staying away longer than this ends the session. */
export const STRICT_GRACE_MS = 30_000

/** A long break is suggested after every this many sessions in a day. */
export const LONG_BREAK_EVERY = 4

type Base = { uid: string; plan: Plan; sessionNumber: number }

export type Running = Base & {
  phase: 'focus'
  sessionId: string
  startedAt: number
  endsAt: number
  pausedAt: number | null
  pausedMs: number
  leaves: Leave[]
  awaySince: number | null
}

export type Summary = Base & {
  phase: 'summary'
  sessionId: string
  startedAt: number
  endedAt: number
  minutes: number
  pausedMs: number
  outcome: 'completed' | 'stopped'
  /** Set when strict mode ended the session. */
  strictStop: boolean
  leaves: Leave[]
}

export type OnBreak = Base & { phase: 'break'; kind: 'short' | 'long'; minutes: number; endsAt: number }
export type BreakOver = Base & { phase: 'breakOver' }

export type FocusState = Running | Summary | OnBreak | BreakOver

const MINUTE = 60_000

/** `endsAt` lines the session up with a shared end time, as when joining a room session late. */
export function startFocus(uid: string, plan: Plan, sessionNumber: number, now: number, sessionId: string, endsAt?: number): Running {
  return {
    uid,
    plan,
    sessionNumber,
    phase: 'focus',
    sessionId,
    startedAt: now,
    endsAt: endsAt ?? now + plan.focusMinutes * MINUTE,
    pausedAt: null,
    pausedMs: 0,
    leaves: [],
    awaySince: null,
  }
}

export function remainingMs(state: FocusState, now: number): number {
  if (state.phase === 'focus') return Math.max(0, state.endsAt - (state.pausedAt ?? now))
  if (state.phase === 'break') return Math.max(0, state.endsAt - now)
  return 0
}

/** Time actually spent focusing up to `at`, leaving out pauses. */
export function focusedMs(state: Running, at: number): number {
  const pausedNow = state.pausedAt === null ? 0 : Math.max(0, at - state.pausedAt)
  return Math.max(0, at - state.startedAt - state.pausedMs - pausedNow)
}

function withLeave(state: Running, until: number): Leave[] {
  if (state.awaySince === null) return state.leaves
  return [...state.leaves, { at: state.awaySince, ms: Math.max(0, until - state.awaySince) }]
}

function finish(state: Running, endedAt: number, outcome: Summary['outcome'], strictStop = false): Summary {
  return {
    uid: state.uid,
    plan: state.plan,
    sessionNumber: state.sessionNumber,
    phase: 'summary',
    sessionId: state.sessionId,
    startedAt: state.startedAt,
    endedAt,
    minutes: Math.round(focusedMs(state, endedAt) / MINUTE),
    pausedMs: state.pausedMs + (state.pausedAt === null ? 0 : endedAt - state.pausedAt),
    outcome,
    strictStop,
    leaves: withLeave(state, endedAt),
  }
}

/**
 * Moves the clock forward: a focus session that reached its end completes, a strict session
 * left for too long stops at the moment it was left, and a finished break ends.
 */
export function advance(state: FocusState, now: number): FocusState {
  if (state.phase === 'focus') {
    if (state.pausedAt !== null) return state
    const end = Math.min(now, state.endsAt)
    if (state.plan.strict && state.awaySince !== null && end - state.awaySince > STRICT_GRACE_MS) {
      return finish(state, state.awaySince, 'stopped', true)
    }
    if (now >= state.endsAt) return finish(state, state.endsAt, 'completed')
    return state
  }
  if (state.phase === 'break' && now >= state.endsAt) {
    return { uid: state.uid, plan: state.plan, sessionNumber: state.sessionNumber, phase: 'breakOver' }
  }
  return state
}

export function pause(state: FocusState, now: number): FocusState {
  if (state.phase !== 'focus' || state.pausedAt !== null) return state
  return { ...state, pausedAt: now }
}

export function resume(state: FocusState, now: number): FocusState {
  if (state.phase !== 'focus' || state.pausedAt === null) return state
  const paused = now - state.pausedAt
  return { ...state, pausedAt: null, pausedMs: state.pausedMs + paused, endsAt: state.endsAt + paused }
}

/** The app went to the background. Paused sessions don't count leaving. */
export function leaveApp(state: FocusState, now: number): FocusState {
  if (state.phase !== 'focus' || state.pausedAt !== null || state.awaySince !== null) return state
  return { ...state, awaySince: now }
}

export function returnToApp(state: FocusState, now: number): FocusState {
  const next = advance(state, now)
  if (next.phase !== 'focus' || next.awaySince === null) return next
  return { ...next, leaves: withLeave(next, now), awaySince: null }
}

export function endEarly(state: FocusState, now: number): FocusState {
  if (state.phase !== 'focus') return state
  return finish(state, now, 'stopped')
}

export function suggestedBreak(state: Pick<Base, 'sessionNumber'>): 'short' | 'long' {
  return state.sessionNumber % LONG_BREAK_EVERY === 0 ? 'long' : 'short'
}

export function startBreak(state: FocusState, kind: 'short' | 'long', now: number): FocusState {
  if (state.phase !== 'summary') return state
  const minutes = kind === 'long' ? state.plan.longBreak : state.plan.shortBreak
  return {
    uid: state.uid,
    plan: state.plan,
    sessionNumber: state.sessionNumber,
    phase: 'break',
    kind,
    minutes,
    endsAt: now + minutes * MINUTE,
  }
}

export function nextSession(state: FocusState, now: number, sessionId: string): Running {
  return startFocus(state.uid, state.plan, state.sessionNumber + 1, now, sessionId)
}

export function planError(plan: Pick<Plan, 'focusMinutes' | 'shortBreak' | 'longBreak'>): string {
  const ok = (n: number, max: number) => Number.isInteger(n) && n >= 1 && n <= max
  if (!ok(plan.focusMinutes, 240)) return 'Focus for 1 minute to 4 hours.'
  if (!ok(plan.shortBreak, 60) || !ok(plan.longBreak, 90)) return 'Breaks go from 1 to 60 minutes (90 for long breaks).'
  return ''
}

/** "4:05", or "1:02:05" past an hour. */
export function timerText(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

// ---- Saved sessions ----

export type Session = {
  id: string
  taskId: string
  habitId: string
  title: string
  preset: PresetId
  plannedMinutes: number
  minutes: number
  pausedMinutes: number
  startedAt: string
  endedAt: string
  dayKey: string
  outcome: 'completed' | 'stopped'
  leaves: { at: string; seconds: number }[]
  note: string
  /** The focus room it was part of, or '' when none. */
  roomId?: string
}

/** Sessions shorter than this are not saved. */
export const MIN_SAVED_MINUTES = 1

export function toSession(summary: Summary, dayKey: string): Session {
  const link = summary.plan.link
  return {
    id: summary.sessionId,
    taskId: link?.kind === 'task' ? link.id : '',
    habitId: link?.kind === 'habit' ? link.id : '',
    title: link?.title ?? '',
    preset: summary.plan.preset,
    plannedMinutes: summary.plan.focusMinutes,
    minutes: summary.minutes,
    pausedMinutes: Math.round(summary.pausedMs / MINUTE),
    startedAt: new Date(summary.startedAt).toISOString(),
    endedAt: new Date(summary.endedAt).toISOString(),
    dayKey,
    outcome: summary.outcome,
    leaves: summary.leaves.map((l) => ({ at: new Date(l.at).toISOString(), seconds: Math.round(l.ms / 1000) })),
    note: '',
    roomId: summary.plan.roomId ?? '',
  }
}

export function minutesOn(sessions: Session[], dayKey: string): number {
  return sessions.filter((s) => s.dayKey === dayKey).reduce((sum, s) => sum + s.minutes, 0)
}

export function completedOn(sessions: Session[], dayKey: string): number {
  return sessions.filter((s) => s.dayKey === dayKey && s.outcome === 'completed').length
}

/** Focus minutes per task, for showing time spent against estimates. */
export function minutesByTask(sessions: Session[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) if (s.taskId) map.set(s.taskId, (map.get(s.taskId) ?? 0) + s.minutes)
  return map
}
