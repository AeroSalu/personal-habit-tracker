import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { Profile } from '../lib/profile'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'needsProfile'; user: User }
  | { status: 'ready'; user: User; profile: Profile }

export const AuthContext = createContext<AuthState>({ status: 'loading' })

export const useAuth = () => useContext(AuthContext)

/** For screens behind the sign-in gate, which only render once the profile exists. */
export function useSignedIn() {
  const state = useAuth()
  if (state.status !== 'ready') throw new Error('useSignedIn used outside the signed-in app')
  return state
}
