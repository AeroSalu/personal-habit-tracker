import { collection, deleteDoc, doc, limit, query, setDoc, where, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { CHEERS, cheerId, type Activity, type Cheer, type CheerEmoji } from '../lib/friends'
import { useLiveQuery } from './live'

const str = (v: unknown) => (typeof v === 'string' ? v : '')

const toCheer = (id: string, d: DocumentData): Cheer => ({
  id,
  activityId: str(d.activityId),
  owner: str(d.owner),
  uid: str(d.uid),
  emoji: (CHEERS as readonly string[]).includes(d.emoji) ? (d.emoji as CheerEmoji) : '👏',
  at: str(d.at),
})

/** Cheers on one person's items, one listener per person, which is what the rules can check. */
export function useCheersOf(owner: string | null) {
  return useLiveQuery(
    owner ? `cheers:${owner}` : null,
    () => query(collection(db, 'cheers'), where('owner', '==', owner ?? ''), limit(200)),
    toCheer,
  )
}

// Not awaited by screens (see CLAUDE.md); callers attach .catch.

/** Cheers a friend's item, replacing any earlier cheer of mine on it. */
export function cheer(me: string, item: Pick<Activity, 'id' | 'uid'>, emoji: CheerEmoji) {
  return setDoc(doc(db, 'cheers', cheerId(item.id, me)), {
    activityId: item.id,
    owner: item.uid,
    uid: me,
    emoji,
    at: new Date().toISOString(),
  })
}

export function uncheer(me: string, activityId: string) {
  return deleteDoc(doc(db, 'cheers', cheerId(activityId, me)))
}
