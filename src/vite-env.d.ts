/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Public key of the Web Push certificate from the Firebase console; reminders stay off without it. */
  readonly VITE_FIREBASE_VAPID_KEY?: string
}
