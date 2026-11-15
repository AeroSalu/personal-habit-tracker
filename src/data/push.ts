import { arrayRemove, arrayUnion, doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { ReminderPrefs, toPlanDoc } from '../lib/reminders'

// Not awaited by screens (see CLAUDE.md); callers attach .catch.

/** The next 48 hours of reminders, which the scheduled sender reads each 15 minutes. */
export function publishPlan(uid: string, plan: ReturnType<typeof toPlanDoc>) {
  return setDoc(
    doc(db, 'pushPlans', uid),
    { ...plan, tz: Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 64), updatedAt: new Date().toISOString() },
    // Replaces these fields whole (a plain merge would keep old slots inside items) and keeps tokens.
    { mergeFields: ['slots', 'items', 'tz', 'updatedAt'] },
  )
}

/** This device's push token; the sender removes tokens that stop working. */
export function addToken(uid: string, token: string) {
  return setDoc(doc(db, 'pushPlans', uid), { tokens: arrayUnion(token), updatedAt: new Date().toISOString() }, { merge: true })
}

export function removeToken(uid: string, token: string) {
  return setDoc(doc(db, 'pushPlans', uid), { tokens: arrayRemove(token), updatedAt: new Date().toISOString() }, { merge: true })
}

/** Your reminder settings, shared by all your devices. */
export function setReminderPrefs(uid: string, prefs: ReminderPrefs) {
  return updateDoc(doc(db, 'users', uid), { reminders: prefs })
}
