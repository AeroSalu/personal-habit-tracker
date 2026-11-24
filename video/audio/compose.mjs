// Composes the video's music and sound effects from scratch, as WAV files in public/.
// An original calm, modern track at 100 BPM (a bar is 2.4 s), so every cut in the edit can
// land on a bar line. Sections follow the video: intro, reveal, features, value, close.
import fs from 'node:fs'

const RATE = 44100
export const BPM = 100
export const BEAT = 60 / BPM
export const BAR = BEAT * 4
const BARS = 47
const LENGTH = BAR * BARS + 3

// ---- Tiny synth toolkit ----

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)
let noiseSeed = 7
function noise() {
  noiseSeed = (noiseSeed * 16807) % 2147483647
  return (noiseSeed / 2147483647) * 2 - 1
}
function buffer(seconds) {
  const n = Math.ceil(seconds * RATE)
  return [new Float32Array(n), new Float32Array(n)]
}
/** Adds a mono signal into a stereo buffer at `start` seconds with a pan of -1..1. */
function mix(out, mono, start, gain = 1, pan = 0) {
  const s = Math.floor(start * RATE)
  const l = gain * Math.cos(((pan + 1) * Math.PI) / 4)
  const r = gain * Math.sin(((pan + 1) * Math.PI) / 4)
  for (let i = 0; i < mono.length && s + i < out[0].length; i++) {
    if (s + i < 0) continue
    out[0][s + i] += mono[i] * l
    out[1][s + i] += mono[i] * r
  }
}
function lowpass(x, cutoff) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE)
  let y = 0
  for (let i = 0; i < x.length; i++) x[i] = y += a * (x[i] - y)
  return x
}
function highpass(x, cutoff) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE)
  let low = 0
  for (let i = 0; i < x.length; i++) {
    low += a * (x[i] - low)
    x[i] = x[i] - low
  }
  return x
}

/** A soft pad voice: three slightly detuned triangles, slow attack and release. */
function padNote(freq, seconds, attack = 0.9, release = 1.4) {
  const n = Math.ceil((seconds + release) * RATE)
  const x = new Float32Array(n)
  const detune = [0.996, 1, 1.004]
  const phase = detune.map(() => Math.random())
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    let v = 0
    for (let k = 0; k < 3; k++) {
      const p = (phase[k] + t * freq * detune[k]) % 1
      v += 1 - 4 * Math.abs(p - 0.5) // triangle
    }
    const env = t < attack ? t / attack : t < seconds ? 1 : Math.max(0, 1 - (t - seconds) / release)
    x[i] = (v / 3) * env * env
  }
  return lowpass(x, 1600)
}

/** A gentle pluck: sine plus a little second harmonic, quick decay. */
function pluck(freq, decay = 0.55) {
  const n = Math.ceil(decay * 3 * RATE)
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    const env = Math.min(1, t / 0.004) * Math.exp(-t / decay)
    x[i] = (Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(4 * Math.PI * freq * t)) * env
  }
  return x
}

function kick() {
  const n = Math.ceil(0.45 * RATE)
  const x = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    const f = 48 + 70 * Math.exp(-t / 0.035)
    phase += (2 * Math.PI * f) / RATE
    x[i] = Math.sin(phase) * Math.exp(-t / 0.16) * Math.min(1, t / 0.002)
  }
  return x
}

function hat(length = 0.05) {
  const n = Math.ceil(length * 3 * RATE)
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = noise() * Math.exp(-i / RATE / length)
  return highpass(highpass(x, 7000), 7000)
}

function sub(freq, seconds) {
  const n = Math.ceil(seconds * RATE)
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    const env = Math.min(1, t / 0.02) * Math.min(1, (seconds - t) / 0.08)
    x[i] = Math.sin(2 * Math.PI * freq * t) * env
  }
  return x
}

/** Filtered noise that swells into a section change. */
function riser(seconds) {
  const n = Math.ceil(seconds * RATE)
  const x = new Float32Array(n)
  let low = 0
  for (let i = 0; i < n; i++) {
    const k = i / n
    const a = 1 - Math.exp((-2 * Math.PI * (300 + 5000 * k * k)) / RATE)
    low += a * (noise() - low)
    x[i] = low * Math.pow(k, 2.2)
  }
  return x
}

