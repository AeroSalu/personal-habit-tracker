import { describe, expect, it } from 'vitest'
import { challengeProgress, CODE_PATTERN, makeCode, normalizeCode, rank, type Entry } from './leaderboard'

// Wednesday; the week started Monday 2026-11-02.
const TODAY = '2026-11-04'
const entry = (name: string, weekXp: number, over: Partial<NonNullable<Entry['stats']>> = {}): Entry => ({
  uid: name,
  name,
  username: name,
  stats: {
    weekKey: '2026-11-02',
    weekXp,
    weekFocusMinutes: weekXp * 2,
    seasonKey: '2026-11',
    seasonXp: weekXp * 3,
    level: 1,
    streak: 0,
    ...over,
  },
})

describe('rank', () => {
  it('orders highest first and shares ranks on ties', () => {
    const r = rank([entry('Cat', 50), entry('Ana', 120), entry('Ben', 50), entry('Dan', 10)], 'weekXp', TODAY)
    expect(r.map((e) => [e.name, e.rank, e.value])).toEqual([
      ['Ana', 1, 120],
      ['Ben', 2, 50],
      ['Cat', 2, 50],
      ['Dan', 4, 10],
    ])
  })

  it('treats last week’s or last month’s totals as zero', () => {
    const r = rank([entry('Old', 900, { weekKey: '2026-10-26', seasonKey: '2026-10' }), entry('New', 10)], 'weekXp', TODAY)
    expect(r.map((e) => [e.name, e.value])).toEqual([
      ['New', 10],
      ['Old', 0],
    ])
    expect(rank([entry('Old', 900, { seasonKey: '2026-10' })], 'seasonXp', TODAY)[0].value).toBe(0)
  })

  it('ranks by focus minutes or season XP when asked', () => {
    expect(rank([entry('Ana', 10), entry('Ben', 20)], 'weekFocus', TODAY)[0]).toMatchObject({ name: 'Ben', value: 40 })
    expect(rank([entry('Ana', 10)], 'seasonXp', TODAY)[0].value).toBe(30)
  })

  it('puts people with no stats yet at zero', () => {
    const r = rank([{ uid: 'x', name: 'New', username: 'new', stats: null }, entry('Ana', 5)], 'weekXp', TODAY)
    expect(r[1]).toMatchObject({ name: 'New', value: 0, rank: 2 })
  })
})

describe('codes', () => {
  it('makes six-character codes without look-alike characters', () => {
    for (let i = 0; i < 200; i += 1) expect(makeCode()).toMatch(CODE_PATTERN)
    expect('O0I1'.split('').some((c) => makeCode(() => 0.999).includes(c))).toBe(false)
  })

  it('tidies typed codes', () => {
    expect(normalizeCode(' k7m-q2x ')).toBe('K7MQ2X')
  })
})

describe('challengeProgress', () => {
  it('adds up this week’s focus against the target', () => {
    const p = challengeProgress([entry('Ana', 60), entry('Ben', 30, { weekKey: '2026-10-26' })], 240, TODAY)
    expect(p).toEqual({ minutes: 120, target: 240, share: 0.5, done: false })
    expect(challengeProgress([entry('Ana', 200)], 240, TODAY).done).toBe(true)
    expect(challengeProgress([entry('Ana', 200)], 0, TODAY)).toMatchObject({ share: 0, done: false })
  })
})
