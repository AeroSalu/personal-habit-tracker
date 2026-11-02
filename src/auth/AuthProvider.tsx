import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { toProfile, type Profile } from '../lib/profile'
import { AuthContext, type AuthState } from './authContext'

type ProfileResult = { uid: string; profile: Profile | null }

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined until Firebase has restored any saved sign-in.
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [result, setResult] = useState<ProfileResult | undefined>(undefined)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  useEffect(() => {
    if (!user) return
    return onSnapshot(
      doc(db, 'users', user.uid),
      { includeMetadataChanges: true },
      (snap) => {
        // On a new device the empty cache answers first; wait for the server before
        // deciding the profile is missing, or a returning user would see setup again.
        if (!snap.exists() && snap.metadata.fromCache) return
        setResult({ uid: user.uid, profile: snap.exists() ? toProfile(snap.data()) : null })
      },
      () => setResult({ uid: user.uid, profile: null }),
    )
  }, [user])

  let state: AuthState
  if (user === undefined) state = { status: 'loading' }
  else if (user === null) state = { status: 'signedOut' }
  else if (result?.uid !== user.uid) state = { status: 'loading' }
  else if (!result.profile) state = { status: 'needsProfile', user }
  else state = { status: 'ready', user, profile: result.profile }

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
