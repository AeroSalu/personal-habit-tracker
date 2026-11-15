import { doc, setDoc, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { MAX_FOCUS, MAX_NOTE, MAX_WINS, type DayRecord, type WeekRecord } from '../lib/plan'
import { useUserCollection } from './useCollection'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const strs = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max) : [])

const toDay = (id: string, d: DocumentData): DayRecord => ({
  key: id,
  plannedAt: str(d.plannedAt),
  reviewedAt: str(d.reviewedAt),
  rating: typeof d.rating === 'number' && d.rating >= 1 && d.rating <= 5 ? d.rating : 0,
  note: str(d.note).slice(0, MAX_NOTE),
  wins: strs(d.wins, MAX_WINS),
})

const toWeek = (id: string, d: DocumentData): WeekRecord => ({
  key: id,
  reviewedAt: str(d.reviewedAt),
  note: str(d.note).slice(0, MAX_NOTE),
  focus: strs(d.focus, MAX_FOCUS),
})

/** users/{uid}/days and /weeks, keyed by the day and by the week's Monday. */
export const useDays = (uid: string) => useUserCollection(uid, 'days', toDay)
export const useWeeks = (uid: string) => useUserCollection(uid, 'weeks', toWeek)

// Not awaited by screens (see CLAUDE.md); merged so each step only touches its own fields.

export function markPlanned(uid: string, key: string) {
  return setDoc(doc(db, 'users', uid, 'days', key), { plannedAt: new Date().toISOString() }, { merge: true })
}

export function saveDayReview(uid: string, key: string, review: Pick<DayRecord, 'rating' | 'note' | 'wins'>) {
  return setDoc(
    doc(db, 'users', uid, 'days', key),
    {
      rating: review.rating,
      note: review.note.trim().slice(0, MAX_NOTE),
      wins: review.wins.map((w) => w.trim()).filter(Boolean).slice(0, MAX_WINS),
      reviewedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

export function saveWeekReview(uid: string, key: string, note: string) {
  return setDoc(doc(db, 'users', uid, 'weeks', key), { note: note.trim().slice(0, MAX_NOTE), reviewedAt: new Date().toISOString() }, { merge: true })
}

/** The focus tasks picked for a week (its Monday's key), shown at the top of Today. */
export function setWeekFocus(uid: string, key: string, focus: string[]) {
  return setDoc(doc(db, 'users', uid, 'weeks', key), { focus: focus.slice(0, MAX_FOCUS) }, { merge: true })
}