/** A soft bell for big reveals. */
function bell(freq, seconds = 2.4) {
  const n = Math.ceil(seconds * RATE)
  const x = new Float32Array(n)
  const partials = [
    [1, 1, 1.2],
    [2.01, 0.35, 0.6],
    [3.02, 0.15, 0.35],
  ]
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    let v = 0
    for (const [ratio, amp, decay] of partials) v += amp * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp(-t / decay)
    x[i] = v * Math.min(1, t / 0.003)
  }
  return x
}

// ---- The song ----

// Am9 · Fmaj7 · C(add9) · G6, one chord a bar, as MIDI notes.
const CHORDS = [
  { root: 45, notes: [57, 60, 64, 67, 71] },
  { root: 41, notes: [53, 57, 60, 64, 69] },
  { root: 48, notes: [55, 60, 62, 64, 67] },
  { root: 43, notes: [55, 59, 62, 64, 67] },
]

// Sections, in bars (they match the scenes in src/timeline.ts).
const S = { reveal: 4, features: 9, value: 38, close: 43, end: 47 }

const song = buffer(LENGTH)
const pads = buffer(LENGTH)
const drums = buffer(LENGTH)

const level = (bar) => (bar < S.reveal ? 0.55 : bar < S.features ? 0.8 : bar < S.value ? 0.75 : bar < S.close ? 0.9 : 0.8)

for (let bar = 0; bar < S.end; bar++) {
  const chord = CHORDS[bar % 4]
  const t = bar * BAR
  const last = bar === S.end - 1
  const hold = last ? BAR * 2.2 : BAR + 0.15
  chord.notes.forEach((m, i) => mix(pads, padNote(mtof(m), hold, bar === 0 ? 2.2 : 0.6, last ? 3 : 1.2), t, 0.12 * level(bar), (i - 2) * 0.35))

  // Sub bass from the reveal on, on each half bar.
  if (bar >= S.reveal && bar < S.end) {
    for (let h = 0; h < 2; h++) mix(song, lowpass(sub(mtof(chord.root - 12 + 12), BAR / 2 - 0.05), 400), t + (h * BAR) / 2, 0.2 * level(bar))
  }

  // Arpeggio: eighth notes over the chord, an octave up, from the reveal; a quieter echo.
  if (bar >= S.reveal && !last) {
    const order = [0, 2, 4, 3, 1, 3, 2, 4]
    for (let e = 0; e < 8; e++) {
      if (bar < S.features && e % 2) continue
      const m = chord.notes[order[e]] + 12
      const when = t + e * (BEAT / 2)
      const g = 0.11 * level(bar) * (e % 2 ? 0.7 : 1)
      const pan = (e % 4) / 3 - 0.5
      mix(song, pluck(mtof(m)), when, g, pan)
      mix(song, lowpass(pluck(mtof(m), 0.4), 2500), when + BEAT * 0.75, g * 0.35, -pan)
    }
  }

  // Soft drums through the features and value sections.
  if (bar >= S.features && bar < S.close) {
    for (let b = 0; b < 4; b++) {
      if (b === 0 || b === 2) mix(drums, kick(), t + b * BEAT, 0.42)
      mix(drums, hat(b % 2 ? 0.06 : 0.035), t + b * BEAT + BEAT / 2, b % 2 ? 0.09 : 0.06, 0.3)
    }
  }
}

// Swells into each section change, and bells on the big moments.
for (const bar of [S.reveal, S.features, S.value, S.close]) mix(song, riser(BAR), (bar - 1) * BAR, 0.16, 0)
mix(song, bell(mtof(76)), S.reveal * BAR, 0.12, -0.2)
mix(song, bell(mtof(81)), S.close * BAR, 0.14, 0.2)
mix(song, bell(mtof(88), 3), S.close * BAR + BAR, 0.06, -0.3)

// Sidechain feel: pads dip a little under each kick.
for (let bar = S.features; bar < S.close; bar++)
  for (const b of [0, 2]) {
    const s = Math.floor((bar * BAR + b * BEAT) * RATE)
    const len = Math.floor(0.3 * RATE)
    for (let i = 0; i < len && s + i < pads[0].length; i++) {
      const g = 1 - 0.35 * Math.exp(-i / RATE / 0.12)
      pads[0][s + i] *= g
      pads[1][s + i] *= g
    }
  }

