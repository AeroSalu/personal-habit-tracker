// Ambient noise and the end chime, generated with Web Audio so there are no audio files to
// ship or license. Browsers only allow sound after a tap, so `unlockAudio` runs on Start.

export const SOUNDS = ['off', 'rain', 'white', 'brown'] as const
export type Sound = (typeof SOUNDS)[number]

export const SOUND_LABEL: Record<Sound, string> = { off: 'Off', rain: 'Rain', white: 'White noise', brown: 'Brown noise' }

let ctx: AudioContext | null = null

export function unlockAudio() {
  if (!ctx && typeof AudioContext !== 'undefined') ctx = new AudioContext()
  ctx?.resume().catch(() => {})
}

function noise(audio: AudioContext, kind: 'white' | 'brown' | 'pink'): AudioBuffer {
  const length = audio.sampleRate * 4
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  let b0 = 0
  let b1 = 0
  let b2 = 0
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1
    if (kind === 'white') data[i] = white * 0.35
    else if (kind === 'brown') {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    } else {
      // Paul Kellet's economy pink filter.
      b0 = 0.99765 * b0 + white * 0.099046
      b1 = 0.963 * b1 + white * 0.2965164
      b2 = 0.57 * b2 + white * 1.0526913
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12
    }
  }
  return buffer
}

/** Starts looping ambient sound and returns a function that fades it out. */
export function playAmbient(sound: Exclude<Sound, 'off'>, volume = 0.5): () => void {
  if (!ctx) return () => {}
  const audio = ctx
  const source = audio.createBufferSource()
  source.buffer = noise(audio, sound === 'rain' ? 'pink' : sound)
  source.loop = true

  const gain = audio.createGain()
  gain.gain.setValueAtTime(0, audio.currentTime)
  gain.gain.linearRampToValueAtTime(volume, audio.currentTime + 1.2)

  let tail: AudioNode = source
  if (sound === 'rain') {
    // Soften pink noise into a rain-like hiss with a slow swell.
    const band = audio.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 1800
    band.Q.value = 0.4
    const swell = audio.createOscillator()
    const depth = audio.createGain()
    swell.frequency.value = 0.12
    depth.gain.value = volume * 0.25
    swell.connect(depth).connect(gain.gain)
    swell.start()
    source.connect(band)
    tail = band
    source.addEventListener('ended', () => swell.stop())
  }
  tail.connect(gain).connect(audio.destination)
  source.start()

  return () => {
    const t = audio.currentTime
    gain.gain.cancelScheduledValues(t)
    gain.gain.setValueAtTime(gain.gain.value, t)
    gain.gain.linearRampToValueAtTime(0, t + 0.4)
    source.stop(t + 0.45)
  }
}

export function chime() {
  if (!ctx) return
  const audio = ctx
  ;[523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    const at = audio.currentTime + i * 0.18
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.22, at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.9)
    osc.connect(gain).connect(audio.destination)
    osc.start(at)
    osc.stop(at + 0.9)
  })
}
