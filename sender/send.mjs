// Sends Cadence reminders. Run every 15 minutes by GitHub Actions (.github/workflows/send.yml).
//
// Each person's app publishes their next 48 hours of reminders to pushPlans/{uid}, grouped
// into 15-minute UTC slots. This finds the plans with something due in the slots since the
// last run (at most the last hour, so an outage never floods anyone), sends each reminder to
// that person's devices through Firebase Cloud Messaging, drops device tokens that no longer
// work, and records the last slot sent so nothing goes out twice.
//
// FIREBASE_SERVICE_ACCOUNT holds the service account key JSON (a GitHub secret). With
// --dry-run (or DRY_RUN=1) nothing is sent or changed; it only prints what it would send.
// Against the emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-lockin.

import { cert, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

const SLOT_MS = 15 * 60 * 1000
const CATCH_UP_SLOTS = 4
const DRY = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1'
const DEAD = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'])

/** Must match slotOf in the app (src/lib/reminders.ts). */
export const slotOf = (ms) => new Date(Math.floor(ms / SLOT_MS) * SLOT_MS).toISOString().slice(0, 16) + 'Z'

/** The slots to send now: those after the last one sent, up to the current one, at most an hour back. */
export function dueSlots(now, lastSent) {
  if (!lastSent) return [slotOf(now)]
  const slots = []
  for (let i = CATCH_UP_SLOTS - 1; i >= 0; i -= 1) {
    const slot = slotOf(now - i * SLOT_MS)
    if (slot > lastSent) slots.push(slot)
  }
  return slots
}

async function main() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT
  initializeApp(key ? { credential: cert(JSON.parse(key)) } : { projectId: process.env.GCLOUD_PROJECT })
  const db = getFirestore()
  const meta = db.doc('meta/reminderSender')
  const now = Date.now()
  const slots = dueSlots(now, (await meta.get()).data()?.lastSlot)
  let sent = 0
  let failed = 0
  let removed = 0

  for (const slot of slots) {
    const plans = await db.collection('pushPlans').where('slots', 'array-contains', slot).get()
    for (const plan of plans.docs) {
      const { tokens = [], items = {} } = plan.data()
      const due = Array.isArray(items[slot]) ? items[slot] : []
      if (!tokens.length || !due.length) continue
      const dead = new Set()
      for (const r of due) {
        // Data-only, so the app's own service worker shows it (src/sw.ts).
        const data = { title: String(r.title ?? ''), body: String(r.body ?? ''), url: String(r.url ?? '/'), tag: String(r.tag ?? '') }
        if (DRY) {
          console.log(`[dry run] ${slot} ${plan.id}: "${data.title}" to ${tokens.length} device(s)`)
          continue
        }
        const res = await getMessaging().sendEachForMulticast({ tokens, data, webpush: { headers: { Urgency: 'high', TTL: '3600' } } })
        res.responses.forEach((x, i) => {
          if (x.success) sent += 1
          else {
            failed += 1
            if (DEAD.has(x.error?.code)) dead.add(tokens[i])
          }
        })
      }
      if (dead.size) {
        await plan.ref.update({ tokens: FieldValue.arrayRemove(...dead) })
        removed += dead.size
      }
    }
  }

  if (!DRY && slots.length) await meta.set({ lastSlot: slots[slots.length - 1], at: new Date(now).toISOString() }, { merge: true })
  console.log(`${DRY ? '[dry run] ' : ''}slots ${slots.join(', ') || 'none'} · sent ${sent} · failed ${failed} · removed ${removed} dead token(s)`)
}

// Runs when called as a script, not when imported by the tests.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
