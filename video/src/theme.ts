import { Easing } from 'remotion'

// Cadence's own tokens (src/styles/global.css in the app), so the video matches the product.
export const C = {
  bg: '#0a0b0e',
  bgCalm: '#0c0d15',
  card: '#16181d',
  border: '#24272f',
  accent: '#7c83ff',
  accentBright: '#b4b8ff',
  accentDeep: '#343a94',
  text: '#ecedef',
  muted: '#a0a4ad',
  faint: '#80848e',
  ringFocus: '#7c83ff',
  ringTasks: '#d95926',
  ringHabits: '#199e70',
}

export const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI Variable Text', 'Segoe UI', Roboto, sans-serif"
export const DISPLAY = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI Variable Display', 'Segoe UI', Roboto, sans-serif"

export const FPS = 60
export const W = 1920
export const H = 1080
/** The music runs at 100 BPM, so a bar is 2.4 s; every scene starts on a bar line. */
export const BAR = 2.4
export const BEAT = BAR / 4
export const bars = (n: number) => Math.round(n * BAR * FPS)

/** Calm, never bouncy: the same feel as the app's motion tokens. */
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1)
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1)
export const EASE_IN = Easing.bezier(0.55, 0, 1, 0.45)
