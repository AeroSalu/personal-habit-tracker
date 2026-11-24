import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { Logo } from '../components/Logo'
import { C, DISPLAY, EASE_OUT, FONT } from '../theme'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** The mark, the name, the promise, and where to try it. Ends in a slow fade to black. */
export function Outro({ length }: { length: number }) {
  const frame = useCurrentFrame()
  const k = (a: number, d = 36) => interpolate(frame, [a, a + d], [0, 1], { ...clamp, easing: EASE_OUT })
  const name = k(36)
  const tag = k(64)
  const cta = k(110)
  const fade = interpolate(frame, [length - 70, length], [1, 0], clamp)
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: fade }}>
      <Logo size={170} draw={4} />
      <div style={{ marginTop: 36, fontFamily: DISPLAY, fontSize: 96, fontWeight: 700, letterSpacing: -3.2, color: C.text, opacity: name, transform: `translateY(${(1 - name) * 18}px)` }}>Cadence</div>
      <div style={{ marginTop: 10, fontFamily: DISPLAY, fontSize: 40, fontWeight: 500, letterSpacing: -0.6, color: C.muted, opacity: tag, transform: `translateY(${(1 - tag) * 14}px)` }}>
        Find your rhythm. Do the work that matters.
      </div>
      <div style={{ marginTop: 54, display: 'flex', alignItems: 'center', gap: 18, opacity: cta, transform: `translateY(${(1 - cta) * 14}px)` }}>
        <div style={{ padding: '16px 30px', borderRadius: 999, background: C.accent, color: '#0e0f12', fontFamily: FONT, fontSize: 26, fontWeight: 650 }}>Try it free</div>
        <div style={{ padding: '15px 26px', borderRadius: 999, border: `1.5px solid ${C.border}`, background: 'rgba(22,24,29,0.8)', color: C.text, fontFamily: FONT, fontSize: 24 }}>
          lockin-habits-aerosalu.firebaseapp.com
        </div>
      </div>
    </AbsoluteFill>
  )
}
