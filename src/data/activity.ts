import { doc, setDoc, type WriteBatch } from 'firebase/firestore'
import { db } from '../firebase'
import type { ActivityKind } from '../lib/friends'

type Item = { uid: string; kind: ActivityKind; title: string; at: string }

const tidy = (item: Item) => ({ ...item, title: item.title.trim().slice(0, 120) || 'Untitled' })

/** Adds posting an activity item to a batch, so it lands with the change that caused it. */
export function postInBatch(batch: WriteBatch, id: string, item: Item) {
  batch.set(doc(db, 'activity', id), tidy(item))
}

export function removeInBatch(batch: WriteBatch, id: string) {
  batch.delete(doc(db, 'activity', id))
}

/** Posts on its own, for badges and level-ups. The fixed ID makes repeats harmless. */
export function postActivity(id: string, item: Item) {
  return setDoc(doc(db, 'activity', id), tidy(item))
}
