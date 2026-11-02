# Lock In

Habit tracker PWA. Vanilla HTML, CSS and JS with no build step, on Firebase Auth, Firestore and Hosting.

## Rules

- The app must stay free: only use what Firebase's Spark plan includes. No SMS, Cloud Functions, or anything needing billing.
- Keep `public/logic.js` free of Firebase and DOM code, and cover rule changes in `tests/logic.test.js`.
- Bump `CACHE` in `public/sw.js` on every shipped change, and add new files to `FILES`.
- `/__/auth/` must stay out of the service worker cache, or sign-in breaks.
- Firebase config comes from `/__/firebase/init.js`, so the app only runs through Hosting or the emulators.

## Commands

- Run locally: `firebase emulators:start --project demo-lockin`, then open http://127.0.0.1:5000
- Test: `node tests/logic.test.js`
- Icons: `node tools/make-icons.js`
- Deploy: `firebase deploy`

## Data

`users/{uid}/tasks/{taskId}` and `users/{uid}/completions/{taskId_YYYY-MM-DD}`. The completion ID allows one per task per day. `dayKey` is the device's local date.
