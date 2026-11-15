/// <reference lib="webworker" />
// The app's service worker: caches the app for offline use (as before) and shows reminders.
// Built by vite-plugin-pwa (injectManifest), which fills in self.__WB_MANIFEST.

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null })[] }

// Updates take over straight away, so installed apps get new versions on the next open.
self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Every page of the app is index.html, except Firebase's sign-in handler under /__/.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/__\//] }))

type Reminder = { title?: string; body?: string; url?: string; tag?: string }

// A reminder from the scheduled sender. FCM delivers data messages as { data: {...} }.
self.addEventListener('push', (event) => {
  let raw: Record<string, unknown> = {}
  try {
    raw = event.data?.json() ?? {}
  } catch {
    raw = {}
  }
  const r = ((raw.data as Reminder | undefined) ?? (raw as Reminder)) || {}
  if (!r.title) return
  event.waitUntil(
    self.registration.showNotification(r.title, {
      body: r.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: r.tag || undefined,
      data: { url: r.url && r.url.startsWith('/') ? r.url : '/' },
    }),
  )
})

// Tapping a reminder opens the app at the right screen, reusing an open window if there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data as { url?: string } | null)?.url ?? '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (open) {
        await open.focus()
        await open.navigate(url).catch(() => undefined)
      } else {
        await self.clients.openWindow(url)
      }
    })(),
  )
})
