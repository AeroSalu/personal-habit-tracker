import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore'

// Deleting an account removes everything about the person. These check the owner can find
// and delete every document `deleteAccount` (src/data/account.ts) touches, and others can't.

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-lockin-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8181 },
  })
})
afterAll(() => env.cleanup())

const as = (uid: string) => env.authenticatedContext(uid).firestore()
const seed = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data))
const now = '2026-11-04T10:00:00.000Z'

beforeEach(async () => {
  await env.clearFirestore()
  await seed('usernames/ana_k', { uid: 'ana' })
  await seed('profiles/ana', { username: 'ana_k', displayName: 'Ana', level: 1, updatedAt: now })
  await seed('profiles/ben', { username: 'ben_b', displayName: 'Ben', level: 1, updatedAt: now })
  await seed('stats/ana', { level: 1, updatedAt: now })
  await seed('friendships/ana_ben', { members: ['ana', 'ben'], since: now })
  await seed('friendRequests/ana_cat', { from: 'ana', to: 'cat', status: 'pending' })
  await seed('friendRequests/dan_ana', { from: 'dan', to: 'ana', status: 'pending' })
  await seed('activity/ana_task_t1', { uid: 'ana', kind: 'task', title: 'Gym', at: now })
  await seed('activity/ben_task_t9', { uid: 'ben', kind: 'task', title: 'Run', at: now })
  await seed('cheers/ana_task_t1_ben', { activityId: 'ana_task_t1', owner: 'ana', uid: 'ben', emoji: '👏', at: now })
  await seed('cheers/ben_task_t9_ana', { activityId: 'ben_task_t9', owner: 'ben', uid: 'ana', emoji: '🔥', at: now })
  await seed('users/ana', { displayName: 'Ana' })
  await seed('users/ana/tasks/t1', { title: 'Gym' })
  await seed('users/ana/days/2026-11-04', { note: 'ok' })
})

describe('deleting an account', () => {
  it('lets the owner find everything about them with the queries the app uses', async () => {
    const db = as('ana')
    for (const [field, op, value] of [
      ['uid', '==', 'ana'],
      ['owner', '==', 'ana'],
    ] as const) {
      await assertSucceeds(getDocs(query(collection(db, 'cheers'), where(field, op, value))))
    }
    await assertSucceeds(getDocs(query(collection(db, 'activity'), where('uid', '==', 'ana'))))
    await assertSucceeds(getDocs(query(collection(db, 'friendships'), where('members', 'array-contains', 'ana'))))
    await assertSucceeds(getDocs(query(collection(db, 'friendRequests'), where('from', '==', 'ana'))))
    await assertSucceeds(getDocs(query(collection(db, 'friendRequests'), where('to', '==', 'ana'))))
  })

  it('lets the owner delete every shared and private document', async () => {
    const db = as('ana')
    for (const path of [
      'cheers/ben_task_t9_ana',
      'cheers/ana_task_t1_ben',
      'activity/ana_task_t1',
      'friendships/ana_ben',
      'friendRequests/ana_cat',
      'friendRequests/dan_ana',
      'stats/ana',
      'profiles/ana',
      'usernames/ana_k',
      'users/ana/tasks/t1',
      'users/ana/days/2026-11-04',
      'users/ana',
    ]) {
      await assertSucceeds(deleteDoc(doc(db, path)))
    }
  })

  it('never lets someone else delete them', async () => {
    const db = as('cat')
    for (const path of ['profiles/ana', 'stats/ana', 'usernames/ana_k', 'activity/ana_task_t1', 'cheers/ben_task_t9_ana', 'friendships/ana_ben', 'users/ana']) {
      await assertFails(deleteDoc(doc(db, path)))
    }
    // Cheers someone else gave are not readable by a stranger asking by giver.
    await assertFails(getDocs(query(collection(db, 'cheers'), where('uid', '==', 'ana'))))
  })
})
