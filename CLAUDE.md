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
- Security rules tests: `npm run test:rules`. It starts its own Firestore emulator on port 8181 (`firebase.rules-test.json`) and runs `tests/rules/` against `firestore.rules`, so the dev emulator's data is untouched. If it reports port 8181 taken, a previous run is still alive; stop that process. Add a test for every rule change, covering owner, friend and stranger cases.
- Rules gotcha: in a rules path, `$(x)` inserts one segment, so build paths in full (`/databases/$(database)/documents/usernames/$(name)`), not from a joined string. The dev emulator hot-reloads `firestore.rules` and can catch a half-finished edit; re-save the file if it starts reporting unknown functions.
- Lint and type-check: `npm run lint`, `npm run build`
- Icons: `node tools/make-icons.cjs` (writes `public/icons/`)
- Deploy: `firebase deploy` (its predeploy runs `npm run build`; Hosting serves `dist/` with an SPA rewrite, and `sw.js` and `index.html` are served `no-cache` so updates reach installed apps)

## Architecture

- `src/firebase.ts` creates the app, auth and Firestore (persistent multi-tab cache) from `VITE_FIREBASE_*` env values, and connects to the emulators when `VITE_USE_EMULATORS=true`. `.env` holds the live web config, which is public by design.
- `src/app/nav.ts` is the single navigation list: `PRIMARY` (everyday screens, always in the sidebar; the first four are the phone bottom bar) and `SECONDARY` (folded under "More" in the sidebar, unfolded when one is open). The phone More page lists everything not on the bottom bar plus Settings. Entries without a `path` are later-phase modules shown as "Soon".
- The dashboard is deliberately minimal and professional: one column with the focus card (score folded into a disclosure), one Today list (`todayList` in `src/lib/dashboard.ts` merges tasks and habits) with quick add, and the next three deadlines. Gamification (XP, levels, missions) stays off it; badge pop-ups only show when the profile's `badgeAlerts` is on.
- `src/auth/AuthProvider.tsx` combines the Firebase user and the `users/{uid}` profile document into one `AuthState`: `loading`, `signedOut`, `needsProfile` or `ready`. `App.tsx` gates on it (sign-in page, then first-time setup, then the app), so every screen inside the app can call `useSignedIn()` and rely on a profile existing.
- A missing profile is only believed once the server confirms it, not from an empty local cache, or a returning user on a new device would be sent to setup.
- Google sign-in uses a redirect on phones and in the installed app, and a popup on desktop (`src/auth/authActions.ts`). `redirectError` is read once at startup.
- Routes live in `src/app/App.tsx`, all inside `AppLayout`.
- Shared buttons, inputs and chips are classes in `src/components/ui.module.css`; screens compose them rather than restyling controls. `Dialog` (native `<dialog>`, a bottom sheet on phones) and `useToast` are the shared overlays; the toast provider wraps the whole app.
- Layering: `src/lib/` holds pure rules with tests (no React, no Firebase); `src/data/` holds Firestore mappers, live hooks (`useUserCollection`) and write functions; feature folders such as `src/habits/` hold screens. Mappers fill gaps in stored documents so older data still loads.
- Focus: `src/lib/focus.ts` is a pure state machine over timestamps (focus, summary, break, breakOver), with `now` always passed in. `src/focus/FocusProvider.tsx` wraps the signed-in app and owns the running session: it ticks the clock, saves the state to `localStorage` so a reload resumes it (an expired phase resolves to its real end time), turns `visibilitychange` into leaves (strict mode stops a session left for over 30 seconds, at the moment of leaving), holds a wake lock, plays Web Audio ambient sound and the chime, and writes the finished session once (`saveSession` is idempotent and never touches the note). It renders `FocusOverlay` above everything while a session or break runs. Read visibility in the event handler, not inside a state updater.
- `useNow()` refreshes every minute and when the app returns to the foreground; screens derive "today" from it so day changes don't need a reload.

## Data

Private data sits under `users/{uid}/…`, which only that signed-in user can reach. Shared collections, each with its own rules and tests:
- `usernames/{name}`: `{uid}`. Created only if free and only for yourself, never updated, deleted only by its holder. This is what makes names unique.
- `profiles/{uid}`: `{username, displayName, level, updatedAt}`. Readable by any signed-in user, for search. Its username must be one you hold (checked with `getAfter`, so claiming and setting share one batch in `claimUsername`).
- `stats/{uid}`: the summary friends see (level, xp, badge IDs, this week's XP and focus minutes, this month's season XP, streak, `focusing.until`). Readable by the owner and friends (a `friendships/{lowerUid_higherUid}` document exists). Written only by the owner, with range checks. `StatsPublisher` writes it at most every 30 s and only once a username exists. Weekly totals come from `xpBetween` in `src/lib/social.ts`, which follows the same rules as the total.

