import { Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { CLIPS, frameAt, mouseAt, playback, type Segment } from '../clips'
import type { Key } from '../timeline'
import { C, EASE_IN_OUT, FPS } from '../theme'

/**
 * Plays a recorded clip at `width` pixels wide: the real frames, a camera that eases between
 * keyframes (never showing past the page's edges), and a cursor with click ripples drawn from
 * the recorded mouse log. Click sounds land on the recorded clicks.
 */
export function ClipView({
  name,
  segments,
  seconds,
  camera = [],
  width,
  touch = false,
  lead = 0,
  clickVolume = 0.32,
}: {
  name: string
  segments: Segment[]
  seconds: number
  camera?: Key[]
  width: number
  touch?: boolean
  /** Seconds to hold the first frame before playing. */
  lead?: number
  clickVolume?: number
}) {
  const clip = CLIPS[name]
  const frame = useCurrentFrame()
  const play = playback(segments, seconds - lead)
  const ts = play.source(Math.max(0, frame / FPS - lead))
  const s = width / clip.view.width
  const height = clip.view.height * s

  // Camera: ease between the two keyframes around now.
  const keys = camera.map((k) => {
    const m = k.x === undefined ? mouseAt(clip, k.t) : { x: k.x, y: k.y ?? 0 }
    return { t: k.t, z: k.z, x: m.x, y: m.y }
  })
  let cam = { z: 1, x: clip.view.width / 2, y: clip.view.height / 2 }
  if (keys.length) {
    const i = keys.findIndex((k) => k.t > ts)
    if (i === -1) cam = keys[keys.length - 1]
    else if (i === 0) cam = keys[0]
    else {
      const a = keys[i - 1]
      const b = keys[i]
      const k = EASE_IN_OUT(Math.min(1, Math.max(0, (ts - a.t) / (b.t - a.t))))
      cam = { z: a.z + (b.z - a.z) * k, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
    }
  }
  const z = cam.z
  const shownW = width * z
  const shownH = height * z
  const ox = Math.min(0, Math.max(width - shownW, width / 2 - cam.x * s * z))
  const oy = Math.min(0, Math.max(height - shownH, height / 2 - cam.y * s * z))
  const at = (x: number, y: number) => ({ x: ox + x * s * z, y: oy + y * s * z })

  const mouse = mouseAt(clip, ts)
  const p = at(mouse.x, mouse.y)
  const recent = clip.clicks.filter(([t]) => ts >= t && ts - t < 0.7)
  const press = clip.clicks.some(([t]) => ts >= t && ts - t < 0.14)
  const cursorSize = 30 * Math.min(1.4, Math.max(0.9, s * z))
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' })

  // Click sounds, placed in scene time.
  const sounds = clip.clicks
    .map(([t]) => play.scene(t))
    .filter((x): x is number => x !== null)
    .map((x) => Math.round((x + lead) * FPS))
    .filter((f, i, a) => a.indexOf(f) === i && f < seconds * FPS)

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', background: C.bg }}>
      <Img
        src={staticFile(`captures/${name}/frames/${frameAt(clip, ts)}`)}
        style={{ position: 'absolute', left: ox, top: oy, width: shownW, height: shownH }}
      />
      {recent.map(([t, x, y]) => {
        const k = (ts - t) / 0.7
        const c = at(x, y)
        const r = (touch ? 18 : 10) + 34 * EASE_IN_OUT(k)
        return (
          <div
            key={t}
            style={{
              position: 'absolute',
              left: c.x - r,
              top: c.y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              border: `2px solid ${C.accentBright}`,
              background: touch ? 'rgba(255,255,255,0.16)' : 'rgba(124,131,255,0.12)',
              opacity: (1 - k) * 0.9,
            }}
          />
        )
      })}
      {!touch && (
        <svg
          viewBox="0 0 24 24"
          width={cursorSize}
          height={cursorSize}
          style={{
            position: 'absolute',
            left: p.x - cursorSize * 0.22,
            top: p.y - cursorSize * 0.12,
            opacity: fadeIn,
            transform: `scale(${press ? 0.86 : 1})`,
            transformOrigin: '22% 12%',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))',
          }}
        >
          <path d="M5.3 2.6 L19.6 13.2 L12.6 13.9 L16.4 21 L13.6 22.3 L9.9 15.1 L5.3 19.6 Z" fill="#fff" stroke="#111" strokeWidth={1.3} strokeLinejoin="round" />
        </svg>
      )}
      {sounds.map((f) => (
        <Sequence key={f} from={f} durationInFrames={20} layout="none">
          <Audio src={staticFile('audio/click.wav')} volume={clickVolume} />
        </Sequence>
      ))}
    </div>
  )
}
