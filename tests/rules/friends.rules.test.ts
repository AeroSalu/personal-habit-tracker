import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-lockin-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8181 },
  })
})

beforeEach(async () => {
  await env.clearFirestore()
  // Everyone has a public profile, so requests can be sent to them.
  for (const uid of ['ana', 'ben', 'cat']) {
    await seed(`profiles/${uid}`, { username: uid + '_x', displayName: uid, level: 1, updatedAt: now })
  }
})
afterAll(() => env.cleanup())

const as = (uid: string) => env.authenticatedContext(uid).firestore()
const seed = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data))

const now = '2026-11-04T10:00:00.000Z'
const request = (from: string, to: string, over: Record<string, unknown> = {}) => ({
  from,
  to,
  fromUsername: from + '_x',
  fromName: from,
  toUsername: to + '_x',
  status: 'pending',
  createdAt: now,
  ...over,
})
const friendship = (a: string, b: string) => ({ members: [a, b].sort(), since: now })
const activity = (uid: string, over: Record<string, unknown> = {}) => ({ uid, kind: 'task', title: 'Gym', at: now, ...over })

describe('friend requests', () => {
  it('lets a user send a request to someone with a profile', async () => {
    await assertSucceeds(setDoc(doc(as('ana'), 'friendRequests/ana_ben'), request('ana', 'ben')))
  })

  it('refuses requests sent as someone else, to yourself, under the wrong ID, or to nobody', async () => {
    await assertFails(setDoc(doc(as('cat'), 'friendRequests/ana_ben'), request('ana', 'ben')))
    await assertFails(setDoc(doc(as('ana'), 'friendRequests/ana_ana'), request('ana', 'ana')))
    await assertFails(setDoc(doc(as('ana'), 'friendRequests/ben_ana'), request('ana', 'ben')))
    await assertFails(setDoc(doc(as('ana'), 'friendRequests/ana_ghost'), request('ana', 'ghost')))
    await assertFails(setDoc(doc(as('ana'), 'friendRequests/ana_ben'), request('ana', 'ben', { status: 'declined' })))
    await assertFails(setDoc(doc(as('ana'), 'friendRequests/ana_ben'), request('ana', 'ben', { note: 'hi' })))
  })

  it('refuses a request to someone who is already a friend', async () => {
    await seed('friendships/ana_ben', friendship('ana', 'ben'))
    await assertFails(setDoc(doc(as('ana'), 'friendRequests/ana_ben'), request('ana', 'ben')))
  })

  it('is visible to the two people involved only', async () => {
    await seed('friendRequests/ana_ben', request('ana', 'ben'))
    await assertSucceeds(getDoc(doc(as('ana'), 'friendRequests/ana_ben')))
    await assertSucceeds(getDoc(doc(as('ben'), 'friendRequests/ana_ben')))
    await assertFails(getDoc(doc(as('cat'), 'friendRequests/ana_ben')))
    await assertSucceeds(getDocs(query(collection(as('ben'), 'friendRequests'), where('to', '==', 'ben'))))
    await assertFails(getDocs(query(collection(as('cat'), 'friendRequests'), where('to', '==', 'ben'))))
  })

  it('lets only the recipient decline, and either side withdraw', async () => {
    await seed('friendRequests/ana_ben', request('ana', 'ben'))
    await assertFails(updateDoc(doc(as('ana'), 'friendRequests/ana_ben'), { status: 'declined' }))
    await assertFails(updateDoc(doc(as('ben'), 'friendRequests/ana_ben'), { status: 'pending', fromName: 'x' }))
    await assertSucceeds(updateDoc(doc(as('ben'), 'friendRequests/ana_ben'), { status: 'declined' }))
    await assertFails(deleteDoc(doc(as('cat'), 'friendRequests/ana_ben')))
    await assertSucceeds(deleteDoc(doc(as('ana'), 'friendRequests/ana_ben')))
  })
})

