import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase'
import { makeCode } from '../lib/leaderboard'
import type { RoomMember, RoomSession, RoomState } from '../lib/rooms'
import { useLiveDocs, useLiveQuery } from './live'
import { useUserCollection } from './useCollection'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown) => (typeof v === 'number' ? v : 0)

export type MyRoom = { id: string; name: string; code: string; joinedAt: string }
export type Room = { id: string; name: string; hostUid: string; code: string; goalMinutes: number; session: RoomSession | null }

const toMyRoom = (id: string, d: DocumentData): MyRoom => ({ id, name: str(d.name), code: str(d.code), joinedAt: str(d.joinedAt) })
const toRoom = (id: string, d: DocumentData): Room => ({
  id,
  name: str(d.name),
  hostUid: str(d.hostUid),
  code: str(d.code),
  goalMinutes: num(d.goalMinutes),
  session:
    d.session && typeof d.session.endsAt === 'string'
      ? { startedAt: str(d.session.startedAt), endsAt: d.session.endsAt, minutes: num(d.session.minutes) }
      : null,
})
const STATES: RoomState[] = ['idle', 'focusing', 'break']
const toMember = (id: string, d: DocumentData): RoomMember => ({
  uid: id,
  displayName: str(d.displayName),
  username: str(d.username),
  state: STATES.includes(d.state) ? d.state : 'idle',
  heartbeatAt: str(d.heartbeatAt),
  minutes: num(d.minutes),
})

export const useMyRooms = (uid: string) => useUserCollection(uid, 'rooms', toMyRoom)
export const useRooms = (ids: string[]) => useLiveDocs(ids.map((id) => `rooms/${id}`), toRoom)
export const useRoomMembers = (rid: string | null) =>
  useLiveQuery(rid ? `roomMembers:${rid}` : null, () => collection(db, 'rooms', rid!, 'members'), toMember)

type Me = { uid: string; username: string; displayName: string }

function memberDoc(me: Me, code: string, now: string) {
  return {
    uid: me.uid,
    displayName: me.displayName.trim().slice(0, 40),
    username: me.username,
    code,
    joinedAt: now,
    state: 'idle',
    heartbeatAt: now,
    minutes: 0,
  }
}

/** Opens a room with a fresh code, with me as host and first member. Awaited, like groups. */
export async function createRoom(me: Me, name: string, goalMinutes: number): Promise<{ id: string; code: string }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeCode()
    if ((await getDocFromServer(doc(db, 'roomCodes', code))).exists()) continue
    const ref = doc(collection(db, 'rooms'))
    const now = new Date().toISOString()
    const batch = writeBatch(db)
    batch.set(ref, { name: name.trim(), hostUid: me.uid, code, goalMinutes, session: null, createdAt: now })
    batch.set(doc(db, 'roomCodes', code), { roomId: ref.id, name: name.trim() })
    batch.set(doc(db, 'rooms', ref.id, 'members', me.uid), memberDoc(me, code, now))
    batch.set(doc(db, 'users', me.uid, 'rooms', ref.id), { name: name.trim(), code, joinedAt: now })
    await batch.commit()
    return { id: ref.id, code }
  }
  throw new Error('Could not find a free room code. Try again.')
}

export async function findRoomByCode(code: string): Promise<{ roomId: string; name: string } | null> {
  const snap = await getDocFromServer(doc(db, 'roomCodes', code))
  return snap.exists() ? { roomId: str(snap.data().roomId), name: str(snap.data().name) } : null
}

export async function joinRoom(me: Me, roomId: string, code: string, name: string) {
  const now = new Date().toISOString()
  const batch = writeBatch(db)
  batch.set(doc(db, 'rooms', roomId, 'members', me.uid), memberDoc(me, code, now))
  batch.set(doc(db, 'users', me.uid, 'rooms', roomId), { name, code, joinedAt: now })
  await batch.commit()
}

export function leaveRoom(uid: string, roomId: string) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'rooms', roomId, 'members', uid))
  batch.delete(doc(db, 'users', uid, 'rooms', roomId))
  return batch.commit()
}

export const forgetRoom = (uid: string, roomId: string) => deleteDoc(doc(db, 'users', uid, 'rooms', roomId))

export function closeRoom(uid: string, room: Pick<Room, 'id' | 'code'>) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'roomCodes', room.code))
  batch.delete(doc(db, 'rooms', room.id, 'members', uid))
  batch.delete(doc(db, 'rooms', room.id))
  batch.delete(doc(db, 'users', uid, 'rooms', room.id))
  return batch.commit()
}

export const removeRoomMember = (roomId: string, uid: string) => deleteDoc(doc(db, 'rooms', roomId, 'members', uid))
export const setRoomSession = (roomId: string, session: RoomSession | null) => updateDoc(doc(db, 'rooms', roomId), { session })
export const setRoomGoal = (roomId: string, goalMinutes: number) => updateDoc(doc(db, 'rooms', roomId), { goalMinutes })

/** Presence: my state in the room and when I was last seen. Not awaited. */
export function heartbeat(roomId: string, uid: string, state: RoomState) {
  return updateDoc(doc(db, 'rooms', roomId, 'members', uid), { state, heartbeatAt: new Date().toISOString() })
}

/**
 * Sets my focus total in the room to the sum of my saved sessions there. A total rather than
 * an increment, so repeating it after a reload never counts a session twice.
 */
export function setRoomMinutes(roomId: string, uid: string, total: number) {
  return updateDoc(doc(db, 'rooms', roomId, 'members', uid), { minutes: Math.max(0, Math.round(total)) })
}
