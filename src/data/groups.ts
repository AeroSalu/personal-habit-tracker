import { collection, deleteDoc, doc, getDocFromServer, setDoc, updateDoc, writeBatch, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { makeCode } from '../lib/leaderboard'
import type { PublicStats } from '../lib/social'
import { useLiveDocs, useLiveQuery } from './live'
import { useUserCollection } from './useCollection'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown) => (typeof v === 'number' ? v : 0)

/** My own record of a group I'm in, kept privately so I can list my groups. */
export type MyGroup = { id: string; name: string; code: string; joinedAt: string }
export type Group = { id: string; name: string; ownerUid: string; code: string; targetMinutes: number }
export type Member = {
  uid: string
  displayName: string
  username: string
  level: number
  weekKey: string
  weekXp: number
  weekFocusMinutes: number
  seasonKey: string
  seasonXp: number
  streak: number
}

const toMyGroup = (id: string, d: DocumentData): MyGroup => ({ id, name: str(d.name), code: str(d.code), joinedAt: str(d.joinedAt) })
const toGroup = (id: string, d: DocumentData): Group => ({
  id,
  name: str(d.name),
  ownerUid: str(d.ownerUid),
  code: str(d.code),
  targetMinutes: num(d.targetMinutes),
})
const toMember = (id: string, d: DocumentData): Member => ({
  uid: id,
  displayName: str(d.displayName),
  username: str(d.username),
  level: num(d.level) || 1,
  weekKey: str(d.weekKey),
  weekXp: num(d.weekXp),
  weekFocusMinutes: num(d.weekFocusMinutes),
  seasonKey: str(d.seasonKey),
  seasonXp: num(d.seasonXp),
  streak: num(d.streak),
})

export const useMyGroups = (uid: string) => useUserCollection(uid, 'groups', toMyGroup)
export const useGroups = (ids: string[]) => useLiveDocs(ids.map((id) => `groups/${id}`), toGroup)
export const useMembers = (gid: string | null) =>
  useLiveQuery(gid ? `members:${gid}` : null, () => collection(db, 'groups', gid!, 'members'), toMember)

type Me = { uid: string; username: string; displayName: string }
type Numbers = Pick<PublicStats, 'level' | 'weekKey' | 'weekXp' | 'weekFocusMinutes' | 'seasonKey' | 'seasonXp' | 'streak'>

function memberDoc(me: Me, code: string, numbers: Numbers, joinedAt: string) {
  return {
    uid: me.uid,
    displayName: me.displayName.trim().slice(0, 40),
    username: me.username,
    code,
    joinedAt,
    level: numbers.level,
    weekKey: numbers.weekKey,
    weekXp: numbers.weekXp,
    weekFocusMinutes: numbers.weekFocusMinutes,
    seasonKey: numbers.seasonKey,
    seasonXp: numbers.seasonXp,
    streak: numbers.streak,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Creates a group with a fresh invite code, making me its first member. Awaited, because a
 * code that's already taken is only discovered by the server; it retries with a new one.
 */
export async function createGroup(me: Me, name: string, targetMinutes: number, numbers: Numbers): Promise<{ id: string; code: string }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeCode()
    const taken = await getDocFromServer(doc(db, 'groupCodes', code))
    if (taken.exists()) continue
    const ref = doc(collection(db, 'groups'))
    const now = new Date().toISOString()
    const batch = writeBatch(db)
    batch.set(ref, { name: name.trim(), ownerUid: me.uid, code, targetMinutes, createdAt: now })
    batch.set(doc(db, 'groupCodes', code), { groupId: ref.id, name: name.trim() })
    batch.set(doc(db, 'groups', ref.id, 'members', me.uid), memberDoc(me, code, numbers, now))
    batch.set(doc(db, 'users', me.uid, 'groups', ref.id), { name: name.trim(), code, joinedAt: now })
    await batch.commit()
    return { id: ref.id, code }
  }
  throw new Error('Could not find a free invite code. Try again.')
}

/** The group an invite code points to, or null. Needs a connection. */
export async function findGroupByCode(code: string): Promise<{ groupId: string; name: string } | null> {
  const snap = await getDocFromServer(doc(db, 'groupCodes', code))
  return snap.exists() ? { groupId: str(snap.data().groupId), name: str(snap.data().name) } : null
}

export async function joinGroup(me: Me, groupId: string, code: string, name: string, numbers: Numbers) {
  const now = new Date().toISOString()
  const batch = writeBatch(db)
  batch.set(doc(db, 'groups', groupId, 'members', me.uid), memberDoc(me, code, numbers, now))
  batch.set(doc(db, 'users', me.uid, 'groups', groupId), { name, code, joinedAt: now })
  await batch.commit()
}

export function leaveGroup(uid: string, groupId: string) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'groups', groupId, 'members', uid))
  batch.delete(doc(db, 'users', uid, 'groups', groupId))
  return batch.commit()
}

/** Forgets a group that its owner has deleted, which can no longer be left normally. */
export const forgetGroup = (uid: string, groupId: string) => deleteDoc(doc(db, 'users', uid, 'groups', groupId))

/** Deletes the group and its invite code; members see it as gone. */
export function deleteGroup(uid: string, group: Pick<Group, 'id' | 'code'>) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'groupCodes', group.code))
  batch.delete(doc(db, 'groups', group.id, 'members', uid))
  batch.delete(doc(db, 'groups', group.id))
  batch.delete(doc(db, 'users', uid, 'groups', group.id))
  return batch.commit()
}

export const removeMember = (groupId: string, uid: string) => deleteDoc(doc(db, 'groups', groupId, 'members', uid))
export const setGroupTarget = (groupId: string, targetMinutes: number) => updateDoc(doc(db, 'groups', groupId), { targetMinutes })

/** Keeps my copy of my weekly numbers in a group current. Not awaited. */
export function publishMember(me: Me, group: MyGroup, numbers: Numbers) {
  return setDoc(doc(db, 'groups', group.id, 'members', me.uid), memberDoc(me, group.code, numbers, group.joinedAt))
}
