import { app } from '../firebase'
import { addToken, removeToken } from './push'

const TOKEN_KEY = 'lockin.pushToken'

export type PushStatus = 'on' | 'off' | 'denied' | 'unsupported' | 'needs-install' | 'not-set-up'

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
const installed = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function deviceToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

/**
 * Whether this device can get reminders, and whether it does. iPhones only allow them for
 * the app added to the Home Screen; the emulators and a build without the VAPID key can't.
 */
export function pushStatus(): PushStatus {
  if (import.meta.env.VITE_USE_EMULATORS === 'true' || !import.meta.env.VITE_FIREBASE_VAPID_KEY) return 'not-set-up'
  if (isIos() && !installed()) return 'needs-install'
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.permission === 'granted' && deviceToken() ? 'on' : 'off'
}

/** Asks permission, gets this device's push token and records it. Firebase Messaging loads only here. */
export async function enablePush(uid: string): Promise<PushStatus> {
  const status = pushStatus()
  if (status !== 'off' && status !== 'on') return status
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging')
  if (!(await isSupported())) return 'unsupported'
  const token = await getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: await navigator.serviceWorker.ready,
  })
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Without storage the device asks again next time; the token itself still works.
  }
  await addToken(uid, token)
  return 'on'
}

export async function disablePush(uid: string) {
  const token = deviceToken()
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing stored.
  }
  if (!token) return
  await removeToken(uid, token).catch(() => undefined)
  const { deleteToken, getMessaging } = await import('firebase/messaging')
  await deleteToken(getMessaging(app)).catch(() => undefined)
}

/** Shows a reminder on this device straight away, to check how they look. */
export async function testReminder() {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('Reminders are on', {
    body: 'This is how Cadence will nudge you.',
    icon: '/icons/icon-192.png',
    tag: 'cadence-test',
    data: { url: '/' },
  })
}
