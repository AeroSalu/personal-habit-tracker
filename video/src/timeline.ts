import type { Segment } from './clips'

/**
 * Camera keyframes in the clip's own (source) time: zoom `z` around a point in the recorded
 * viewport's CSS pixels. Leave x/y out to frame wherever the mouse is at that moment.
 */
export type Key = { t: number; z: number; x?: number; y?: number }

export type FeatureScene = {
  kind: 'feature'
  clip: string
  bars: number
  segments: Segment[]
  camera: Key[]
  eyebrow: string
  title: string
  body: string
  chime?: number
}

export type Scene =
  | { kind: 'intro'; bars: number }
  | { kind: 'reveal'; bars: number; clip: string; segments: Segment[]; camera: Key[]; title: string; body: string }
  | FeatureScene
  | { kind: 'value'; bars: number }
  | { kind: 'outro'; bars: number }

const MID = { x: 720, y: 405 }

export const SCENES: Scene[] = [
  { kind: 'intro', bars: 4 },
  {
    kind: 'reveal',
    bars: 5,
    clip: 'today',
    segments: [{ from: 0.4, to: 15.8 }],
    camera: [
      { t: 0.4, z: 1, ...MID },
      { t: 1.8, z: 1.6, x: 720, y: 520 },
      { t: 4.6, z: 1.6, x: 720, y: 520 },
      { t: 5.8, z: 1, ...MID },
      { t: 9.9, z: 1 , ...MID },
      { t: 10.5, z: 1.6 },
      { t: 11.6, z: 1.6 },
      { t: 12.4, z: 1, ...MID },
      { t: 14.0, z: 1.6, x: 720, y: 520 },
    ],
    title: 'Your whole day, at a glance.',
    body: 'Focus, tasks and habits as three rings. Tick something off and watch them move.',
  },
  {
    kind: 'feature',
    clip: 'quickadd',
    bars: 3,
    segments: [{ from: 1.9, to: 10.3 }],
    camera: [
      { t: 1.9, z: 1, ...MID },
      { t: 2.9, z: 2.1, x: 560, y: 150 },
      { t: 8.3, z: 2.1, x: 560, y: 150 },
      { t: 9.2, z: 1.5, x: 760, y: 640 },
    ],
    eyebrow: 'Quick add',
    title: 'Type it the way you’d say it.',
    body: 'Dates, times, priority, tags and lengths are understood as you type.',
  },
  {
    kind: 'feature',
    clip: 'board',
    bars: 2,
    segments: [
      { from: 3.8, to: 5.4 },
      { from: 6.8, to: 10.9 },
    ],
    camera: [
      { t: 3.8, z: 1.5 },
      { t: 4.6, z: 1.5 },
      { t: 5.3, z: 1.15, x: 640, y: 420 },
      { t: 7.0, z: 1.45, x: 560, y: 450 },
      { t: 10.9, z: 1.45, x: 560, y: 450 },
    ],
    eyebrow: 'Tasks',
    title: 'List or board. Drag to move.',
    body: 'Subtasks, estimates and repeats, with focus time tracked against each task.',
  },
  {
    kind: 'feature',
    clip: 'calendar',
    bars: 2,
    segments: [{ from: 3.9, to: 8.7 }],
    camera: [
      { t: 3.9, z: 1.05, x: 660, y: 380 },
      { t: 8.7, z: 1.2, x: 660, y: 380 },
    ],
    eyebrow: 'Calendar',
    title: 'Every deadline, in its place.',
    body: 'Months glide past; pick any day to see what’s due.',
  },
  {
    kind: 'feature',
    clip: 'focus',
    bars: 3,
    segments: [
      { from: 2.0, to: 9.3 },
      { from: 10.9, to: 12.6 },
    ],
    camera: [
      { t: 2.0, z: 1.45, x: 600, y: 330 },
      { t: 4.4, z: 1.45, x: 600, y: 330 },
      { t: 5.6, z: 1.05, ...MID },
      { t: 9.3, z: 1.18, ...MID },
      { t: 10.9, z: 1.1, ...MID },
      { t: 12.6, z: 1.2, x: 720, y: 400 },
    ],
    eyebrow: 'Focus',
    title: 'Deep work, without the noise.',
    body: 'A calm full-screen timer with breaks, ambient sound and strict mode.',
    chime: 11.0,
  },
  {
    kind: 'feature',
    clip: 'habits',
    bars: 3,
    segments: [{ from: 1.8, to: 10.4 }],
    camera: [
      { t: 1.8, z: 1.6 },
      { t: 3.6, z: 1.6 },
      { t: 4.5, z: 1.05, ...MID },
      { t: 6.6, z: 1.05, ...MID },
      { t: 8.0, z: 1.3, x: 760, y: 430 },
    ],
    eyebrow: 'Habits',
    title: 'Streaks that keep you honest.',
    body: 'Set days or so many a week, with a full history for every habit.',
  },
  {
    kind: 'feature',
    clip: 'plan',
    bars: 3,
    segments: [
      { from: 1.8, to: 6.4 },
      { from: 6.8, to: 8.0 },
      { from: 9.2, to: 14.6 },
    ],
    camera: [
      { t: 1.8, z: 1.4 },
      { t: 4.6, z: 1.4 },
      { t: 6.0, z: 1.05, ...MID },
      { t: 7.9, z: 1.05, ...MID },
      { t: 9.6, z: 1.6 },
      { t: 14.6, z: 1.6 },
    ],
    eyebrow: 'Plan & review',
    title: 'Plan the morning. Review the night.',
    body: 'Pick today’s tasks, then rate the day and note your wins.',
  },
  {
    kind: 'feature',
    clip: 'analytics',
    bars: 3,
    segments: [{ from: 0.3, to: 9.1 }],
    camera: [
      { t: 0.3, z: 1.45, x: 560, y: 210 },
      { t: 2.5, z: 1.45, x: 560, y: 210 },
      { t: 3.4, z: 1.05, ...MID },
      { t: 5.6, z: 1.05, ...MID },
      { t: 6.8, z: 1.3, x: 720, y: 470 },
      { t: 9.1, z: 1.3, x: 720, y: 470 },
    ],
    eyebrow: 'Analytics',
    title: 'Know where your time goes.',
    body: 'Weekly and monthly reports, your best hours, and half a year of consistency.',
  },
  {
    kind: 'feature',
    clip: 'challenges',
    bars: 2,
    segments: [{ from: 0.3, to: 5.4 }],
    camera: [
      { t: 0.3, z: 1.12, x: 680, y: 330 },
      { t: 5.4, z: 1.3, x: 680, y: 380 },
    ],
    eyebrow: 'Levels & badges',
    title: 'Progress you can feel.',
    body: 'XP, daily missions and badges, all earned from what you actually did.',
  },
  {
    kind: 'feature',
    clip: 'friends',
    bars: 2,
    segments: [
      { from: 2.0, to: 4.4 },
      { from: 5.3, to: 9.2 },
    ],
    camera: [
      { t: 2.0, z: 1.6 },
      { t: 4.3, z: 1.6 },
      { t: 5.6, z: 1.05, ...MID },
      { t: 9.2, z: 1.2, x: 720, y: 470 },
    ],
    eyebrow: 'Friends',
    title: 'Better together.',
    body: 'Share what you choose, and cheer each other on.',
  },
  {
    kind: 'feature',
    clip: 'leaderboard',
    bars: 2,
    segments: [{ from: 1.8, to: 5.5 }],
    camera: [
      { t: 1.8, z: 1.25, x: 480, y: 290 },
      { t: 5.5, z: 1.45, x: 480, y: 300 },
    ],
    eyebrow: 'Groups',
    title: 'Weekly boards for your crew.',
    body: 'Private groups with an invite code and a shared weekly goal.',
  },
  {
    kind: 'feature',
    clip: 'room',
    bars: 2,
    segments: [{ from: 3.6, to: 9.9 }],
    camera: [
      { t: 3.6, z: 1.45, x: 560, y: 240 },
      { t: 5.0, z: 1.45, x: 560, y: 240 },
      { t: 6.0, z: 1.05, ...MID },
      { t: 9.9, z: 1.12, ...MID },
    ],
    eyebrow: 'Focus rooms',
    title: 'Focus together, live.',
    body: 'Join a shared session and finish at the same moment.',
  },
  {
    kind: 'feature',
    clip: 'palette',
    bars: 2,
    segments: [{ from: 0.8, to: 5.6 }],
    camera: [
      { t: 0.8, z: 1.05, ...MID },
      { t: 1.6, z: 1.65, x: 725, y: 400 },
      { t: 4.0, z: 1.65, x: 725, y: 400 },
      { t: 4.8, z: 1.1, ...MID },
    ],
    eyebrow: 'Keyboard first',
    title: 'Everything, one keystroke away.',
    body: 'Ctrl K to search, jump anywhere or add a task.',
  },
  { kind: 'value', bars: 5 },
  { kind: 'outro', bars: 4 },
]

export const TOTAL_BARS = SCENES.reduce((s, x) => s + x.bars, 0)

/** Bar at which each scene starts. */
export const STARTS = SCENES.reduce<number[]>((acc, s, i) => [...acc, i ? acc[i - 1] + SCENES[i - 1].bars : 0], [])