- `friendRequests/{from_to}`: `{from, to, fromUsername, fromName, toUsername, status: pending|declined, createdAt}`. Only the sender creates it (the recipient needs a profile and they mustn't already be friends). It's visible to both. Only the recipient can decline; either can delete it.
- `friendships/{lowerUid_higherUid}`: `{members (sorted), since}`. It can only be created by the recipient of a pending request from the other person, in the same batch that deletes the request (`acceptRequest`). Either member can delete it.
- `activity/{uid_kind_…}`: `{uid, kind: task|habit|badge|level, title, at}`, readable by the owner and friends. IDs are fixed per thing (`activityIds` in `src/lib/friends.ts`), so reposting overwrites and undoing deletes. Deleting an ID that was never posted is allowed under your own prefix, so undo never fails. Shared tasks and habits (`shared: true`) post inside the same batch as completion and remove inside reopen and untick (`completeTask`, `reopenTask`, `logHabit`, `unlogHabit`). `AchievementPoster` posts badges and level-ups when Share achievements is on. Feed queries go per friend (`where uid == x`), which is what the rules can check.

- `groups/{gid}`: `{name, ownerUid, code, targetMinutes, createdAt}`, readable by members. Only the owner can rename it or change the target; the code never changes.
- `groups/{gid}/members/{uid}`: the member's name, username, the group `code` (it must match the group's code on create, which is how invite codes are enforced), `joinedAt`, and a copy of their weekly numbers. Each member writes only their own; the owner can remove members. `StatsPublisher` keeps these copies current for every group in `users/{uid}/groups`.
- `groupCodes/{CODE}`: `{groupId, name}`. Single gets only, no listing, so knowing a code is what lets you find a group. Codes are 6 characters with no 0/O or 1/I. A group, its code, the owner's membership and the owner's private `users/{uid}/groups/{gid}` record are written in one batch (`createGroup`), retrying with a new code if one is taken.
- Deleting a group leaves members' private records behind; their app sees the group document missing (confirmed by the server, not the cache) and offers to remove it. `useLiveDocs` and `useLiveQuery` retry a refused listen a few times, because a read can race the write that grants access.