describe('friendships', () => {
  it('lets the recipient accept a pending request and clear it in one batch', async () => {
    await seed('friendRequests/ana_ben', request('ana', 'ben'))
    const db = as('ben')
    const batch = writeBatch(db)
    batch.set(doc(db, 'friendships/ana_ben'), friendship('ana', 'ben'))
    batch.delete(doc(db, 'friendRequests/ana_ben'))
    await assertSucceeds(batch.commit())
  })

  it('refuses friendships without a pending request from the other person', async () => {
    // No request at all.
    await assertFails(setDoc(doc(as('ben'), 'friendships/ana_ben'), friendship('ana', 'ben')))
    // The sender can't accept their own request.
    await seed('friendRequests/ana_ben', request('ana', 'ben'))
    await assertFails(setDoc(doc(as('ana'), 'friendships/ana_ben'), friendship('ana', 'ben')))
    // A declined request can't be accepted later.
    await seed('friendRequests/ana_ben', request('ana', 'ben', { status: 'declined' }))
    await assertFails(setDoc(doc(as('ben'), 'friendships/ana_ben'), friendship('ana', 'ben')))
  })

  it('refuses friendships for other people, unsorted, or under the wrong ID', async () => {
    await seed('friendRequests/ana_ben', request('ana', 'ben'))
    await assertFails(setDoc(doc(as('cat'), 'friendships/ana_ben'), friendship('ana', 'ben')))
    await assertFails(setDoc(doc(as('ben'), 'friendships/ana_ben'), { members: ['ben', 'ana'], since: now }))
    await assertFails(setDoc(doc(as('ben'), 'friendships/x'), friendship('ana', 'ben')))
  })

  it('is visible to and removable by the two friends only', async () => {
    await seed('friendships/ana_ben', friendship('ana', 'ben'))
    await assertSucceeds(getDocs(query(collection(as('ana'), 'friendships'), where('members', 'array-contains', 'ana'))))
    await assertFails(getDoc(doc(as('cat'), 'friendships/ana_ben')))
    await assertFails(deleteDoc(doc(as('cat'), 'friendships/ana_ben')))
    await assertSucceeds(deleteDoc(doc(as('ben'), 'friendships/ana_ben')))
  })
})

describe('activity', () => {
  it('lets a user post their own activity under their own ID prefix', async () => {
    await assertSucceeds(setDoc(doc(as('ana'), 'activity/ana_task_t1'), activity('ana')))
    await assertSucceeds(setDoc(doc(as('ana'), 'activity/ana_badge_streak-3'), activity('ana', { kind: 'badge', title: 'Warming Up' })))
  })

  it('refuses posting as someone else, under their prefix, or with extra fields', async () => {
    await assertFails(setDoc(doc(as('cat'), 'activity/ana_task_t1'), activity('ana')))
    await assertFails(setDoc(doc(as('cat'), 'activity/ana_task_t2'), activity('cat')))
    await assertFails(setDoc(doc(as('ana'), 'activity/ana_task_t3'), activity('ana', { note: 'private' })))
    await assertFails(setDoc(doc(as('ana'), 'activity/ana_task_t4'), activity('ana', { kind: 'session' })))
    await assertFails(setDoc(doc(as('ana'), 'activity/ana_task_t5'), activity('ana', { title: '' })))
  })

  it('is readable by friends, not strangers', async () => {
    await seed('activity/ana_task_t1', activity('ana'))
    const feed = (uid: string) =>
      getDocs(query(collection(as(uid), 'activity'), where('uid', '==', 'ana'), orderBy('at', 'desc'), limit(20)))
    await assertSucceeds(feed('ana'))
    await assertFails(feed('ben'))
    await assertFails(getDoc(doc(as('ben'), 'activity/ana_task_t1')))
    await seed('friendships/ana_ben', friendship('ana', 'ben'))
    await assertSucceeds(feed('ben'))
    await assertFails(feed('cat'))
  })

  it('lets only the owner remove it', async () => {
    await seed('activity/ana_task_t1', activity('ana'))
    await seed('friendships/ana_ben', friendship('ana', 'ben'))
    await assertFails(deleteDoc(doc(as('ben'), 'activity/ana_task_t1')))
    await assertSucceeds(deleteDoc(doc(as('ana'), 'activity/ana_task_t1')))
  })

  it('allows clearing an item that was never posted, under your own prefix only', async () => {
    await assertSucceeds(deleteDoc(doc(as('ana'), 'activity/ana_task_never')))
    await assertFails(deleteDoc(doc(as('ben'), 'activity/ana_task_never')))
  })
})
