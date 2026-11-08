import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore'

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
const seed = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data))

const now = '2026-11-08T10:00:00.000Z'
const CODE = 'RQQMAB'
const room = (over: Record<string, unknown> = {}) => ({
  name: 'DSA Lock-in',
  hostUid: 'ana',
  code: CODE,
  goalMinutes: 120,
  session: null,
  createdAt: now,
  ...over,
})
const member = (uid: string, over: Record<string, unknown> = {}) => ({
  uid,
  displayName: uid,
  username: `${uid}_x`,
  code: CODE,
  joinedAt: now,
  state: 'idle',
  heartbeatAt: now,
  minutes: 0,
  ...over,
})
const session = { startedAt: now, endsAt: '2026-11-08T10:50:00.000Z', minutes: 50 }

async function seedRoom() {
  await seed('rooms/r1', room())
  await seed(`roomCodes/${CODE}`, { roomId: 'r1', name: 'DSA Lock-in' })
  await seed('rooms/r1/members/ana', member('ana'))
}

describe('rooms', () => {
  it('can be created with their code and the host as first member', async () => {
    const db = as('ana')
    const batch = writeBatch(db)
    batch.set(doc(db, 'rooms/r1'), room())
    batch.set(doc(db, `roomCodes/${CODE}`), { roomId: 'r1', name: 'DSA Lock-in' })
    batch.set(doc(db, 'rooms/r1/members/ana'), member('ana'))
    await assertSucceeds(batch.commit())
  })

  it('refuses a room hosted by someone else or with a mismatched code', async () => {
    const db = as('ana')
    const batch = writeBatch(db)
    batch.set(doc(db, 'rooms/r1'), room({ hostUid: 'ben' }))
    batch.set(doc(db, `roomCodes/${CODE}`), { roomId: 'r1', name: 'x' })
    await assertFails(batch.commit())
  })

  it('lets people join with the code and see who is in the room', async () => {
    await seedRoom()
    await assertFails(setDoc(doc(as('ben'), 'rooms/r1/members/ben'), member('ben', { code: 'WRONGQ' })))
    await assertFails(getDocs(collection(as('ben'), 'rooms/r1/members')))
    await assertSucceeds(setDoc(doc(as('ben'), 'rooms/r1/members/ben'), member('ben')))
    await assertSucceeds(getDocs(collection(as('ben'), 'rooms/r1/members')))
    await assertSucceeds(getDoc(doc(as('ben'), 'rooms/r1')))
    await assertFails(getDoc(doc(as('cat'), 'rooms/r1')))
  })

  it('refuses joining with minutes already counted, or with private details', async () => {
    await seedRoom()
    await assertFails(setDoc(doc(as('ben'), 'rooms/r1/members/ben'), member('ben', { minutes: 500 })))
    await assertFails(setDoc(doc(as('ben'), 'rooms/r1/members/ben'), member('ben', { task: 'Secret essay' })))
  })
})

describe('presence and minutes', () => {
  it('lets members update their own state, and add up to one session of minutes at a time', async () => {
    await seedRoom()
    await seed('rooms/r1/members/ben', member('ben', { minutes: 30 }))
    await assertSucceeds(setDoc(doc(as('ben'), 'rooms/r1/members/ben'), member('ben', { state: 'focusing', minutes: 30 })))
    await assertSucceeds(setDoc(doc(as('ben'), 'rooms/r1/members/ben'), member('ben', { minutes: 80 })))
    await assertFails(setDoc(doc(as('ben'), 'rooms/r1/members/ben'), member('ben', { minutes: 20 })))
    await assertFails(setDoc(doc(as('ben'), 'rooms/r1/members/ben'), member('ben', { minutes: 900 })))
    await assertFails(setDoc(doc(as('ben'), 'rooms/r1/members/ben'), member('ben', { minutes: 80, state: 'asleep' })))
    await assertFails(setDoc(doc(as('ben'), 'rooms/r1/members/ana'), member('ana', { state: 'break' })))
  })
})

describe('shared sessions', () => {
  it('lets only the host start and end the session or change the goal', async () => {
    await seedRoom()
    await seed('rooms/r1/members/ben', member('ben'))
    await assertFails(updateDoc(doc(as('ben'), 'rooms/r1'), { session }))
    await assertSucceeds(updateDoc(doc(as('ana'), 'rooms/r1'), { session }))
    await assertSucceeds(updateDoc(doc(as('ana'), 'rooms/r1'), { session: null, goalMinutes: 240 }))
    await assertFails(updateDoc(doc(as('ana'), 'rooms/r1'), { session: { ...session, minutes: 600 } }))
    await assertFails(updateDoc(doc(as('ana'), 'rooms/r1'), { hostUid: 'ben' }))
  })
})

describe('leaving and closing', () => {
  it('lets members leave, the host remove people, and only the host close the room', async () => {
    await seedRoom()
    await seed('rooms/r1/members/ben', member('ben'))
    await seed('rooms/r1/members/cat', member('cat'))
    await assertFails(deleteDoc(doc(as('ben'), 'rooms/r1/members/cat')))
    await assertSucceeds(deleteDoc(doc(as('ben'), 'rooms/r1/members/ben')))
    await assertSucceeds(deleteDoc(doc(as('ana'), 'rooms/r1/members/cat')))
    await assertFails(deleteDoc(doc(as('cat'), 'rooms/r1')))
    const db = as('ana')
    const batch = writeBatch(db)
    batch.delete(doc(db, `roomCodes/${CODE}`))
    batch.delete(doc(db, 'rooms/r1'))
    await assertSucceeds(batch.commit())
  })
})