- `rooms/{rid}`: `{name, hostUid, code, goalMinutes, session: {startedAt, endsAt, minutes} | null, createdAt}`. Members can read it; only the host renames it, sets the goal, or starts and ends the shared session.
- `rooms/{rid}/members/{uid}`: `{uid, displayName, username, code, joinedAt, state: idle|focusing|break, heartbeatAt, minutes}`. Names and states only, never what anyone works on. Joining needs the room's code. You update only your own; `minutes` can only rise, by at most 240 per write.
- `roomCodes/{CODE}` and `users/{uid}/rooms/{rid}` work like the group ones.
- Presence: `RoomPresence` (mounted app-wide) sends a heartbeat every 60 s for the room of a running room session, or else the room page that's open (`src/rooms/viewing.ts`); anyone silent for over two heartbeats shows as away. Joining a shared session calls `focus.start(plan, endsAt)` so everyone finishes together. Sessions saved from a room carry `roomId`, and the member's `minutes` is set to the total of their sessions in that room (a total, not an increment, so a reload can't double-count).

Everything else is closed by default. `dayKey` is the device's local YYYY-MM-DD date, and timestamps are ISO strings from the device clock so offline actions keep their real time.

- `users/{uid}`: profile (`displayName`, `dailyFocusGoalMinutes`, `createdAt`, `username`, `shareAchievements`, `badgeAlerts`)
- `habits/{id}`: `name`, `category`, `schedule` (`{type:'days', days}` with `Date.getDay` numbers, or `{type:'count', perWeek}`), `usualTime`, `targetNote`, `archived`, `createdAt`
- `habitLogs/{habitId_dayKey}`: `habitId`, `dayKey`, `completedAt`, `note`. The ID allows one per habit per day and makes undo a delete.
- `tasks/{id}`: `title`, `description`, `category`, `priority` (urgent, high, medium, low), `status` (todo, in_progress, done), `dueDate` (day key or ''), `dueTime` ("HH:MM" or ''), `subtasks` (array of `{id, title, done}`), `recurrence` (`{type:'none'|'daily'|'weekly'}` or `{type:'custom', days}`), `estimateMinutes`, `order`, `createdAt`, `completedAt`, `nextTaskId`
- `sessions/{id}`: `taskId`, `habitId`, `title`, `preset`, `plannedMinutes`, `minutes` (focused, excluding pauses), `pausedMinutes`, `startedAt`, `endedAt`, `dayKey`, `outcome` (completed or stopped), `leaves` (`{at, seconds}` each time the app went to the background), `note`. Sessions under a minute aren't saved.

- `taskTemplates/{id}`: `name`, `title`, `description`, `category`, `priority`, `steps` (subtask titles), `estimateMinutes`, `recurrence`. Built-in starters live in `src/lib/templates.ts`, not Firestore.

Board and order (`src/lib/board.ts`, `src/tasks/TaskBoard.tsx`): `order` is a plain number; a move writes only the moved task, at the midpoint of its new neighbours (±1024 at an end). Board moves go through `moveTask`, which routes into and out of Done via `completeTask`/`reopenTask`. Drag uses @dnd-kit with mouse, a 250 ms touch long-press, and keyboard sensors, plus a "Move to" menu on every card; screen-reader announcements are customised to use task titles, never the library's IDs.

Repeating tasks keep one live instance. Completing one creates the next in the same batch (`completeTask` in `src/data/tasks.ts`) and records its ID in `nextTaskId`; reopening deletes that next instance unless it has been worked on. Any status change into or out of done must go through those two functions, not a plain update.

Dashboard rules (`src/lib/dashboard.ts`), all derived on read:
- Lock-in day: any completed focus session, habit tick or completed task. The streak counts consecutive days; today extends it but can't break it.
- XP: 10 per completed task (once per task, lost if reopened), 10 per habit tick, 20 per completed session (capped at 8 a day; stopped sessions earn nothing), 50 per day where everything due was done on time (tasks finished late never earn their day the bonus). Level n needs 100·n more XP than level n−1.
- Gamification (`src/lib/game.ts`, `achievements.ts`, `missions.ts`): `indexGame` sorts and indexes the records once; badges are checks that return progress and the day earned; daily missions (3) and the weekly challenge are picked by a seed of uid and date, from candidates decided by records made before that day so picks never change mid-day; their XP (15 each, +30 for all three, 100 per challenge) is recomputed over every active day and passed into `xpBreakdown`. `src/game/useGame.ts` does all of this once per data change; `BadgeWatcher` announces new badges, storing only already-announced IDs per device.
- Analytics (`src/lib/analytics.ts`): day, week (Monday to Sunday) or month ranges, each compared with the previous one; habit rates expect each scheduled day for exact-day habits and the weekly number spread over the days for weekly-count ones (left out of single days); the report sentences only state what the numbers show. Charts in `src/analytics/charts/` are hand-drawn SVG that follow the dataviz skill: one axis, columns ≤ 24px with a 4px rounded top, hairline grid, a tooltip per column on hover and focus, a "Show data" table, and colours from the `--cat-*` and `--heat-*` tokens (validated against `--card`; re-run the skill's validator if you change them).
- Productivity score: 40% focus goal, 35% tasks due today or overdue, 25% habits due; a part with nothing due hands its weight to the others.

Streak rules (`src/lib/habits.ts`): exact-day habits count scheduled days in a row; weekly-count habits count weeks reaching the number; a day or week still in progress can extend a streak but never breaks it.

## Roadmap

Later phases from the product blueprint, each to be planned and approved before building, one reviewed step at a time:

- **P1 Gamification:** badges and daily missions as checks on the data (never stored), weekly challenges, personal bests.
- **P1 Analytics:** daily, weekly and monthly reports, focus trends, best time of day, time by category.
- **P1 Social:**
  - public profiles with unique usernames, friends, private groups, weekly leaderboards built from self-reported totals
  - focus rooms using Firestore for the room and Realtime Database presence with `onDisconnect`
  - rooms show who is focusing without task details
- **P1 Tasks extras:** Kanban with drag and drop, templates, manual ordering via `order`.
- **P2 AI coach:** Firebase AI Logic on the Gemini free tier with App Check. It only suggests, and the user approves each change. Check Spark support first.
- **P2 Distraction blocker:** a Chrome/Edge extension in `extension/`, signalled by the app during a session.

Free-plan limits that shape these: no push reminders while the app is closed (they need Cloud Functions), a web app can't block other apps or sites, and leaderboards can't be server-verified.
