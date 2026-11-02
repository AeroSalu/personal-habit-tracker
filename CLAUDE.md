# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# LOCKIN

Productivity app: tasks, habits, focus sessions and (later) gamification, social and an AI coach. Mid-rebuild from a vanilla JS PWA (`legacy/`) to React + Vite + TypeScript (`src/`), following the P0 plan: scaffold → auth → habits → tasks and calendar → focus → dashboard → remove `legacy/`.

## Rules

- The app must stay free: only use what Firebase's Spark plan includes. No SMS, Cloud Functions, or anything needing billing.
- XP, levels, streaks and scores are derived from stored records in pure functions, never stored, so they stay testable and can't be double-claimed.
- Writes are not awaited by screens: Firestore's offline cache updates listeners at once and syncs later, so awaiting would hang without signal. Only attach `.catch` to report failures.
- Firebase's sign-in handler lives under `/__/`; the service worker must never serve the app shell there (`navigateFallbackDenylist` in `vite.config.ts`).
- Use the design tokens in `src/styles/global.css`, never raw colors; light theme will come by redefining those tokens.

## Commands

- Dev: `npm run emulators` in one terminal, `npm run dev` in another, then open http://127.0.0.1:5173 (not `localhost`: Google sign-in by redirect fails across the two hostnames). `.env.development` points dev at the `demo-lockin` emulators, never the live project.
- Test: `npm test` (Vitest, `src/**/*.test.ts`); one file with `npx vitest run src/lib/streak.test.ts`, one test with `-t "name"`
- Lint and type-check: `npm run lint`, `npm run build`
- Icons: `node tools/make-icons.cjs` (writes `public/icons/`)
- Deploy: `firebase deploy`. Hosting still serves `legacy/` until the rebuild reaches parity; then `firebase.json` switches to `dist/`.

## Architecture

- `src/firebase.ts` creates the app, auth and Firestore (persistent multi-tab cache) from `VITE_FIREBASE_*` env values, and connects to the emulators when `VITE_USE_EMULATORS=true`. `.env` holds the live web config, which is public by design.
- `src/app/nav.ts` is the single navigation list. The desktop sidebar (1024px and up), phone bottom bar and phone More page are all built from it; entries without a `path` are later-phase modules shown as "Soon".
- `src/auth/AuthProvider.tsx` combines the Firebase user and the `users/{uid}` profile document into one `AuthState`: `loading`, `signedOut`, `needsProfile` or `ready`. `App.tsx` gates on it (sign-in page, then first-time setup, then the app), so every screen inside the app can call `useSignedIn()` and rely on a profile existing.
- A missing profile is only believed once the server confirms it, not from an empty local cache, or a returning user on a new device would be sent to setup.
- Google sign-in uses a redirect on phones and in the installed app, and a popup on desktop (`src/auth/authActions.ts`). `redirectError` is read once at startup.
- Routes live in `src/app/App.tsx`, all inside `AppLayout`.
- Shared buttons, inputs and chips are classes in `src/components/ui.module.css`; screens compose them rather than restyling controls. `Dialog` (native `<dialog>`, a bottom sheet on phones) and `useToast` are the shared overlays; the toast provider wraps the whole app.
- Layering: `src/lib/` holds pure rules with tests (no React, no Firebase); `src/data/` holds Firestore mappers, live hooks (`useUserCollection`) and write functions; feature folders such as `src/habits/` hold screens. Mappers fill gaps in stored documents so older data still loads.
- `useNow()` refreshes every minute and when the app returns to the foreground; screens derive "today" from it so day changes don't need a reload.

## Data

All user data sits under `users/{uid}/…`, and `firestore.rules` allows only that signed-in user. `dayKey` is the device's local YYYY-MM-DD date, and timestamps are ISO strings from the device clock so offline actions keep their real time.

- `users/{uid}`: profile (`displayName`, `dailyFocusGoalMinutes`, `createdAt`)
- `habits/{id}`: `name`, `category`, `schedule` (`{type:'days', days}` with `Date.getDay` numbers, or `{type:'count', perWeek}`), `usualTime`, `targetNote`, `archived`, `createdAt`
- `habitLogs/{habitId_dayKey}`: `habitId`, `dayKey`, `completedAt`, `note`. The ID allows one per habit per day and makes undo a delete.
- Planned: `tasks`, `sessions`

Streak rules (`src/lib/habits.ts`): exact-day habits count scheduled days in a row; weekly-count habits count weeks reaching the number; a day or week still in progress can extend a streak but never breaks it.
