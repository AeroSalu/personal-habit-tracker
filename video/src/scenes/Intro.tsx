import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { Logo } from '../components/Logo'
import { BEAT, C, DISPLAY, EASE_OUT, FONT, FPS, bars } from '../theme'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** The problem in three short lines, then the mark draws itself and the name arrives. */
export function Intro({ length }: { length: number }) {
  const frame = useCurrentFrame()
  const beat = BEAT * FPS
  const lines = ['Tasks in one app.', 'Habits in another.', 'A timer in a third.']
  const problemOut = interpolate(frame, [bars(1.75), bars(2)], [1, 0], clamp)
  const logoAt = bars(2)
  const nameIn = interpolate(frame, [logoAt + 40, logoAt + 80], [0, 1], { ...clamp, easing: EASE_OUT })
  const tagIn = interpolate(frame, [logoAt + 70, logoAt + 110], [0, 1], { ...clamp, easing: EASE_OUT })
  const leave = interpolate(frame, [length - 24, length], [1, 0], clamp)
  const logoScale = interpolate(frame, [logoAt, logoAt + 90], [0.82, 1], { ...clamp, easing: EASE_OUT })

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: leave }}>
      {frame < bars(2.1) && (
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', gap: 18, opacity: problemOut, filter: `blur(${(1 - problemOut) * 8}px)` }}>
          {lines.map((l, i) => {
            const at = beat * (1 + i * 1.5)
            const k = interpolate(frame, [at, at + 30], [0, 1], { ...clamp, easing: EASE_OUT })
            return (
              <div key={l} style={{ fontFamily: DISPLAY, fontSize: 64, fontWeight: 600, letterSpacing: -1.6, color: i === 2 ? C.text : C.muted, opacity: k, transform: `translateY(${(1 - k) * 24}px)` }}>
                {l}
              </div>
            )
          })}
          {(() => {
            const at = beat * 5.6
            const k = interpolate(frame, [at, at + 30], [0, 1], { ...clamp, easing: EASE_OUT })
            return (
              <div style={{ marginTop: 18, fontFamily: FONT, fontSize: 30, color: C.accentBright, opacity: k, transform: `translateY(${(1 - k) * 16}px)` }}>
                What if it all moved to one rhythm?
              </div>
            )
          })()}
        </div>
      )}
      {frame >= logoAt - 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ transform: `scale(${logoScale})` }}>
            <Logo size={190} draw={logoAt} />
          </div>
          <div style={{ marginTop: 40, fontFamily: DISPLAY, fontSize: 104, fontWeight: 700, letterSpacing: -3.5, color: C.text, opacity: nameIn, transform: `translateY(${(1 - nameIn) * 20}px)` }}>Cadence</div>
          <div style={{ marginTop: 14, fontFamily: FONT, fontSize: 32, color: C.muted, opacity: tagIn, transform: `translateY(${(1 - tagIn) * 14}px)` }}>
            Plan, focus and build habits in one calm place.
          </div>
        </div>
      )}
      <Sequence from={logoAt + 10} durationInFrames={150} layout="none">
        <Audio src={staticFile('audio/chime.wav')} volume={0.35} />
      </Sequence>
    </AbsoluteFill>
  )
}
