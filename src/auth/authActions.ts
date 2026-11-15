import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth } from '../firebase'

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address does not look right.',
  'auth/missing-email': 'Enter your email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/weak-password': 'Use a password of at least 6 characters.',
  'auth/too-many-requests': 'Too many tries. Wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Check your signal and try again.',
  'auth/account-exists-with-different-credential':
    'That email already has an account. Sign in with your password.',
  'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups and try again.',
  'auth/operation-not-allowed': 'This sign-in method is turned off for now.',
  'auth/configuration-not-found': 'Sign-in is not set up for this app yet.',
}

const IGNORED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])

/** A plain-language message, or '' when the person simply closed the Google window. */
export function authMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  if (IGNORED.has(code)) return ''
  return MESSAGES[code] ?? 'Sign-in failed. Please try again.'
}

// Phones and the installed app return from Google by redirect; this resolves once,
// with a message if that return failed.
export const redirectError: Promise<string> = getRedirectResult(auth).then(
  () => '',
  (err) => authMessage(err),
)

function usesRedirect() {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone
  return Boolean(standalone) || /android|iphone|ipad|ipod/i.test(navigator.userAgent)
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  if (usesRedirect()) await signInWithRedirect(auth, provider)
  else await signInWithPopup(auth, provider)
}

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password)

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

export const signOut = () => firebaseSignOut(auth)

/**
 * Signs in again before something sensitive, such as deleting the account, which Firebase
 * only allows shortly after a sign-in. Google accounts get a popup; others type their password.
 */
export async function confirmIdentity(user: User, password: string) {
  if (user.providerData.some((p) => p.providerId === 'google.com')) {
    await reauthenticateWithPopup(user, new GoogleAuthProvider())
  } else {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', password))
  }
}
