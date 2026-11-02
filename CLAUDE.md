# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Lock In

Habit tracker PWA. Vanilla HTML, CSS and JS with no build step, on Firebase Auth, Firestore and Hosting. There is no lint step and no `package.json`.

## Rules

- The app must stay free: only use what Firebase's Spark plan includes. No SMS, Cloud Functions, or anything needing billing.
- Keep `public/logic.js` free of Firebase and DOM code, and cover rule changes in `tests/logic.test.js`.
- Bump `CACHE` in `public/sw.js` on every shipped change, and add new files to `FILES`.
- `/__/auth/` must stay out of the service worker cache, or sign-in breaks.
- Firebase config comes from `/__/firebase/init.js`, so the app only runs through Hosting or the emulators. Opening `index.html` directly or using a plain static server won't work.

## Commands

- Run locally: `firebase emulators:start --project demo-lockin`, then open http://127.0.0.1:5000
- Test: `node tests/logic.test.js`. Tests are entries in one `tests` object, with no runner or filter, so to run a single test, temporarily remove the others.
- Icons: `node tools/make-icons.js` (writes the PNGs in `public/icons/`)
- Deploy: `firebase deploy`. `.firebaserc` defaults to the `demo-lockin` emulator project, so run `firebase use <project-id>` against the real project first.

## Architecture

Everything served is in `public/`. Scripts are classic deferred tags in `index.html`, and each file exposes one global, so load order matters: Firebase SDK, `init.js`, then `Logic`, `Store`, `Auth`, `Focus`, and `app.js` last.

- **Data flow:** `app.js` keeps `tasks` and `completions` in memory, fed by the Firestore listeners in `Store.watch`. Any change redraws `#app` from those arrays. Screens never update the DOM after a save; they write and wait for the listener.
- **Writes aren't awaited:** Firestore's offline cache fires listeners immediately and syncs later, so awaiting a write would hang without signal. Screens only attach `.catch` to report failures.
- **Forms live in `#sheet`, outside `#app`:** a sync redraws `#app`, so anything in it would lose what's being typed.
- **Focus timer:** `focus.js` runs in its own `#focus` overlay and saves its end time to `localStorage`, so it resumes after a reload. A timer that expired while away still completes the task, using the original end time as `completedAt`. `app.js` calls `Focus.resume` once both listeners have delivered, because finishing needs the task loaded.
- **Sign-in:** `auth.js` uses a redirect on phones and in the installed app, and a popup on desktop.

## Data

`users/{uid}/tasks/{taskId}` and `users/{uid}/completions/{taskId_YYYY-MM-DD}`. The completion ID allows one per task per day and makes undo a delete. `dayKey` is the device's local date, and `completedAt` is an ISO string from the device clock so offline ticks keep their real time. `schedule.days` uses `Date.getDay` values (0 is Sunday), while weeks run Monday to Sunday.
