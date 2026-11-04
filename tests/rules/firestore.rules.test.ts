import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-lockin-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8181 },
  })
})

beforeEach(() => env.clearFirestore())
afterAll(() => env.cleanup())

const as = (uid: string) => env.authenticatedContext(uid).firestore()
const anon = () => env.unauthenticatedContext().firestore()

/** Writes directly, bypassing the rules, to set up a scenario. */
const seed = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data))

const now = '2026-11-04T10:00:00.000Z'
const profile = (username: string, over: Record<string, unknown> = {}) => ({
  username,
  displayName: 'Ana',
  level: 3,
  updatedAt: now,
  ...over,
})
const stats = (over: Record<string, unknown> = {}) => ({
  level: 3,
  xp: 450,
  badges: ['first-lock-in'],
  weekKey: '2026-11-02',
  weekXp: 120,
  weekFocusMinutes: 300,
  seasonKey: '2026-11',
  seasonXp: 200,
  streak: 4,
  focusing: null,
  updatedAt: now,
  ...over,
})

describe('private records', () => {
  it('lets only the owner read and write their own data', async () => {
    await assertSucceeds(setDoc(doc(as('ana'), 'users/ana/tasks/t1'), { title: 'x' }))
    await assertSucceeds(getDoc(doc(as('ana'), 'users/ana/tasks/t1')))
    await assertFails(getDoc(doc(as('ben'), 'users/ana/tasks/t1')))
    await assertFails(setDoc(doc(as('ben'), 'users/ana/tasks/t2'), { title: 'x' }))
    await assertFails(getDoc(doc(anon(), 'users/ana/tasks/t1')))
  })
})

describe('usernames', () => {
  it('lets a user claim a free, valid name for themselves', async () => {
    await assertSucceeds(setDoc(doc(as('ana'), 'usernames/ana_k'), { uid: 'ana' }))
  })

  it('refuses names that are taken, malformed, or claimed for someone else', async () => {
    await seed('usernames/taken', { uid: 'ben' })
    await assertFails(setDoc(doc(as('ana'), 'usernames/taken'), { uid: 'ana' }))
    await assertFails(setDoc(doc(as('ana'), 'usernames/Ana'), { uid: 'ana' }))
    await assertFails(setDoc(doc(as('ana'), 'usernames/ab'), { uid: 'ana' }))
    await assertFails(setDoc(doc(as('ana'), 'usernames/has space'), { uid: 'ana' }))
    await assertFails(setDoc(doc(as('ana'), 'usernames/for_ben'), { uid: 'ben' }))
    await assertFails(setDoc(doc(as('ana'), 'usernames/extra'), { uid: 'ana', note: 'x' }))
    await assertFails(setDoc(doc(anon(), 'usernames/nobody'), { uid: 'nobody' }))
  })

  it('lets only the holder release a name', async () => {
    await seed('usernames/ana_k', { uid: 'ana' })
    await assertFails(deleteDoc(doc(as('ben'), 'usernames/ana_k')))
    await assertSucceeds(deleteDoc(doc(as('ana'), 'usernames/ana_k')))
  })

  it('lets signed-in users look names up', async () => {
    await seed('usernames/ana_k', { uid: 'ana' })
    await assertSucceeds(getDoc(doc(as('ben'), 'usernames/ana_k')))
    await assertFails(getDoc(doc(anon(), 'usernames/ana_k')))
  })
})

describe('profiles', () => {
  it('lets a user claim a name and set their profile in one batch', async () => {
    const db = as('ana')
    const batch = writeBatch(db)
    batch.set(doc(db, 'usernames/ana_k'), { uid: 'ana' })
    batch.set(doc(db, 'profiles/ana'), profile('ana_k'))
    await assertSucceeds(batch.commit())
  })

  it('refuses a profile naming a username the user does not hold', async () => {
    await seed('usernames/ben_b', { uid: 'ben' })
    await assertFails(setDoc(doc(as('ana'), 'profiles/ana'), profile('ben_b')))
    await assertFails(setDoc(doc(as('ana'), 'profiles/ana'), profile('nobody_has')))
  })

  it('refuses writing someone else’s profile or extra fields', async () => {
    await seed('usernames/ana_k', { uid: 'ana' })
    await assertFails(setDoc(doc(as('ben'), 'profiles/ana'), profile('ana_k')))
    await assertFails(setDoc(doc(as('ana'), 'profiles/ana'), profile('ana_k', { email: 'a@b.c' })))
    await assertFails(setDoc(doc(as('ana'), 'profiles/ana'), profile('ana_k', { level: 0 })))
    await assertFails(setDoc(doc(as('ana'), 'profiles/ana'), profile('ana_k', { displayName: '' })))
  })

  it('is readable by any signed-in user, for search', async () => {
    await seed('profiles/ana', profile('ana_k'))
    await assertSucceeds(getDoc(doc(as('ben'), 'profiles/ana')))
    await assertFails(getDoc(doc(anon(), 'profiles/ana')))
  })
})

describe('stats', () => {
  it('lets the owner publish valid stats', async () => {
    await assertSucceeds(setDoc(doc(as('ana'), 'stats/ana'), stats()))
    await assertSucceeds(setDoc(doc(as('ana'), 'stats/ana'), stats({ focusing: { until: now } })))
  })

  it('refuses stats outside what a real week allows, or written by someone else', async () => {
    await assertFails(setDoc(doc(as('ana'), 'stats/ana'), stats({ weekFocusMinutes: 10081 })))
    await assertFails(setDoc(doc(as('ana'), 'stats/ana'), stats({ weekXp: -1 })))
    await assertFails(setDoc(doc(as('ana'), 'stats/ana'), stats({ weekXp: 1.5 })))
    await assertFails(setDoc(doc(as('ana'), 'stats/ana'), stats({ weekKey: 'soon' })))
    await assertFails(setDoc(doc(as('ana'), 'stats/ana'), stats({ tasks: ['secret'] })))
    await assertFails(setDoc(doc(as('ana'), 'stats/ana'), stats({ focusing: { until: now, task: 'x' } })))
    await assertFails(setDoc(doc(as('ben'), 'stats/ana'), stats()))
  })

  it('is readable by the owner and friends only', async () => {
    await seed('stats/ana', stats())
    await assertSucceeds(getDoc(doc(as('ana'), 'stats/ana')))
    await assertFails(getDoc(doc(as('ben'), 'stats/ana')))
    await seed('friendships/ana_ben', { members: ['ana', 'ben'] })
    await assertSucceeds(getDoc(doc(as('ben'), 'stats/ana')))
    await assertFails(getDoc(doc(as('cat'), 'stats/ana')))
    await assertFails(getDoc(doc(anon(), 'stats/ana')))
  })
})

describe('anything else', () => {
  it('is closed by default', async () => {
    await assertFails(setDoc(doc(as('ana'), 'random/x'), { a: 1 }))
    await assertFails(getDoc(doc(as('ana'), 'friendships/ana_ben')))
  })
})
