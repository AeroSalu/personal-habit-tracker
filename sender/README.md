# Cadence reminders

Sends [Cadence](https://lockin-habits-aerosalu.firebaseapp.com) reminders while the app is closed, for free. A GitHub Actions job runs [`send.mjs`](send.mjs) every 15 minutes:

1. Each person's app publishes their next 48 hours of reminders to `pushPlans/{uid}` in Firestore, grouped into 15-minute slots.
2. The job reads the plans with something due since its last run (never more than an hour back).
3. It sends each reminder to that person's devices through Firebase Cloud Messaging, and drops device tokens that stopped working.

The repository holds no secrets. The only credential is the `FIREBASE_SERVICE_ACCOUNT` repository secret: a service account key with just two roles, **Firebase Cloud Messaging API Admin** and **Cloud Datastore User**.

## Setup

1. In Google Cloud (IAM & Admin → Service accounts) for the Firebase project, create a service account with only those two roles, and create a JSON key for it.
2. In this repository, Settings → Secrets and variables → Actions → New repository secret: name `FIREBASE_SERVICE_ACCOUNT`, value the whole JSON file. Then delete the downloaded file.
3. Actions → Send reminders → Run workflow, to check it once. The log ends with a line like `slots … · sent 1 · failed 0`.

## Run locally

```
npm ci
npm test
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-lockin node send.mjs --dry-run
```

`--dry-run` only prints what would be sent and changes nothing.

`keepalive.yml` makes a tiny commit each month, because GitHub pauses scheduled workflows in repositories with no activity for 60 days.
