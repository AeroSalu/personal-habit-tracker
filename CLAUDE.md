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

- Dev: `npm run emulators` in one terminal, `npm run dev` in another, then open http://localhost:5173. `.env.development` points dev at the `demo-lockin` emulators, never the live project.
- Test: `npm test` (Vitest, `src/**/*.test.ts`); one file with `npx vitest run src/lib/streak.test.ts`, one test with `-t "name"`
- Lint and type-check: `npm run lint`, `npm run build`
- Legacy tests (until the port in step 3): `node tests/legacy-logic.test.js`
- Icons: `node tools/make-icons.cjs` (writes `public/icons/`)
- Deploy: `firebase deploy`. Hosting still serves `legacy/` until the rebuild reaches parity; then `firebase.json` switches to `dist/`.

## Architecture

- `src/firebase.ts` creates the app, auth and Firestore (persistent multi-tab cache) from `VITE_FIREBASE_*` env values, and connects to the emulators when `VITE_USE_EMULATORS=true`. `.env` holds the live web config, which is public by design.
- `src/app/nav.ts` is the single navigation list. The desktop sidebar (1024px and up), phone bottom bar and phone More page are all built from it; entries without a `path` are later-phase modules shown as "Soon".
- Routes live in `src/app/App.tsx`, all inside `AppLayout`.

## Data

All user data sits under `users/{uid}/…`, and `firestore.rules` allows only that signed-in user. Planned P0 collections: `tasks`, `habits`, `habitLogs/{habitId_dayKey}`, `sessions`, plus a profile on `users/{uid}`. `dayKey` is the device's local YYYY-MM-DD date.
