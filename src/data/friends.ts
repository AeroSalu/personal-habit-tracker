import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase'
import { pairId, requestId, type Activity, type ActivityKind, type FriendRequest, type Friendship } from '../lib/friends'
import type { PublicStats } from '../lib/social'
import { useLiveDocs, useLiveQuery } from './live'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown) => (typeof v === 'number' ? v : 0)

export type PublicProfile = { uid: string; username: string; displayName: string; level: number; photo: string }

const toRequest = (id: string, d: DocumentData): FriendRequest => ({
  id,
  from: str(d.from),
  to: str(d.to),
  fromUsername: str(d.fromUsername),
  fromName: str(d.fromName),
  toUsername: str(d.toUsername),
  status: d.status === 'declined' ? 'declined' : 'pending',
  createdAt: str(d.createdAt),
})

const toFriendship = (id: string, d: DocumentData): Friendship => ({
  id,
  members: [str(d.members?.[0]), str(d.members?.[1])],
  since: str(d.since),
})

export const toPublicProfile = (id: string, d: DocumentData): PublicProfile => ({
  uid: id,
  username: str(d.username),
  displayName: str(d.displayName),
  level: num(d.level) || 1,
  photo: str(d.photo),
})

export const toStats = (_id: string, d: DocumentData): PublicStats => ({
  level: num(d.level) || 1,
  xp: num(d.xp),
  badges: Array.isArray(d.badges) ? d.badges.filter((b: unknown): b is string => typeof b === 'string') : [],
  weekKey: str(d.weekKey),
  weekXp: num(d.weekXp),
  weekFocusMinutes: num(d.weekFocusMinutes),
  weekFocusByDay:
    Array.isArray(d.weekFocusByDay) && d.weekFocusByDay.length === 7
      ? d.weekFocusByDay.map((m: unknown) => (typeof m === 'number' ? m : 0))
      : [0, 0, 0, 0, 0, 0, 0],
  seasonKey: str(d.seasonKey),
  seasonXp: num(d.seasonXp),
  streak: num(d.streak),
  focusing: d.focusing && typeof d.focusing.until === 'string' ? { until: d.focusing.until } : null,
  bio: str(d.bio),
  pinned: Array.isArray(d.pinned) ? d.pinned.filter((b: unknown): b is string => typeof b === 'string') : [],
  updatedAt: str(d.updatedAt),
})

const KINDS: ActivityKind[] = ['task', 'habit', 'badge', 'level']
const toActivity = (id: string, d: DocumentData): Activity => ({
  id,
  uid: str(d.uid),
  kind: KINDS.includes(d.kind) ? d.kind : 'task',
  title: str(d.title),
  at: str(d.at),
})

export const useIncomingRequests = (uid: string) =>
  useLiveQuery(`in:${uid}`, () => query(collection(db, 'friendRequests'), where('to', '==', uid)), toRequest)

export const useOutgoingRequests = (uid: string) =>
  useLiveQuery(`out:${uid}`, () => query(collection(db, 'friendRequests'), where('from', '==', uid)), toRequest)

export const useFriendships = (uid: string) =>
  useLiveQuery(`friends:${uid}`, () => query(collection(db, 'friendships'), where('members', 'array-contains', uid)), toFriendship)

export const useProfiles = (uids: string[]) => useLiveDocs(uids.map((u) => `profiles/${u}`), toPublicProfile)
export const useStats = (uids: string[]) => useLiveDocs(uids.map((u) => `stats/${u}`), toStats)

/** One listener per person, which is what the rules can check: only friends' items are readable. */
export function useActivityOf(uid: string) {
  return useLiveQuery(
    `activity:${uid}`,
    () => query(collection(db, 'activity'), where('uid', '==', uid), orderBy('at', 'desc'), limit(20)),
    toActivity,
  )
}

/** Looks a username up on the server; null when nobody holds it. */
export async function findByUsername(name: string): Promise<PublicProfile | null> {
  const held = await getDocFromServer(doc(db, 'usernames', name))
  if (!held.exists()) return null
  const uid = str(held.data().uid)
  const profile = await getDocFromServer(doc(db, 'profiles', uid))
  return profile.exists() ? toPublicProfile(uid, profile.data()) : null
}

export function sendRequest(me: { uid: string; username: string; displayName: string }, to: PublicProfile) {
  return setDoc(doc(db, 'friendRequests', requestId(me.uid, to.uid)), {
    from: me.uid,
    to: to.uid,
    fromUsername: me.username,
    fromName: me.displayName,
    toUsername: to.username,
    status: 'pending',
    createdAt: new Date().toISOString(),
  })
}

export const withdrawRequest = (r: FriendRequest) => deleteDoc(doc(db, 'friendRequests', r.id))
export const declineRequest = (r: FriendRequest) => updateDoc(doc(db, 'friendRequests', r.id), { status: 'declined' })

/**
 * Becomes friends and clears the request together. If we had both asked each other, my own
 * request to them is cleared too, so it doesn't linger.
 */
export function acceptRequest(me: string, r: FriendRequest, crossed?: FriendRequest) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'friendships', pairId(me, r.from)), { members: [me, r.from].sort(), since: new Date().toISOString() })
  batch.delete(doc(db, 'friendRequests', r.id))
  if (crossed) batch.delete(doc(db, 'friendRequests', crossed.id))
  return batch.commit()
}

export const unfriend = (me: string, them: string) => deleteDoc(doc(db, 'friendships', pairId(me, them)))
