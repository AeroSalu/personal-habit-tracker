import { interpolate, useCurrentFrame } from 'remotion'
import { C, EASE_OUT, FPS } from '../theme'

const SLICES = 10

/**
 * The Cadence mark (as in the app's Logo.tsx): an indigo ring of stacked slices in real 3D,
 * with the check drawing itself in. Driven by the frame, so it renders identically every time.
 * `draw` is the frame the ring starts drawing; `still` freezes the orbit.
 */
export function Logo({ size = 160, draw = 0, still = false }: { size?: number; draw?: number; still?: boolean }) {
  const frame = useCurrentFrame()
  const local = frame - draw
  const ring = interpolate(local, [0, FPS * 1.1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT })
  const check = interpolate(local, [FPS * 0.7, FPS * 1.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT })
  const t = still ? 0 : frame / FPS
  const tiltY = still ? -16 : -18 + Math.sin(t * 0.7) * 16
  const tiltX = still ? 8 : 10 + Math.sin(t * 0.5 + 1) * 5
  const float = still ? 0 : Math.sin(t * 1.1) * size * 0.02
  const depth = size * 0.14
  const sheen = ((t * 0.45) % 1.6) - 0.3

  return (
    <div style={{ width: size, height: size, perspective: size * 6, transform: `translateY(${float}px)` }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)` }}>
        {Array.from({ length: SLICES }, (_, i) => (
          <svg key={i} viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, transform: `translateZ(${-depth / 2 + (depth * i) / SLICES}px)` }}>
            <circle cx="50" cy="50" r="38" fill="none" stroke={C.accentDeep} strokeWidth={11} pathLength={1} strokeDasharray={`${ring} 1`} transform="rotate(-90 50 50)" />
          </svg>
        ))}
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, transform: `translateZ(${depth / 2}px)`, overflow: 'visible' }}>
          <defs>
            <linearGradient id="logo-face" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={C.accentBright} />
              <stop offset="0.55" stopColor={C.accent} />
              <stop offset="1" stopColor={C.accentDeep} />
            </linearGradient>
            <linearGradient id="logo-sheen" x1={sheen - 0.25} y1="0" x2={sheen + 0.25} y2="0.4">
              <stop offset="0" stopColor="#fff" stopOpacity={0} />
              <stop offset="0.5" stopColor="#fff" stopOpacity={0.6} />
              <stop offset="1" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="38" fill="none" stroke="url(#logo-face)" strokeWidth={11} pathLength={1} strokeDasharray={`${ring} 1`} transform="rotate(-90 50 50)" strokeLinecap="round" />
          {!still && <circle cx="50" cy="50" r="38" fill="none" stroke="url(#logo-sheen)" strokeWidth={11} pathLength={1} strokeDasharray={`${ring} 1`} transform="rotate(-90 50 50)" />}
        </svg>
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, transform: `translateZ(${depth / 2 + size * 0.04}px)` }}>
          <path d="M33 51 L45 63 L68 39" fill="none" stroke={C.text} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - check} />
        </svg>
      </div>
    </div>
  )
}
