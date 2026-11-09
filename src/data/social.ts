import { doc, getDocFromServer, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import type { PublicStats } from '../lib/social'

export class UsernameTaken extends Error {}

/**
 * Claims a username, releases the old one, and updates the public and private profiles in
 * one batch. Unlike other writes this one is awaited, because only the server can say
 * whether a name is free; it fails without a connection.
 */
export async function claimUsername(
  uid: string,
  name: string,
  previous: string,
  card: { displayName: string; level: number },
) {
  const existing = await getDocFromServer(doc(db, 'usernames', name))
  if (existing.exists() && existing.data().uid !== uid) throw new UsernameTaken()

  const batch = writeBatch(db)
  if (!existing.exists()) batch.set(doc(db, 'usernames', name), { uid })
  if (previous && previous !== name) batch.delete(doc(db, 'usernames', previous))
  batch.set(doc(db, 'profiles', uid), {
    username: name,
    displayName: card.displayName.trim(),
    level: card.level,
    updatedAt: new Date().toISOString(),
  })
  batch.update(doc(db, 'users', uid), { username: name })
  await batch.commit()
}

// Published summaries are not awaited: the cache sends them when there's signal.
export function publishProfile(uid: string, card: { username: string; displayName: string; level: number }) {
  return setDoc(doc(db, 'profiles', uid), { ...card, displayName: card.displayName.trim(), updatedAt: new Date().toISOString() })
}

export function publishStats(uid: string, stats: Omit<PublicStats, 'updatedAt'>) {
  return setDoc(doc(db, 'stats', uid), { ...stats, updatedAt: new Date().toISOString() })
}

export function setBadgeAlerts(uid: string, on: boolean) {
  return updateDoc(doc(db, 'users', uid), { badgeAlerts: on })
}

export function setShareAchievements(uid: string, share: boolean) {
  return updateDoc(doc(db, 'users', uid), { shareAchievements: share })
}
