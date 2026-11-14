# Cadence

**Stop planning. Start executing.**

A productivity app that combines tasks, habits and focus sessions: plan your day, focus on one thing at a time, and track your consistency. It works on phone and desktop, installs like an app, and keeps working without signal.

Live at **https://lockin-habits-aerosalu.firebaseapp.com**

## What's in it

- **Dashboard:** focus ring against your daily goal, one-tap Start focus, an explainable productivity score, today's tasks and habits, lock-in streak, XP and level, upcoming deadlines.
- **Tasks:** priorities, deadlines with times, subtasks, estimates, categories, daily, weekly or custom-day repeats, search and filters.
- **Calendar:** month and week views of tasks, with overdue markers.
- **Focus mode:** 25/5, 50/10, 90/15 or custom, linked to a task or habit, pause and resume, breaks, strict mode, generated ambient sound, session history and notes.
- **Habits:** exact days or times per week, completion time compared with your usual time, streaks, 30-day rate, a calendar and notes.
- **Sign-in:** email and password, or Google.

## Install on your phone

Use the `firebaseapp.com` address above, not `.web.app`: it matches the sign-in domain, which keeps Google sign-in working from the home-screen app.

- **Android (Chrome):** open the link and use **Install app** from the browser menu.
- **iPhone (Safari):** open the link, tap **Share**, then **Add to Home Screen**.

## Develop

Needs Node 20 or later and the Firebase CLI.

```bash
npm install
```

```bash
npm run emulators
```

Then, in a second terminal:

```bash
npm run dev
```

Open http://127.0.0.1:5173. Development always uses the local emulators, so accounts and data are fake and disappear when the emulators stop.

## Check

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run build
```

## Deploy

```bash
firebase deploy
```

This builds the app first, then publishes it with the Firestore security rules. It stays on Firebase's free Spark plan.

## Set up your own copy

1. Create a project in the [Firebase console](https://console.firebase.google.com).
2. Under **Authentication**, enable **Email/Password** and **Google**.
3. Create a **Firestore** database in production mode.
4. Add a **Web app** and copy its config values into `.env`.
5. Set your project ID in `.firebaserc`, then deploy.

## Limits

- Reminders only show while the app is open; push reminders would need a paid plan.
- A web app can't block other apps or websites.
- A running focus timer stays on the device where it started until the session is saved.
