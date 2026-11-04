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

const now = '2026-11-04T10:00:00.000Z'
const CODE = 'K7MQ2X'
const group = (over: Record<string, unknown> = {}) => ({ name: 'DSA crew', ownerUid: 'ana', code: CODE, targetMinutes: 2400, createdAt: now, ...over })
const member = (uid: string, over: Record<string, unknown> = {}) => ({
  uid,
  displayName: uid,
  username: `${uid}_x`,
  code: CODE,
  joinedAt: now,
  level: 2,
  weekKey: '2026-11-02',
  weekXp: 100,
  weekFocusMinutes: 300,
  seasonKey: '2026-11',
  seasonXp: 150,
  streak: 3,
  updatedAt: now,
  ...over,
})

/** A group owned by ana, with ana as a member. */
async function seedGroup() {
  await seed('groups/g1', group())
  await seed(`groupCodes/${CODE}`, { groupId: 'g1', name: 'DSA crew' })
  await seed('groups/g1/members/ana', member('ana'))
}

describe('creating a group', () => {
  it('works as one batch of group, code and the owner’s membership', async () => {
    const db = as('ana')
    const batch = writeBatch(db)
    batch.set(doc(db, 'groups/g1'), group())
    batch.set(doc(db, `groupCodes/${CODE}`), { groupId: 'g1', name: 'DSA crew' })
    batch.set(doc(db, 'groups/g1/members/ana'), member('ana'))
    await assertSucceeds(batch.commit())
  })

  it('refuses a group owned by someone else, a bad code, or a code pointing elsewhere', async () => {
    const attempt = async (g: Record<string, unknown>, codeDoc: Record<string, unknown>, code = CODE) => {
      const db = as('ana')
      const batch = writeBatch(db)
      batch.set(doc(db, 'groups/g1'), g)
      batch.set(doc(db, `groupCodes/${code}`), codeDoc)
      return batch.commit()
    }
    await assertFails(attempt(group({ ownerUid: 'ben' }), { groupId: 'g1', name: 'x' }))
    await assertFails(attempt(group({ code: 'abc' }), { groupId: 'g1', name: 'x' }, 'abc'))
    await assertFails(attempt(group(), { groupId: 'g2', name: 'x' }))
    await assertFails(attempt(group({ name: '' }), { groupId: 'g1', name: 'x' }))
  })

  it('cannot take over a code that already exists', async () => {
    await seedGroup()
    const db = as('ben')
    const batch = writeBatch(db)
    batch.set(doc(db, 'groups/g2'), group({ ownerUid: 'ben' }))
    batch.set(doc(db, `groupCodes/${CODE}`), { groupId: 'g2', name: 'Mine now' })
    await assertFails(batch.commit())
  })
})

describe('joining', () => {
  it('lets someone with the right code join as themselves', async () => {
    await seedGroup()
    await assertSucceeds(getDoc(doc(as('ben'), `groupCodes/${CODE}`)))
    await assertSucceeds(setDoc(doc(as('ben'), 'groups/g1/members/ben'), member('ben')))
  })

  it('refuses a wrong code, joining as someone else, or listing codes', async () => {
    await seedGroup()
    await assertFails(setDoc(doc(as('ben'), 'groups/g1/members/ben'), member('ben', { code: 'WRONG2' })))
    await assertFails(setDoc(doc(as('ben'), 'groups/g1/members/cat'), member('cat')))
    await assertFails(getDocs(collection(as('ben'), 'groupCodes')))
  })
})

describe('reading and updating', () => {
  it('shows the group and its members to members only', async () => {
    await seedGroup()
    await seed('groups/g1/members/ben', member('ben'))
    await assertSucceeds(getDoc(doc(as('ben'), 'groups/g1')))
    await assertSucceeds(getDocs(collection(as('ben'), 'groups/g1/members')))
    await assertFails(getDoc(doc(as('cat'), 'groups/g1')))
    await assertFails(getDocs(collection(as('cat'), 'groups/g1/members')))
  })

  it('lets members update their own numbers only, within limits', async () => {
    await seedGroup()
    await seed('groups/g1/members/ben', member('ben'))
    await assertSucceeds(setDoc(doc(as('ben'), 'groups/g1/members/ben'), member('ben', { weekXp: 220 })))
    await assertFails(setDoc(doc(as('ben'), 'groups/g1/members/ana'), member('ana', { weekXp: 1 })))
    await assertFails(setDoc(doc(as('ben'), 'groups/g1/members/ben'), member('ben', { weekFocusMinutes: 20000 })))
    await assertFails(setDoc(doc(as('ben'), 'groups/g1/members/ben'), member('ben', { code: 'OTHER2' })))
  })

  it('lets only the owner rename the group or change its target', async () => {
    await seedGroup()
    await seed('groups/g1/members/ben', member('ben'))
    await assertFails(updateDoc(doc(as('ben'), 'groups/g1'), { name: 'Ben’s now' }))
    await assertSucceeds(updateDoc(doc(as('ana'), 'groups/g1'), { name: 'DSA crew 2', targetMinutes: 3000 }))
    await assertFails(updateDoc(doc(as('ana'), 'groups/g1'), { ownerUid: 'ben' }))
    await assertFails(updateDoc(doc(as('ana'), 'groups/g1'), { code: 'NEWCD2' }))
  })
})

describe('leaving and removing', () => {
  it('lets members leave and the owner remove members, but not others', async () => {
    await seedGroup()
    await seed('groups/g1/members/ben', member('ben'))
    await seed('groups/g1/members/cat', member('cat'))
    await assertFails(deleteDoc(doc(as('ben'), 'groups/g1/members/cat')))
    await assertSucceeds(deleteDoc(doc(as('ben'), 'groups/g1/members/ben')))
    await assertSucceeds(deleteDoc(doc(as('ana'), 'groups/g1/members/cat')))
  })

  it('lets only the owner delete the group and its code', async () => {
    await seedGroup()
    await seed('groups/g1/members/ben', member('ben'))
    await assertFails(deleteDoc(doc(as('ben'), 'groups/g1')))
    await assertFails(deleteDoc(doc(as('ben'), `groupCodes/${CODE}`)))
    const db = as('ana')
    const batch = writeBatch(db)
    batch.delete(doc(db, `groupCodes/${CODE}`))
    batch.delete(doc(db, 'groups/g1'))
    await assertSucceeds(batch.commit())
  })
})
