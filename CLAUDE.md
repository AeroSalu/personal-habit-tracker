# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# LOCKIN

Productivity PWA in React + Vite + TypeScript on Firebase Auth, Firestore and Hosting. The P0 modules are built: Dashboard, Tasks, Calendar, Focus, Habits. Later phases (gamification badges, analytics, social and focus rooms, AI coach) show as "Soon" in the navigation. Live at https://lockin-habits-aerosalu.firebaseapp.com (project `lockin-habits-aerosalu`); use that address, not `.web.app`, because it matches `authDomain`.

## Rules

- The app must stay free: only use what Firebase's Spark plan includes. No SMS, Cloud Functions, or anything needing billing.
- XP, levels, streaks and scores are derived from stored records in pure functions, never stored, so they stay testable and can't be double-claimed.
- Writes are not awaited by screens: Firestore's offline cache updates listeners at once and syncs later, so awaiting would hang without signal. Only attach `.catch` to report failures.
- Firebase's sign-in handler lives under `/__/`; the service worker must never serve the app shell there (`navigateFallbackDenylist` in `vite.config.ts`).
- Use the design tokens in `src/styles/global.css`, never raw colors; light theme will come by redefining those tokens.

## Commands

- Dev: `npm run emulators` in one terminal, `npm run dev` in another, then open http://127.0.0.1:5173 (not `localhost`: Google sign-in by redirect fails across the two hostnames). `.env.development` points dev at the `demo-lockin` emulators, never the live project.
- Test: `npm test` (Vitest, `src/**/*.test.ts`); one file with `npx vitest run src/lib/habits.test.ts`, one test with `-t "name"`
- Lint and type-check: `npm run lint`, `npm run build`
- Icons: `node tools/make-icons.cjs` (writes `public/icons/`)
- Deploy: `firebase deploy` (its predeploy runs `npm run build`; Hosting serves `dist/` with an SPA rewrite, and `sw.js` and `index.html` are served `no-cache` so updates reach installed apps)

## Architecture

- `src/firebase.ts` creates the app, auth and Firestore (persistent multi-tab cache) from `VITE_FIREBASE_*` env values, and connects to the emulators when `VITE_USE_EMULATORS=true`. `.env` holds the live web config, which is public by design.
- `src/app/nav.ts` is the single navigation list. The desktop sidebar (1024px and up), phone bottom bar and phone More page are all built from it; entries without a `path` are later-phase modules shown as "Soon".
- `src/auth/AuthProvider.tsx` combines the Firebase user and the `users/{uid}` profile document into one `AuthState`: `loading`, `signedOut`, `needsProfile` or `ready`. `App.tsx` gates on it (sign-in page, then first-time setup, then the app), so every screen inside the app can call `useSignedIn()` and rely on a profile existing.
- A missing profile is only believed once the server confirms it, not from an empty local cache, or a returning user on a new device would be sent to setup.
- Google sign-in uses a redirect on phones and in the installed app, and a popup on desktop (`src/auth/authActions.ts`). `redirectError` is read once at startup.
- Routes live in `src/app/App.tsx`, all inside `AppLayout`.
- Shared buttons, inputs and chips are classes in `src/components/ui.module.css`; screens compose them rather than restyling controls. `Dialog` (native `<dialog>`, a bottom sheet on phones) and `useToast` are the shared overlays; the toast provider wraps the whole app.
- Layering: `src/lib/` holds pure rules with tests (no React, no Firebase); `src/data/` holds Firestore mappers, live hooks (`useUserCollection`) and write functions; feature folders such as `src/habits/` hold screens. Mappers fill gaps in stored documents so older data still loads.
- Focus: `src/lib/focus.ts` is a pure state machine over timestamps (focus, summary, break, breakOver), with `now` always passed in. `src/focus/FocusProvider.tsx` wraps the signed-in app and owns the running session: it ticks the clock, saves the state to `localStorage` so a reload resumes it (an expired phase resolves to its real end time), turns `visibilitychange` into leaves (strict mode stops a session left for over 30 seconds, at the moment of leaving), holds a wake lock, plays Web Audio ambient sound and the chime, and writes the finished session once (`saveSession` is idempotent and never touches the note). It renders `FocusOverlay` above everything while a session or break runs. Read visibility in the event handler, not inside a state updater.
- `useNow()` refreshes every minute and when the app returns to the foreground; screens derive "today" from it so day changes don't need a reload.

## Data

All user data sits under `users/{uid}/…`, and `firestore.rules` allows only that signed-in user. `dayKey` is the device's local YYYY-MM-DD date, and timestamps are ISO strings from the device clock so offline actions keep their real time.

- `users/{uid}`: profile (`displayName`, `dailyFocusGoalMinutes`, `createdAt`)
- `habits/{id}`: `name`, `category`, `schedule` (`{type:'days', days}` with `Date.getDay` numbers, or `{type:'count', perWeek}`), `usualTime`, `targetNote`, `archived`, `createdAt`
- `habitLogs/{habitId_dayKey}`: `habitId`, `dayKey`, `completedAt`, `note`. The ID allows one per habit per day and makes undo a delete.
- `tasks/{id}`: `title`, `description`, `category`, `priority` (urgent, high, medium, low), `status` (todo, in_progress, done), `dueDate` (day key or ''), `dueTime` ("HH:MM" or ''), `subtasks` (array of `{id, title, done}`), `recurrence` (`{type:'none'|'daily'|'weekly'}` or `{type:'custom', days}`), `estimateMinutes`, `order`, `createdAt`, `completedAt`, `nextTaskId`
- `sessions/{id}`: `taskId`, `habitId`, `title`, `preset`, `plannedMinutes`, `minutes` (focused, excluding pauses), `pausedMinutes`, `startedAt`, `endedAt`, `dayKey`, `outcome` (completed or stopped), `leaves` (`{at, seconds}` each time the app went to the background), `note`. Sessions under a minute aren't saved.

Repeating tasks keep one live instance. Completing one creates the next in the same batch (`completeTask` in `src/data/tasks.ts`) and records its ID in `nextTaskId`; reopening deletes that next instance unless it has been worked on. Any status change into or out of done must go through those two functions, not a plain update.

Dashboard rules (`src/lib/dashboard.ts`), all derived on read:
- Lock-in day: any completed focus session, habit tick or completed task. The streak counts consecutive days; today extends it but can't break it.
- XP: 10 per completed task (once per task, lost if reopened), 10 per habit tick, 20 per completed session (capped at 8 a day; stopped sessions earn nothing), 50 per day where everything due was done on time (tasks finished late never earn their day the bonus). Level n needs 100·n more XP than level n−1.
- Productivity score: 40% focus goal, 35% tasks due today or overdue, 25% habits due; a part with nothing due hands its weight to the others.

Streak rules (`src/lib/habits.ts`): exact-day habits count scheduled days in a row; weekly-count habits count weeks reaching the number; a day or week still in progress can extend a streak but never breaks it.
