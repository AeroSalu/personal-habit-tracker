import { describe, expect, it } from 'vitest'
import {
  advance,
  endEarly,
  leaveApp,
  minutesByTask,
  minutesOn,
  completedOn,
  nextSession,
  pause,
  planError,
  remainingMs,
  resume,
  returnToApp,
  startBreak,
  startFocus,
  suggestedBreak,
  timerText,
  toSession,
  type FocusState,
  type Plan,
  type Session,
  type Summary,
} from './focus'

const MIN = 60_000
const T0 = Date.UTC(2026, 10, 2, 9, 0)
const plan = (over: Partial<Plan> = {}): Plan => ({
  preset: '25/5',
  focusMinutes: 25,
  shortBreak: 5,
  longBreak: 15,
  strict: false,
  link: { kind: 'task', id: 't1', title: 'Report' },
  ...over,
})
const start = (over: Partial<Plan> = {}, n = 1) => startFocus('u', plan(over), n, T0, 's1')
const summary = (s: FocusState) => {
  if (s.phase !== 'summary') throw new Error(`expected summary, got ${s.phase}`)
  return s
}

describe('running a session', () => {
  it('counts down and completes at its planned end, even if checked late', () => {
    const s = start()
    expect(remainingMs(s, T0 + 5 * MIN)).toBe(20 * MIN)
    expect(advance(s, T0 + 24 * MIN).phase).toBe('focus')
    const done = summary(advance(s, T0 + 3 * 60 * MIN))
    expect(done.outcome).toBe('completed')
    expect(done.endedAt).toBe(T0 + 25 * MIN)
    expect(done.minutes).toBe(25)
  })

  it('freezes while paused and pushes the end back on resume', () => {
    let s: FocusState = pause(start(), T0 + 10 * MIN)
    expect(remainingMs(s, T0 + 40 * MIN)).toBe(15 * MIN)
    expect(advance(s, T0 + 60 * MIN).phase).toBe('focus')
    s = resume(s, T0 + 20 * MIN)
    expect(remainingMs(s, T0 + 20 * MIN)).toBe(15 * MIN)
    const done = summary(advance(s, T0 + 35 * MIN))
    expect(done.minutes).toBe(25)
    expect(done.pausedMs).toBe(10 * MIN)
  })

  it('saves the focused time when ended early, without the pause', () => {
    let s: FocusState = pause(start(), T0 + 5 * MIN)
    s = resume(s, T0 + 8 * MIN)
    const stopped = summary(endEarly(s, T0 + 20 * MIN))
    expect(stopped.outcome).toBe('stopped')
    expect(stopped.minutes).toBe(17)
  })

  it('ends early while paused using time before the pause', () => {
    const s = pause(start(), T0 + 12 * MIN)
    expect(summary(endEarly(s, T0 + 30 * MIN)).minutes).toBe(12)
  })
})

describe('leaving the app', () => {
  it('records each leave without stopping a normal session', () => {
    let s: FocusState = leaveApp(start(), T0 + 5 * MIN)
    s = returnToApp(s, T0 + 7 * MIN)
    expect(s.phase).toBe('focus')
    if (s.phase === 'focus') expect(s.leaves).toEqual([{ at: T0 + 5 * MIN, ms: 2 * MIN }])
  })

  it('in strict mode, allows a short look away', () => {
    let s: FocusState = leaveApp(start({ strict: true }), T0 + 5 * MIN)
    s = returnToApp(s, T0 + 5 * MIN + 20_000)
    expect(s.phase).toBe('focus')
  })

  it('in strict mode, stops at the moment of leaving after 30 seconds away', () => {
    let s: FocusState = leaveApp(start({ strict: true }), T0 + 5 * MIN)
    s = returnToApp(s, T0 + 9 * MIN)
    const stopped = summary(s)
    expect(stopped.outcome).toBe('stopped')
    expect(stopped.strictStop).toBe(true)
    expect(stopped.endedAt).toBe(T0 + 5 * MIN)
    expect(stopped.minutes).toBe(5)
  })

  it('in strict mode, a session that ends within the grace period still completes', () => {
    let s: FocusState = leaveApp(start({ strict: true }), T0 + 25 * MIN - 10_000)
    s = returnToApp(s, T0 + 40 * MIN)
    expect(summary(s).outcome).toBe('completed')
  })

  it('ignores leaving while paused', () => {
    const s = leaveApp(pause(start({ strict: true }), T0 + MIN), T0 + 2 * MIN)
    if (s.phase === 'focus') expect(s.awaySince).toBeNull()
  })
})