for (let c = 0; c < 2; c++)
  for (let i = 0; i < song[c].length; i++) song[c][i] += pads[c][i] + drums[c][i]

// A short room reverb: a few decaying, crossed taps.
function reverb(buf, mixAmount = 0.18) {
  const taps = [0.031, 0.047, 0.071, 0.113, 0.151, 0.197]
  const wet = [new Float32Array(buf[0].length), new Float32Array(buf[0].length)]
  taps.forEach((d, k) => {
    const s = Math.floor(d * RATE)
    const g = Math.pow(0.72, k + 1)
    for (let i = s; i < buf[0].length; i++) {
      wet[0][i] += buf[k % 2][i - s] * g
      wet[1][i] += buf[(k + 1) % 2][i - s] * g
    }
  })
  lowpass(wet[0], 3500)
  lowpass(wet[1], 3500)
  for (let c = 0; c < 2; c++) for (let i = 0; i < buf[c].length; i++) buf[c][i] += wet[c][i] * mixAmount
}
reverb(song)

// Fade in the first bar and out over the last two.
for (let c = 0; c < 2; c++)
  for (let i = 0; i < song[c].length; i++) {
    const t = i / RATE
    const fadeIn = Math.min(1, t / 1.2)
    const fadeOut = Math.min(1, Math.max(0, (LENGTH - 0.4 - t) / (BAR * 1.6)))
    song[c][i] *= fadeIn * fadeOut
  }

// ---- Writing ----

function writeWav(path, buf, peak = 0.89) {
  let max = 0
  for (const ch of buf) for (const v of ch) max = Math.max(max, Math.abs(v))
  const g = max ? peak / max : 1
  const n = buf[0].length
  const out = Buffer.alloc(44 + n * 4)
  out.write('RIFF', 0)
  out.writeUInt32LE(36 + n * 4, 4)
  out.write('WAVEfmt ', 8)
  out.writeUInt32LE(16, 16)
  out.writeUInt16LE(1, 20)
  out.writeUInt16LE(2, 22)
  out.writeUInt32LE(RATE, 24)
  out.writeUInt32LE(RATE * 4, 28)
  out.writeUInt16LE(4, 32)
  out.writeUInt16LE(16, 34)
  out.write('data', 36)
  out.writeUInt32LE(n * 4, 40)
  for (let i = 0; i < n; i++) {
    // Gentle soft clip keeps peaks round.
    for (let c = 0; c < 2; c++) out.writeInt16LE(Math.round(Math.tanh(buf[c][i] * g) * 32000), 44 + i * 4 + c * 2)
  }
  fs.writeFileSync(path, out)
  console.log(`${path}: ${(n / RATE).toFixed(1)} s`)
}

fs.mkdirSync('public/audio', { recursive: true })
writeWav('public/audio/music.wav', song)

// Sound effects, kept short and quiet; the edit sets their levels.
const click = buffer(0.12)
const tick = new Float32Array(Math.ceil(0.12 * RATE))
for (let i = 0; i < tick.length; i++) {
  const t = i / RATE
  tick[i] = (0.6 * noise() * Math.exp(-t / 0.004) + Math.sin(2 * Math.PI * 1900 * t) * Math.exp(-t / 0.018)) * Math.min(1, t / 0.0008)
}
mix(click, highpass(tick, 900), 0, 1)
writeWav('public/audio/click.wav', click, 0.8)

const whoosh = buffer(1.1)
const w = new Float32Array(Math.ceil(1.0 * RATE))
let low = 0
for (let i = 0; i < w.length; i++) {
  const k = i / w.length
  const a = 1 - Math.exp((-2 * Math.PI * (500 + 3500 * Math.sin(Math.PI * k))) / RATE)
  low += a * (noise() - low)
  w[i] = low * Math.sin(Math.PI * k) ** 2
}
mix(whoosh, highpass(w, 250), 0, 1, -0.2)
writeWav('public/audio/whoosh.wav', whoosh, 0.8)

const chime = buffer(2.4)
mix(chime, bell(mtof(84), 2.2), 0, 1, -0.15)
mix(chime, bell(mtof(91), 2.2), 0.07, 0.6, 0.15)
writeWav('public/audio/chime.wav', chime, 0.8)
