import { deleteUser, type User } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  query,
  where,
  writeBatch,
  type DocumentReference,
  type Query,
} from 'firebase/firestore'
import { db } from '../firebase'
import { closeRoom, leaveRoom } from './rooms'
import { deleteGroup, leaveGroup } from './groups'

/** Everything under users/{uid}. A new private collection must be added here too. */
export const PRIVATE_COLLECTIONS = ['tasks', 'habits', 'habitLogs', 'sessions', 'taskTemplates', 'days', 'weeks', 'groups', 'rooms'] as const

/** The shared documents that are about this person, found by the queries the rules allow. */
function sharedQueries(uid: string): Record<string, Query> {
  return {
    activity: query(collection(db, 'activity'), where('uid', '==', uid)),
    cheersGiven: query(collection(db, 'cheers'), where('uid', '==', uid)),
    cheersReceived: query(collection(db, 'cheers'), where('owner', '==', uid)),
    friendships: query(collection(db, 'friendships'), where('members', 'array-contains', uid)),
    requestsSent: query(collection(db, 'friendRequests'), where('from', '==', uid)),
    requestsReceived: query(collection(db, 'friendRequests'), where('to', '==', uid)),
  }
}

/** One file with all of a person's data, for "Download my data". */
export async function exportData(uid: string, username: string) {
  const rows = async (q: Query) => (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }))
  const one = async (path: string) => {
    const snap = await getDoc(doc(db, path))
    return snap.exists() ? snap.data() : null
  }
  const mine: Record<string, unknown> = {}
  for (const name of PRIVATE_COLLECTIONS) mine[name] = await rows(collection(db, 'users', uid, name))
  const shared: Record<string, unknown> = {
    publicProfile: await one(`profiles/${uid}`),
    statsFriendsSee: await one(`stats/${uid}`),
  }
  for (const [name, q] of Object.entries(sharedQueries(uid))) shared[name] = await rows(q)
  return {
    app: 'Cadence',
    exportedAt: new Date().toISOString(),
    account: { uid, username },
    profile: await one(`users/${uid}`),
    ...mine,
    shared,
  }
}

/** Deletes in batches of at most 450, under Firestore's 500-writes-per-batch limit. */
async function deleteAll(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db)
    for (const ref of refs.slice(i, i + 450)) batch.delete(ref)
    await batch.commit()
  }
}

/**
 * Deletes the account and everything in it. The caller must have just signed in again, which
 * Firebase requires before deleting an account. Order matters: shared documents go first, while
 * the person is still signed in and the rules can still tell they're the owner; groups and
 * rooms they run are closed (members see them as gone); then the private data; then the login.
 */
export async function deleteAccount(user: User, username: string) {
  const uid = user.uid

  for (const g of (await getDocsFromServer(collection(db, 'users', uid, 'groups'))).docs) {
    const group = await getDoc(doc(db, 'groups', g.id)).catch(() => null)
    const data = group?.exists() ? group.data() : null
    if (data && data.ownerUid === uid) await deleteGroup(uid, { id: g.id, code: String(data.code) })
    else await leaveGroup(uid, g.id)
  }
  for (const r of (await getDocsFromServer(collection(db, 'users', uid, 'rooms'))).docs) {
    const room = await getDoc(doc(db, 'rooms', r.id)).catch(() => null)
    const data = room?.exists() ? room.data() : null
    if (data && data.hostUid === uid) await closeRoom(uid, { id: r.id, code: String(data.code) })
    else await leaveRoom(uid, r.id)
  }

  const shared: DocumentReference[] = []
  for (const q of Object.values(sharedQueries(uid))) shared.push(...(await getDocsFromServer(q)).docs.map((d) => d.ref))
  shared.push(doc(db, 'stats', uid), doc(db, 'profiles', uid))
  if (username) shared.push(doc(db, 'usernames', username))
  // A cheer I gave on my own friendship's item can show up twice; delete each once.
  const seen = new Set<string>()
  await deleteAll(shared.filter((r) => (seen.has(r.path) ? false : (seen.add(r.path), true))))

  const own: DocumentReference[] = []
  for (const name of PRIVATE_COLLECTIONS) own.push(...(await getDocsFromServer(collection(db, 'users', uid, name))).docs.map((d) => d.ref))
  own.push(doc(db, 'users', uid))
  await deleteAll(own)

  await deleteUser(user)
}
