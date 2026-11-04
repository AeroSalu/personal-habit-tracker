import { describe, expect, it } from 'vitest'
import { activityIds, friendOf, mergeFeed, pairId, relation, requestId, timeAgo, type Activity, type FriendRequest } from './friends'

const req = (from: string, to: string, status: FriendRequest['status'] = 'pending'): FriendRequest => ({
  id: requestId(from, to),
  from,
  to,
  fromUsername: from,
  fromName: from,
  toUsername: to,
  status,
  createdAt: '',
})

describe('IDs', () => {
  it('sorts the pair so both sides agree on one friendship ID', () => {
    expect(pairId('ben', 'ana')).toBe('ana_ben')
    expect(pairId('ana', 'ben')).toBe('ana_ben')
    expect(friendOf({ members: ['ana', 'ben'] }, 'ben')).toBe('ana')
  })

  it('names requests from sender to recipient, and activity by owner', () => {
    expect(requestId('ana', 'ben')).toBe('ana_ben')
    expect(activityIds.task('ana', 't1')).toBe('ana_task_t1')
    expect(activityIds.habit('ana', 'h1', '2026-11-04')).toBe('ana_habit_h1_2026-11-04')
    expect(activityIds.badge('ana', 'streak-3')).toBe('ana_badge_streak-3')
    expect(activityIds.level('ana', 4)).toBe('ana_level_4')
  })
})

describe('relation', () => {
  const state = {
    friends: ['ben'],
    incoming: [req('cat', 'ana')],
    outgoing: [req('ana', 'dan'), req('ana', 'eve', 'declined')],
  }

  it('works out the button to show', () => {
    expect(relation('ana', 'ana', state)).toBe('self')
    expect(relation('ana', 'ben', state)).toBe('friend')
    expect(relation('ana', 'cat', state)).toBe('incoming')
    expect(relation('ana', 'dan', state)).toBe('outgoing')
    expect(relation('ana', 'eve', state)).toBe('declined')
    expect(relation('ana', 'fay', state)).toBe('none')
  })
})

describe('feed', () => {
  const a = (id: string, at: string): Activity => ({ id, uid: 'u', kind: 'task', title: id, at })

  it('merges lists newest first, without duplicates, capped', () => {
    const feed = mergeFeed([[a('x', '2026-11-01'), a('y', '2026-11-03')], [a('z', '2026-11-02'), a('y', '2026-11-03')]], 2)
    expect(feed.map((f) => f.id)).toEqual(['y', 'z'])
  })

  it('describes how long ago', () => {
    const now = new Date('2026-11-04T12:00:00Z').getTime()
    expect(timeAgo('2026-11-04T11:59:40Z', now)).toBe('just now')
    expect(timeAgo('2026-11-04T11:55:00Z', now)).toBe('5m ago')
    expect(timeAgo('2026-11-04T09:00:00Z', now)).toBe('3h ago')
    expect(timeAgo('2026-11-03T10:00:00Z', now)).toBe('yesterday')
    expect(timeAgo('2026-11-01T10:00:00Z', now)).toBe('3d ago')
  })
})
