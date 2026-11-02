# Lock In

Add the things you want to do regularly, tick them off, and see exactly when you finished each one. Sign in on your phone or PC and your tasks follow you. It installs to a phone like an app and works without signal.

## Go live (free)

This uses Firebase's free Spark plan. You don't need a billing account or card.

1. Go to the [Firebase console](https://console.firebase.google.com) and create a project. Skip Google Analytics.
2. Open **Build > Authentication > Get started**, then enable **Email/Password** and **Google**.
3. Open **Build > Firestore Database > Create database**. Pick a region close to you and start in production mode.
4. Open **Project settings > General > Your apps**, and add a **Web app** (the `</>` icon). Skip its setup steps; Hosting supplies the config.
5. Run these from this folder, using your project ID in place of `your-project-id`:

```bash
firebase login
```

```bash
firebase use your-project-id
```

```bash
firebase deploy
```

The app is then live at `https://your-project-id.web.app`.

## Install on your phone

- **Android (Chrome):** open the link and tap **Install app**, or use the browser menu.
- **iPhone (Safari):** open the link, tap **Share**, then **Add to Home Screen**.

## Run it locally

```bash
firebase emulators:start --project demo-lockin
```

Then open http://127.0.0.1:5000. Accounts and data here are fake and disappear when the emulators stop.

## Test

```bash
node tests/logic.test.js
```

## Limits

- Sign-in is email and Google only. Phone number login needs a paid Firebase plan, so it's left out.
- There are no reminders yet.
