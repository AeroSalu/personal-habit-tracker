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

// The device can sleep, the app can be frozen in the background, and timers stop firing.
// The state only ever looks at timestamps, so whenever the app next looks, it's right.
describe('sleep and backgrounding', () => {
  it('a session that ended while the device slept completes at its planned end, with full minutes', () => {
    const s = start()
    const woke = advance(s, T0 + 8 * 60 * MIN)
    const done = summary(woke)
    expect(done.outcome).toBe('completed')
    expect(done.endedAt).toBe(T0 + 25 * MIN)
    expect(done.minutes).toBe(25)
  })

  it('a session still running after a short sleep shows the true time left', () => {
    const s = start()
    const woke = advance(s, T0 + 17 * MIN)
    expect(woke.phase).toBe('focus')
    expect(remainingMs(woke, T0 + 17 * MIN)).toBe(8 * MIN)
  })

  it('a break that ran out in the background is over when the app returns', () => {
    const done = summary(advance(start(), T0 + 25 * MIN))
    const resting = startBreak(done, 'short', T0 + 26 * MIN)
    expect(advance(resting, T0 + 2 * 60 * MIN).phase).toBe('breakOver')
  })

  it('sleeping while paused leaves the time left untouched', () => {
    const s = pause(start(), T0 + 10 * MIN)
    const later = advance(s, T0 + 9 * 60 * MIN)
    expect(later.phase).toBe('focus')
    expect(remainingMs(resume(later, T0 + 9 * 60 * MIN), T0 + 9 * 60 * MIN)).toBe(15 * MIN)
  })

  it('a normal session left in the background through its end completes, recording the leave until the end', () => {
    const away = leaveApp(start(), T0 + 20 * MIN)
    const back = summary(returnToApp(away, T0 + 50 * MIN))
    expect(back.outcome).toBe('completed')
    expect(back.minutes).toBe(25)
    expect(back.leaves).toEqual([{ at: T0 + 20 * MIN, ms: 5 * MIN }])
  })

  it('a strict session left for a long sleep stops at the moment it was left', () => {
    const away = leaveApp(start({ strict: true }), T0 + 12 * MIN)
    const back = summary(returnToApp(away, T0 + 3 * 60 * MIN))
    expect(back.outcome).toBe('stopped')
    expect(back.strictStop).toBe(true)
    expect(back.endedAt).toBe(T0 + 12 * MIN)
    expect(back.minutes).toBe(12)
  })

  it('never shows more time left than the session has, even if the device clock jumps back', () => {
    const s = start()
    expect(remainingMs(s, T0 - 10 * MIN)).toBe(25 * MIN)
  })
})

describe('clock jumps', () => {
  it('caps a paused session and a break at their own length too', () => {
    const paused = resume(pause(start(), T0 + 5 * MIN), T0 + 9 * MIN)
    expect(remainingMs(paused, T0 - 60 * MIN)).toBe(25 * MIN)
    const done = summary(advance(start(), T0 + 25 * MIN))
    const resting = startBreak(done, 'short', T0 + 26 * MIN)
    expect(remainingMs(resting, T0)).toBe(5 * MIN)
  })
})
