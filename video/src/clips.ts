import data from './clips.json'

export type Clip = {
  view: { width: number; height: number }
  scale: number
  span: number
  /** [file, seconds from the first frame] */
  frames: [string, number][]
  /** [seconds, x, y] in CSS pixels of the recorded viewport */
  moves: [number, number, number][]
  clicks: [number, number, number][]
  marks: Record<string, number>
}

export const CLIPS = data as unknown as Record<string, Clip>

/** The last item whose time is at or before `t`. */
export function lastAt<T extends [unknown, number, ...unknown[]] | [number, ...unknown[]]>(list: T[], t: number, key: (x: T) => number): number {
  let lo = 0
  let hi = list.length - 1
  if (hi < 0 || key(list[0]) > t) return 0
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (key(list[mid]) <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

export function frameAt(clip: Clip, t: number): string {
  return clip.frames[lastAt(clip.frames, t, (f) => f[1])][0]
}

/** Where the mouse was at `t`, interpolated between logged moves. */
export function mouseAt(clip: Clip, t: number): { x: number; y: number } {
  const m = clip.moves
  const i = lastAt(m, t, (e) => e[0])
  const a = m[i]
  const b = m[i + 1]
  if (!b || b[0] === a[0] || t <= a[0]) return { x: a[1], y: a[2] }
  const k = Math.min(1, (t - a[0]) / (b[0] - a[0]))
  return { x: a[1] + (b[1] - a[1]) * k, y: a[2] + (b[2] - a[2]) * k }
}

export type Segment = { from: number; to: number }

/**
 * Plays the segments back to back so they fill `seconds`, speeding up only as much as
 * needed (never slowing down). Returns source time for a scene time, and the inverse for clicks.
 */
export function playback(segments: Segment[], seconds: number) {
  const total = segments.reduce((s, g) => s + (g.to - g.from), 0)
  const speed = Math.max(1, total / seconds)
  const source = (sceneT: number) => {
    let p = Math.max(0, sceneT * speed)
    for (const g of segments) {
      const len = g.to - g.from
      if (p <= len) return g.from + p
      p -= len
    }
    const last = segments[segments.length - 1]
    return last.to
  }
  const scene = (sourceT: number): number | null => {
    let offset = 0
    for (const g of segments) {
      if (sourceT >= g.from && sourceT <= g.to) return (offset + sourceT - g.from) / speed
      offset += g.to - g.from
    }
    return null
  }
  return { speed, source, scene }
}