describe('breaks', () => {
  it('suggests a long break every fourth session', () => {
    expect(suggestedBreak({ sessionNumber: 1 })).toBe('short')
    expect(suggestedBreak({ sessionNumber: 4 })).toBe('long')
    expect(suggestedBreak({ sessionNumber: 8 })).toBe('long')
  })

  it('runs a break, then the next session continues the count', () => {
    const done = advance(start(), T0 + 25 * MIN)
    let s = startBreak(done, 'short', T0 + 26 * MIN)
    expect(s.phase).toBe('break')
    expect(remainingMs(s, T0 + 27 * MIN)).toBe(4 * MIN)
    s = advance(s, T0 + 31 * MIN)
    expect(s.phase).toBe('breakOver')
    const next = nextSession(s, T0 + 32 * MIN, 's2')
    expect(next.sessionNumber).toBe(2)
    expect(next.plan.link?.id).toBe('t1')
  })

  it('uses the long break length', () => {
    const s = startBreak(advance(start(), T0 + 25 * MIN), 'long', T0 + 25 * MIN)
    if (s.phase === 'break') expect(s.minutes).toBe(15)
  })
})

describe('saving', () => {
  it('turns a summary into a session record', () => {
    let s: FocusState = leaveApp(start(), T0 + MIN)
    s = returnToApp(s, T0 + 2 * MIN)
    const record = toSession(summary(advance(s, T0 + 25 * MIN)) as Summary, '2026-11-02')
    expect(record).toMatchObject({
      id: 's1',
      taskId: 't1',
      habitId: '',
      title: 'Report',
      minutes: 25,
      outcome: 'completed',
      dayKey: '2026-11-02',
    })
    expect(record.leaves).toEqual([{ at: new Date(T0 + MIN).toISOString(), seconds: 60 }])
  })

  it('totals minutes by day and by task', () => {
    const s = (over: Partial<Session>): Session => ({
      id: '',
      taskId: '',
      habitId: '',
      title: '',
      preset: '25/5',
      plannedMinutes: 25,
      minutes: 25,
      pausedMinutes: 0,
      startedAt: '',
      endedAt: '',
      dayKey: '2026-11-02',
      outcome: 'completed',
      leaves: [],
      note: '',
      ...over,
    })
    const list = [s({ taskId: 'a' }), s({ taskId: 'a', minutes: 10, outcome: 'stopped' }), s({ dayKey: '2026-11-01' })]
    expect(minutesOn(list, '2026-11-02')).toBe(35)
    expect(completedOn(list, '2026-11-02')).toBe(1)
    expect(minutesByTask(list).get('a')).toBe(35)
  })
})

describe('formatting and validation', () => {
  it('formats the timer', () => {
    expect(timerText(25 * MIN)).toBe('25:00')
    expect(timerText(65_000)).toBe('1:05')
    expect(timerText(500)).toBe('0:01')
    expect(timerText(90 * MIN)).toBe('1:30:00')
  })

  it('validates custom lengths', () => {
    expect(planError({ focusMinutes: 25, shortBreak: 5, longBreak: 15 })).toBe('')
    expect(planError({ focusMinutes: 0, shortBreak: 5, longBreak: 15 })).not.toBe('')
    expect(planError({ focusMinutes: 25, shortBreak: 61, longBreak: 15 })).not.toBe('')
    expect(planError({ focusMinutes: Number.NaN, shortBreak: 5, longBreak: 15 })).not.toBe('')
  })
})
