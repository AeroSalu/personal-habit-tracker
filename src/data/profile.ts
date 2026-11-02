import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { ProfileFields } from '../lib/profile'

// Not awaited by callers: the local cache updates the profile listener immediately.
export function createProfile(uid: string, fields: ProfileFields) {
  return setDoc(doc(db, 'users', uid), {
    displayName: fields.displayName.trim(),
    dailyFocusGoalMinutes: fields.dailyFocusGoalMinutes,
    createdAt: new Date().toISOString(),
  })
}

export function updateProfile(uid: string, fields: ProfileFields) {
  return setDoc(
    doc(db, 'users', uid),
    { displayName: fields.displayName.trim(), dailyFocusGoalMinutes: fields.dailyFocusGoalMinutes },
    { merge: true },
  )
}
