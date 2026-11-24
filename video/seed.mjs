// Fills the local emulators with a believable account for the demo video: Aryan, ten weeks of
// focus sessions, habits and tasks, four friends, a study group and a live focus room.
//
//   node seed.mjs              wipe the emulators and seed everything, dated around now
//   node seed.mjs --now=2026-11-27T10:30   seed as if it were that moment
//   node seed.mjs --room       only refresh the room: friends' heartbeats and the shared session
//
// It only ever talks to the `demo-lockin` emulators (npm run emulators), never the live project.
// Everything is generated from a fixed seed, so each run produces the same data.
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'
const PROJECT = 'demo-lockin'

/** The demo sign-in, a test account that exists only in the emulator. */
export const DEMO = { email: 'aryan@cadence.test', password: 'cadence-demo-2026' }

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}`))
const nowArg = arg('now')?.split('=')[1]
const NOW = nowArg ? new Date(nowArg) : new Date()

initializeApp({ projectId: PROJECT })
const db = getFirestore()
const auth = getAuth()

// ---- Helpers ----

let seed = 20261124
/** mulberry32: a small deterministic random generator. */
function rand() {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (list) => list[Math.floor(rand() * list.length)]
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1))

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** The moment `offset` days from today at h:m, local time. */
function at(offset, h = 12, m = 0) {
  const d = new Date(NOW)
  d.setDate(d.getDate() + offset)
  d.setHours(h, m, 0, 0)
  return d
}
const dayKey = (offset) => keyOf(at(offset))
const iso = (d) => d.toISOString()
const minutesAgo = (n) => new Date(NOW.getTime() - n * 60_000)
const minutesFromNow = (n) => new Date(NOW.getTime() + n * 60_000)
/** Monday of the week holding `offset`, as a day key. */
function mondayOf(offset) {
  const d = at(offset)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return keyOf(d)
}
const TODAY = 0
const todayDow = at(0).getDay()
const nowMinutes = NOW.getHours() * 60 + NOW.getMinutes()

// ---- People ----

const ME = {
  uid: 'aryan-demo',
  username: 'aryan',
  displayName: 'Aryan Salunkhe',
  bio: 'CS @ DIT · building Cadence · deep work till 6',
}

const FRIENDS = [
  { uid: 'priya-demo', username: 'priya', displayName: 'Priya Sharma', level: 14, streak: 34, bio: 'GATE 2027 · six hours of deep work a day', badges: ['first-lock-in', 'streak-3', 'streak-7', 'streak-30', 'focus-10h', 'focus-50h', 'deep-diver', 'early-bird', 'tasks-10', 'tasks-50', 'planner', 'habit-hero'], pinned: ['streak-30', 'deep-diver', 'early-bird'], daily: [190, 240, 215, 260, 180, 120, 90] },
  { uid: 'rohan-demo', username: 'rohan', displayName: 'Rohan Mehta', level: 11, streak: 12, bio: 'Backend intern · gym at 6 · ship daily', badges: ['first-lock-in', 'streak-3', 'streak-7', 'focus-10h', 'tasks-10', 'tasks-50', 'planner'], pinned: ['streak-7', 'tasks-50', 'planner'], daily: [120, 95, 150, 110, 140, 60, 45] },
  { uid: 'neha-demo', username: 'neha', displayName: 'Neha Kulkarni', level: 9, streak: 5, bio: 'Design student · one good thing a day', badges: ['first-lock-in', 'streak-3', 'focus-10h', 'tasks-10', 'night-owl'], pinned: ['night-owl', 'focus-10h'], daily: [75, 110, 60, 95, 80, 40, 30] },
  { uid: 'kabir-demo', username: 'kabir', displayName: 'Kabir Joshi', level: 16, streak: 58, bio: 'Competitive programmer · Codeforces Expert', badges: ['first-lock-in', 'streak-3', 'streak-7', 'streak-30', 'focus-10h', 'focus-50h', 'deep-diver', 'night-owl', 'goal-crusher', 'tasks-10', 'tasks-50', 'habit-hero', 'perfect-week'], pinned: ['streak-30', 'focus-50h', 'perfect-week'], daily: [210, 180, 230, 200, 250, 160, 140] },
]
const REQUESTER = { uid: 'ishaan-demo', username: 'ishaan', displayName: 'Ishaan Verma', level: 6 }

// ---- Tasks ----

const DONE_POOL = [
  ['Lab report: Experiment', 'study'], ['Revise OS scheduling notes', 'study'], ['Solve 5 SQL practice queries', 'study'],
  ['Push Cadence release notes', 'work'], ['Fix calendar week view bug', 'work'], ['Reply to club emails', 'work'],
  ['Gym: push day', 'fitness'], ['Stretching routine', 'fitness'], ['Laundry', 'personal'], ['Call grandparents', 'personal'],
  ['Read research paper on transformers', 'study'], ['Write blog post draft', 'work'], ['Plan weekend trip budget', 'personal'],
  ['DSA: binary search set', 'study'], ['Clean desk and inbox', 'personal'], ['Update project README', 'work'],
  ['5 km run', 'fitness'], ['Assignment: computer networks', 'study'], ['Prepare viva questions', 'study'], ['Groceries', 'personal'],
]

const tasks = []
let order = 0
function task(t) {
  order += 1024
  const full = {
    title: t.title,
    description: t.description ?? '',
    category: t.category ?? 'personal',
    priority: t.priority ?? 'medium',
    status: t.status ?? 'todo',
    dueDate: t.due === undefined || t.due === null ? '' : dayKey(t.due),
    dueTime: t.time ?? '',
    subtasks: (t.subtasks ?? []).map(([title, done], i) => ({ id: `s${i + 1}`, title, done })),
    recurrence: t.recurrence ?? { type: 'none' },
    estimateMinutes: t.estimate ?? 0,
    order,
    createdAt: iso(t.created ?? at(Math.min(-2, (t.due ?? 0) - 3), 9)),
    completedAt: t.completedAt ? iso(t.completedAt) : '',
    nextTaskId: '',
    shared: t.shared ?? false,
  }
  const id = t.id ?? `task-${tasks.length + 1}`
  tasks.push({ id, ...full })
  return id
}

// Done over the last ten weeks, almost all on time, so the badges and analytics have history.
let lab = 1
for (let i = 0; i < 56; i++) {
  const off = -69 + Math.floor((i / 56) * 69) + between(0, 1)
  if (off >= 0) continue
  const [base, category] = pick(DONE_POOL)
  const title = base === 'Lab report: Experiment' ? `Lab report: Experiment ${lab++}` : base
  const late = rand() < 0.08
  task({
    id: `done-${i + 1}`,
    title,
    category,
    priority: pick(['high', 'medium', 'medium', 'low']),
    status: 'done',
    due: late ? off - 1 : off,
    estimate: pick([20, 30, 45, 60]),
    completedAt: at(off, between(10, 21), pick([0, 15, 30, 45])),
    created: at(off - between(1, 4), 9),
  })
}

const dbms = task({
  id: 'dbms',
  title: 'Finish DBMS assignment 4',
  description: 'Normalise the library schema to 3NF and write the five queries.',
  category: 'study',
  priority: 'high',
  status: 'in_progress',
  due: 0,
  time: '17:00',
  estimate: 90,
  subtasks: [['Draw the ER diagram', true], ['Normalise tables to 3NF', true], ['Write the five SQL queries', false], ['Export to PDF and submit', false]],
})
const mock = task({ id: 'mock', title: 'Prepare for mock interview', description: 'Arrays, hashing and two behavioural stories.', category: 'work', priority: 'high', due: 0, time: '19:00', estimate: 60, subtasks: [['Two array problems', true], ['Hashing revision', false], ['Practice “tell me about yourself”', false]] })
task({ title: 'Review pull requests on Cadence', category: 'work', priority: 'medium', status: 'done', due: 0, estimate: 30, completedAt: minutesAgo(95), shared: true, id: 'prs' })
task({ title: 'Read OS concepts, chapter 6', category: 'study', priority: 'medium', due: 0, estimate: 45 })
task({ title: 'Call mom', category: 'personal', priority: 'low', status: 'done', due: 0, time: '09:00', completedAt: minutesAgo(140), id: 'call' })
task({ title: 'Pay hostel mess fee', category: 'personal', priority: 'urgent', due: -1, estimate: 10 })
task({ title: 'Physics lab report', category: 'study', priority: 'high', due: 1, time: '10:00', estimate: 60, subtasks: [['Readings table', true], ['Graphs', false], ['Conclusion', false]] })
task({ title: 'Team stand-up notes', category: 'work', priority: 'low', due: 2, time: '09:30', estimate: 15 })
task({ title: 'Weekly grocery run', category: 'personal', priority: 'low', due: 3, estimate: 40, recurrence: { type: 'weekly' } })
const pitch = task({ id: 'pitch', title: 'Hackathon pitch deck', description: 'Ten slides: problem, demo, traction, team.', category: 'work', priority: 'urgent', status: 'in_progress', due: 4, time: '18:00', estimate: 120, subtasks: [['Outline the story', true], ['Design the slides', false], ['Record a 60-second demo', false], ['Rehearse twice', false]] })
task({ title: 'Dentist appointment', category: 'personal', priority: 'medium', due: 7, time: '10:30' })
task({ title: 'Mid-sem exam: Computer Networks', category: 'study', priority: 'urgent', due: 11, time: '09:00', estimate: 180 })
task({ title: 'Submit scholarship form', category: 'personal', priority: 'high', due: 9, estimate: 30 })
task({ title: 'Mentor session with juniors', category: 'work', priority: 'medium', due: 6, time: '16:00', estimate: 60 })
task({ title: 'Plan tomorrow’s top three', category: 'personal', priority: 'medium', due: 0, time: '21:30', estimate: 10, recurrence: { type: 'daily' } })
task({ title: 'Leg day', category: 'fitness', priority: 'medium', status: 'in_progress', due: 1, time: '18:00', estimate: 60 })
task({ title: 'Learn Remotion basics', category: 'study', priority: 'low', estimate: 60 })
task({ title: 'Update resume with Cadence', category: 'work', priority: 'high', estimate: 45 })
task({ title: 'Clean up GitHub profile', category: 'work', priority: 'low', estimate: 30 })
task({ title: 'Rust book: ownership chapter', category: 'study', priority: 'low', estimate: 50 })
task({ title: 'Book train tickets home', category: 'personal', priority: 'medium', status: 'in_progress', due: 5 })

// ---- Habits ----

const HABITS = [
  { id: 'run', name: 'Morning run', category: 'fitness', schedule: { type: 'days', days: [1, 3, 5] }, usualTime: '06:30', targetNote: '3 km', rate: 0.88 },
  { id: 'meditate', name: 'Meditate', category: 'personal', schedule: { type: 'days', days: [0, 1, 2, 3, 4, 5, 6] }, usualTime: '07:00', targetNote: '10 minutes', rate: 0.92 },
  { id: 'read', name: 'Read 20 pages', category: 'personal', schedule: { type: 'days', days: [0, 1, 2, 3, 4, 5, 6] }, usualTime: '22:00', targetNote: '', rate: 0.82 },
  { id: 'leetcode', name: 'LeetCode problem', category: 'study', schedule: { type: 'count', perWeek: 5 }, usualTime: '21:00', targetNote: 'One medium', rate: 0.9 },
  { id: 'gym', name: 'Gym', category: 'fitness', schedule: { type: 'days', days: [2, 4, 6] }, usualTime: '18:00', targetNote: '', rate: 0.85 },
  { id: 'dsa-notes', name: 'Revise DSA notes', category: 'study', schedule: { type: 'count', perWeek: 3 }, usualTime: '', targetNote: '', rate: 0.85 },
]

const logs = []
function tick(habitId, off, h, m = 0, note = '') {
  logs.push({ id: `${habitId}_${dayKey(off)}`, habitId, dayKey: dayKey(off), completedAt: iso(at(off, h, m)), note })
}
for (const h of HABITS) {
  const [hh, mm] = (h.usualTime || '20:00').split(':').map(Number)
  if (h.schedule.type === 'days') {
    for (let off = -69; off < 0; off++) {
      if (!h.schedule.days.includes(at(off).getDay())) continue
      if (rand() < (off >= -21 ? h.rate + 0.07 : h.rate)) tick(h.id, off, hh, mm + between(0, 20))
    }
  } else {
    // Count habits: pick that many days in each past week, sometimes one short.
    for (let w = 0; w < 10; w++) {
      const days = [0, 1, 2, 3, 4, 5, 6].map((d) => -7 * (w + 1) + d - ((todayDow + 6) % 7) + 7).filter((off) => off < 0)
      let need = h.schedule.perWeek - (rand() > h.rate ? 1 : 0)
      for (const off of days.sort(() => rand() - 0.5)) if (need-- > 0) tick(h.id, off, hh, mm + between(0, 30))
    }
  }
}
// Today, only what plausibly happened before now.
if (nowMinutes > 7 * 60 + 20) tick('meditate', 0, 7, 10, 'Calm start')
if (nowMinutes > 6 * 60 + 50 && HABITS[0].schedule.days.includes(todayDow)) tick('run', 0, 6, 40, '3.2 km')

// ---- Focus sessions ----

const PRESETS = [
  ['25/5', 25, 0.38],
  ['50/10', 50, 0.47],
  ['90/15', 90, 0.15],
]
const SESSION_TITLES = [
  ['task', 'dbms', 'Finish DBMS assignment 4'], ['task', 'pitch', 'Hackathon pitch deck'], ['task', 'mock', 'Prepare for mock interview'],
  ['habit', 'leetcode', 'LeetCode problem'], ['habit', 'dsa-notes', 'Revise DSA notes'], ['', '', 'Computer Networks revision'],
  ['', '', 'Operating Systems'], ['', '', 'Cadence: analytics charts'], ['', '', 'Physics problems'], ['', '', ''],
]
const GAPS = new Set([-22, -37, -38, -51, -60, -66])
const ROOM_ID = 'exam-prep-room'
const sessions = []
let roomMinutes = 0

function session(start, preset, link, opts = {}) {
  const [presetId, planned] = preset
  const stopped = opts.stopped ?? false
  const minutes = stopped ? between(8, planned - 5) : planned
  const end = new Date(start.getTime() + minutes * 60_000)
  const id = `session-${sessions.length + 1}`
  const s = {
    taskId: link[0] === 'task' ? link[1] : '',
    habitId: link[0] === 'habit' ? link[1] : '',
    title: link[2],
    preset: presetId,
    plannedMinutes: planned,
    minutes,
    pausedMinutes: rand() < 0.15 ? between(1, 6) : 0,
    startedAt: iso(start),
    endedAt: iso(end),
    dayKey: keyOf(start),
    outcome: stopped ? 'stopped' : 'completed',
    leaves: rand() < 0.2 ? [{ at: iso(new Date(start.getTime() + 12 * 60_000)), seconds: between(8, 25) }] : [],
    note: opts.note ?? '',
    roomId: opts.roomId ?? '',
  }
  if (s.roomId) roomMinutes += minutes
  sessions.push({ id, ...s })
  return end
}
function choosePreset() {
  const r = rand()
  return r < PRESETS[0][2] ? PRESETS[0] : r < PRESETS[0][2] + PRESETS[1][2] ? PRESETS[1] : PRESETS[2]
}

const NOTES = ['Got the hard part done early.', 'Slow start, strong finish.', 'Finally cracked the joins.', 'Phone in the other room helped.', '']
for (let off = -69; off < 0; off++) {
  if (GAPS.has(off)) continue
  const dow = at(off).getDay()
  const weekend = dow === 0 || dow === 6
  let count = weekend ? between(off >= -21 ? 1 : 0, 2) : 2 + (rand() < 0.55 ? 1 : 0) + (rand() < 0.2 ? 1 : 0)
  // Morning block, sometimes before 8 for the Early Bird badge, then an evening block.
  let cursor = weekend ? at(off, 10, between(0, 30)) : rand() < 0.18 ? at(off, 7, between(0, 30)) : at(off, 8, between(15, 50))
  let evening = false
  while (count-- > 0) {
    if (!evening && cursor.getHours() >= 12) {
      cursor = at(off, between(18, 20), pick([0, 15, 30]))
      evening = true
    }
    const preset = choosePreset()
    const inRoom = off >= -5 && !weekend && !sessions.some((s) => s.dayKey === dayKey(off) && s.roomId)
    const end = session(cursor, preset, pick(SESSION_TITLES.slice(3)), { stopped: rand() < 0.07, note: rand() < 0.2 ? pick(NOTES) : '', roomId: inRoom ? ROOM_ID : '' })
    cursor = new Date(end.getTime() + between(10, 25) * 60_000)
    if (!evening && rand() < 0.5) {
      cursor = at(off, between(18, 21), pick([0, 15, 30]))
      evening = true
    }
  }
}
// A few recent sessions belong to the open tasks, so time spent sits under their estimates.
const recent = sessions.filter((s) => s.outcome === 'completed' && !s.roomId && s.minutes <= 50).slice(-4)
recent.forEach((s, i) => {
  const [kind, id, title] = SESSION_TITLES[[1, 1, 2, 5][i]]
  Object.assign(s, { taskId: kind === 'task' ? id : '', habitId: '', title })
})

// Today: one deep session this morning, finished well before now.
const todayStart = new Date(Math.max(at(0, 7).getTime(), minutesAgo(130).getTime()))
if (todayStart < minutesAgo(55)) session(todayStart, PRESETS[1], SESSION_TITLES[0], { note: 'ER diagram and 3NF done.' })

// ---- Day and week records ----

const RATING_NOTES = ['Good focus, slow afternoon.', 'Shipped the feature I was stuck on.', 'Too many meetings, still got the main thing done.', 'Gym and two deep sessions. Great day.', 'Tired, kept it light.']
const WINS = ['Finished the assignment early', 'Ran 5 km', 'Fixed the sync bug', 'Two deep sessions', 'Read 40 pages', 'Helped a junior with DSA', 'Inbox zero']
const days = []
for (let off = -30; off < 0; off++) {
  const planned = rand() < 0.8
  const reviewed = rand() < 0.7
  if (!planned && !reviewed) continue
  const d = { key: dayKey(off) }
  if (planned) d.plannedAt = iso(at(off, 8, between(0, 20)))
  if (reviewed) Object.assign(d, { reviewedAt: iso(at(off, 21, between(15, 50))), rating: between(3, 5), note: pick(RATING_NOTES), wins: [pick(WINS), pick(WINS)].filter((w, i, a) => a.indexOf(w) === i) })
  days.push(d)
}
const weeks = [
  { key: mondayOf(0), focus: [dbms, pitch, mock] },
  { key: mondayOf(-7), reviewedAt: iso(at(-((todayDow + 6) % 7) - 1, 19)), note: 'Strong week: DBMS on track, hackathon idea locked. Sleep earlier.' },
  { key: mondayOf(-14), reviewedAt: iso(at(-((todayDow + 6) % 7) - 8, 19)), note: 'Exams week. Kept the streak, skipped the gym twice.' },
]

// ---- Social ----

const monday = mondayOf(0)
const season = dayKey(0).slice(0, 7)
const daysIntoWeek = (todayDow + 6) % 7 // 0 on Monday
function weekNumbers(f) {
  const byDay = f.daily.map((m, i) => (i < daysIntoWeek ? m : i === daysIntoWeek ? Math.round(m * Math.min(1, nowMinutes / (20 * 60))) : 0))
  const minutes = byDay.reduce((a, b) => a + b, 0)
  return { byDay, minutes, xp: Math.round(minutes / 25) * 20 + (daysIntoWeek + 1) * 45 }
}

const activity = []
const cheers = []
function post(owner, kind, title, minutesBefore, key) {
  const id = `${owner}_${kind}_${key}`
  activity.push({ id, uid: owner, kind, title, at: iso(minutesAgo(minutesBefore)) })
  return id
}
function cheer(activityId, owner, from, emoji, minutesBefore) {
  cheers.push({ id: `${activityId}_${from}`, activityId, owner, uid: from, emoji, at: iso(minutesAgo(minutesBefore)) })
}

const pDeep = post('priya-demo', 'badge', 'Unbreakable', 45, 'streak-30')
const pTask = post('priya-demo', 'task', 'Solve 30 OS previous-year questions', 130, 'pyq-os')
const rTask = post('rohan-demo', 'task', 'Ship the payments API refactor', 75, 'payments')
const rHabit = post('rohan-demo', 'habit', 'Gym', 400, `gym_${dayKey(-1)}`)
const nTask = post('neha-demo', 'task', 'Finish typography poster', 220, 'poster')
const nLevel = post('neha-demo', 'level', 'Level 9', 900, '9')
const kHabit = post('kabir-demo', 'habit', 'Codeforces virtual contest', 30, `cf_${dayKey(0)}`)
const kBadge = post('kabir-demo', 'badge', 'Perfect Week', 1300, 'perfect-week')
const mine = `${ME.uid}_task_prs`
activity.push({ id: mine, uid: ME.uid, kind: 'task', title: 'Review pull requests on Cadence', at: iso(minutesAgo(95)) })

cheer(pDeep, 'priya-demo', 'kabir-demo', '🔥', 40)
cheer(pDeep, 'priya-demo', 'rohan-demo', '🎉', 38)
cheer(pTask, 'priya-demo', 'neha-demo', '💪', 100)
cheer(rTask, 'rohan-demo', 'priya-demo', '👏', 60)
cheer(rTask, 'rohan-demo', ME.uid, '🔥', 55)
cheer(nTask, 'neha-demo', 'priya-demo', '🎉', 200)
cheer(nTask, 'neha-demo', 'kabir-demo', '👏', 190)
cheer(kBadge, 'kabir-demo', ME.uid, '🎉', 1200)
cheer(kBadge, 'kabir-demo', 'priya-demo', '🔥', 1100)
cheer(kHabit, 'kabir-demo', 'rohan-demo', '💪', 20)
cheer(nLevel, 'neha-demo', 'rohan-demo', '👏', 800)
cheer(rHabit, 'rohan-demo', 'kabir-demo', '💪', 350)
cheer(mine, ME.uid, 'priya-demo', '👏', 80)
cheer(mine, ME.uid, 'kabir-demo', '🔥', 70)
cheer(mine, ME.uid, 'rohan-demo', '💪', 65)

const GROUP = { id: 'dit-study-circle', name: 'DIT Study Circle', code: 'K7QPXM', targetMinutes: 900 }
const ROOM = { id: ROOM_ID, name: 'Exam Prep Room', code: 'R4MZTW', goalMinutes: 960 }

// ---- Writing ----

async function wipe() {
  const base = 'http://127.0.0.1'
  const a = await fetch(`${base}:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
  const b = await fetch(`${base}:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' })
  if (!a.ok || !b.ok) throw new Error('Could not clear the emulators. Are they running (npm run emulators)?')
}

class Writer {
  ops = []
  set(path, data) {
    this.ops.push([path, data])
  }
  async flush() {
    for (let i = 0; i < this.ops.length; i += 400) {
      const batch = db.batch()
      for (const [path, data] of this.ops.slice(i, i + 400)) batch.set(db.doc(path), data)
      await batch.commit()
    }
    return this.ops.length
  }
}

/** Friends' heartbeats and the shared session, which go stale within minutes of seeding. */
async function freshenRoom() {
  const now = new Date()
  const started = new Date(now.getTime() - 14 * 60_000)
  const ends = new Date(started.getTime() + 50 * 60_000)
  await db.doc(`rooms/${ROOM.id}`).set({ session: { startedAt: iso(started), endsAt: iso(ends), minutes: 50 } }, { merge: true })
  const states = { 'priya-demo': 'focusing', 'kabir-demo': 'focusing', 'rohan-demo': 'break' }
  for (const [uid, state] of Object.entries(states)) {
    await db.doc(`rooms/${ROOM.id}/members/${uid}`).set({ state, heartbeatAt: iso(now) }, { merge: true })
  }
  await db.doc('stats/priya-demo').set({ focusing: { until: iso(ends) } }, { merge: true })
  await db.doc('stats/kabir-demo').set({ focusing: { until: iso(ends) } }, { merge: true })
}

async function main() {
  if (arg('room')) {
    await freshenRoom()
    console.log('Room refreshed.')
    return
  }

  await wipe()
  await auth.createUser({ uid: ME.uid, email: DEMO.email, password: DEMO.password, displayName: ME.displayName })

  const w = new Writer()
  const u = `users/${ME.uid}`
  w.set(u, {
    displayName: ME.displayName,
    dailyFocusGoalMinutes: 180,
    createdAt: iso(at(-72, 20)),
    username: ME.username,
    shareAchievements: true,
    badgeAlerts: false,
    photo: '',
    bio: ME.bio,
    pinned: ['streak-7', 'focus-50h', 'tasks-50'],
  })
  w.set(`usernames/${ME.username}`, { uid: ME.uid })
  w.set(`profiles/${ME.uid}`, { username: ME.username, displayName: ME.displayName, level: 1, photo: '', updatedAt: iso(NOW) })

  for (const t of tasks) {
    const { id, ...data } = t
    w.set(`${u}/tasks/${id}`, data)
  }
  for (const h of HABITS) {
    const { id, rate: _rate, ...data } = h
    w.set(`${u}/habits/${id}`, { ...data, archived: false, createdAt: iso(at(-70, 9)), shared: id === 'gym' || id === 'run' })
  }
  for (const l of logs) {
    const { id, ...data } = l
    w.set(`${u}/habitLogs/${id}`, data)
  }
  for (const s of sessions) {
    const { id, ...data } = s
    w.set(`${u}/sessions/${id}`, data)
  }
  for (const d of days) {
    const { key, ...data } = d
    w.set(`${u}/days/${key}`, data)
  }
  for (const wk of weeks) {
    const { key, ...data } = wk
    w.set(`${u}/weeks/${key}`, data)
  }
  w.set(`${u}/taskTemplates/lab-report`, { name: 'Lab report', title: 'Lab report: Experiment', description: 'Aim, readings, graphs, conclusion.', category: 'study', priority: 'high', steps: ['Readings table', 'Graphs', 'Error analysis', 'Conclusion'], estimateMinutes: 60, recurrence: { type: 'none' } })
  w.set(`${u}/taskTemplates/interview-prep`, { name: 'Interview prep', title: 'Interview practice', description: '', category: 'work', priority: 'high', steps: ['Two coding problems', 'One system design question', 'Behavioural story'], estimateMinutes: 75, recurrence: { type: 'none' } })

  // Friends: public card, username, stats, friendship.
  for (const f of FRIENDS) {
    const n = weekNumbers(f)
    w.set(`usernames/${f.username}`, { uid: f.uid })
    w.set(`profiles/${f.uid}`, { username: f.username, displayName: f.displayName, level: f.level, photo: '', updatedAt: iso(NOW) })
    w.set(`stats/${f.uid}`, {
      level: f.level,
      xp: (100 * f.level * (f.level + 1)) / 2 - 140,
      badges: f.badges,
      weekKey: monday,
      weekXp: n.xp,
      weekFocusMinutes: n.minutes,
      weekFocusByDay: n.byDay,
      seasonKey: season,
      seasonXp: n.xp + f.level * 120,
      streak: f.streak,
      focusing: null,
      bio: f.bio,
      pinned: f.pinned,
      updatedAt: iso(NOW),
    })
    const members = [ME.uid, f.uid].sort()
    w.set(`friendships/${members.join('_')}`, { members, since: iso(at(-between(20, 60), 18)) })
  }
  // Friends are also friends with each other, so they can cheer one another.
  for (let i = 0; i < FRIENDS.length; i++)
    for (let j = i + 1; j < FRIENDS.length; j++) {
      const members = [FRIENDS[i].uid, FRIENDS[j].uid].sort()
      w.set(`friendships/${members.join('_')}`, { members, since: iso(at(-80, 18)) })
    }

  w.set(`usernames/${REQUESTER.username}`, { uid: REQUESTER.uid })
  w.set(`profiles/${REQUESTER.uid}`, { username: REQUESTER.username, displayName: REQUESTER.displayName, level: REQUESTER.level, photo: '', updatedAt: iso(NOW) })
  w.set(`friendRequests/${REQUESTER.uid}_${ME.uid}`, { from: REQUESTER.uid, to: ME.uid, fromUsername: REQUESTER.username, fromName: REQUESTER.displayName, toUsername: ME.username, status: 'pending', createdAt: iso(minutesAgo(180)) })

  for (const a of activity) {
    const { id, ...data } = a
    w.set(`activity/${id}`, data)
  }
  for (const c of cheers) {
    const { id, ...data } = c
    w.set(`cheers/${id}`, data)
  }

  // The study group: Aryan owns it; StatsPublisher keeps his own row current.
  w.set(`groups/${GROUP.id}`, { name: GROUP.name, ownerUid: ME.uid, code: GROUP.code, targetMinutes: GROUP.targetMinutes, createdAt: iso(at(-40, 20)) })
  w.set(`groupCodes/${GROUP.code}`, { groupId: GROUP.id, name: GROUP.name })
  w.set(`${u}/groups/${GROUP.id}`, { name: GROUP.name, code: GROUP.code, joinedAt: iso(at(-40, 20)) })
  w.set(`groups/${GROUP.id}/members/${ME.uid}`, { uid: ME.uid, displayName: ME.displayName, username: ME.username, code: GROUP.code, joinedAt: iso(at(-40, 20)), level: 1, weekKey: monday, weekXp: 0, weekFocusMinutes: 0, seasonKey: season, seasonXp: 0, streak: 0, updatedAt: iso(NOW) })
  for (const f of FRIENDS) {
    const n = weekNumbers(f)
    w.set(`groups/${GROUP.id}/members/${f.uid}`, { uid: f.uid, displayName: f.displayName, username: f.username, code: GROUP.code, joinedAt: iso(at(-38, 21)), level: f.level, weekKey: monday, weekXp: n.xp, weekFocusMinutes: n.minutes, seasonKey: season, seasonXp: n.xp + f.level * 120, streak: f.streak, updatedAt: iso(NOW) })
  }

  // The focus room: Aryan hosts; three friends are in it.
  w.set(`rooms/${ROOM.id}`, { name: ROOM.name, hostUid: ME.uid, code: ROOM.code, goalMinutes: ROOM.goalMinutes, session: null, createdAt: iso(at(-20, 19)) })
  w.set(`roomCodes/${ROOM.code}`, { roomId: ROOM.id, name: ROOM.name })
  w.set(`${u}/rooms/${ROOM.id}`, { name: ROOM.name, code: ROOM.code, joinedAt: iso(at(-20, 19)) })
  w.set(`rooms/${ROOM.id}/members/${ME.uid}`, { uid: ME.uid, displayName: ME.displayName, username: ME.username, code: ROOM.code, joinedAt: iso(at(-20, 19)), state: 'idle', heartbeatAt: iso(NOW), minutes: roomMinutes })
  const roomFriends = { 'priya-demo': 210, 'kabir-demo': 180, 'rohan-demo': 95 }
  for (const f of FRIENDS.filter((x) => x.uid in roomFriends)) {
    w.set(`rooms/${ROOM.id}/members/${f.uid}`, { uid: f.uid, displayName: f.displayName, username: f.username, code: ROOM.code, joinedAt: iso(at(-19, 20)), state: 'idle', heartbeatAt: iso(NOW), minutes: roomFriends[f.uid] })
  }

  const written = await w.flush()
  await freshenRoom()

  const focusMinutes = sessions.reduce((a, s) => a + s.minutes, 0)
  console.log(`Seeded ${written} documents for ${ME.displayName}, dated around ${NOW.toString()}`)
  console.log(`  ${tasks.length} tasks (${tasks.filter((t) => t.status === 'done').length} done), ${HABITS.length} habits with ${logs.length} ticks`)
  console.log(`  ${sessions.length} sessions, ${Math.round(focusMinutes / 60)} h of focus; ${FRIENDS.length} friends, 1 request, 1 group, 1 room`)
  console.log(`  Sign in with ${DEMO.email} (password in seed.mjs)`)
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e)
    process.exit(1)
  },
)
