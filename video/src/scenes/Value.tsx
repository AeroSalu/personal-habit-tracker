import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { AppWindow } from '../components/AppWindow'
import { ClipView } from '../components/ClipView'
import { CLIPS } from '../clips'
import { BEAT, C, DISPLAY, EASE_IN, EASE_OUT, FONT, FPS } from '../theme'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// Only what's true of the app today.
const POINTS = [
  ['Free to use', 'No ads and no paywall.'],
  ['On every screen', 'Installs from the browser on any device.'],
  ['Works offline', 'Changes sync the moment you’re back online.'],
  ['Private by default', 'Friends see only what you choose to share.'],
]

const PHONE_W = 300

/** Why it's worth using: the calm light theme, the phone app, and four plain promises. */
export function Value({ length, tail }: { length: number; tail: number }) {
  const frame = useCurrentFrame()
  const beat = BEAT * FPS
  const exit = interpolate(frame, [length - 4, length + tail], [0, 1], { ...clamp, easing: EASE_IN })
  const winIn = interpolate(frame, [0, 40], [0, 1], { ...clamp, easing: EASE_OUT })
  const phoneIn = interpolate(frame, [18, 64], [0, 1], { ...clamp, easing: EASE_OUT })
  const titleIn = interpolate(frame, [10, 40], [0, 1], { ...clamp, easing: EASE_OUT })
  const light = CLIPS.light
  const phone = CLIPS.phone
  const winW = 1040
  const winH = (light.view.height / light.view.width) * winW
  const phoneH = (phone.view.height / phone.view.width) * PHONE_W
  const seconds = (length + tail) / FPS

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <div style={{ position: 'absolute', left: 116, top: 230, width: 560 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 60, fontWeight: 650, letterSpacing: -1.5, lineHeight: 1.06, color: C.text, opacity: titleIn, transform: `translateY(${(1 - titleIn) * 18}px)` }}>
          Built for every day.
        </div>
        <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 30 }}>
          {POINTS.map(([head, sub], i) => {
            const k = interpolate(frame, [beat * (2 + i * 1.5), beat * (2 + i * 1.5) + 28], [0, 1], { ...clamp, easing: EASE_OUT })
            return (
              <div key={head} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', opacity: k, transform: `translateX(${(1 - k) * -24}px)` }}>
                <svg width={34} height={34} viewBox="0 0 34 34" style={{ flex: 'none', marginTop: 2 }}>
                  <circle cx={17} cy={17} r={15} fill="rgba(124,131,255,0.16)" stroke={C.accent} strokeWidth={1.5} />
                  <path d="M10.5 17.5 L15 22 L23.5 12.5" fill="none" stroke={C.accentBright} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
                </svg>
                <div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 32, fontWeight: 600, color: C.text }}>{head}</div>
                  <div style={{ marginTop: 4, fontFamily: FONT, fontSize: 21, color: C.muted }}>{sub}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 800, top: 150, opacity: winIn, transform: `translateY(${(1 - winIn) * 60 - exit * 30}px)` }}>
        <AppWindow width={winW} contentHeight={winH} light>
          <ClipView name="light" segments={[{ from: 0.4, to: 4.8 }]} seconds={seconds} width={winW} lead={1.2} clickVolume={0} />
        </AppWindow>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 830,
          top: 1080 - phoneH - 70,
          padding: 12,
          borderRadius: 54,
          background: 'linear-gradient(160deg, #2a2c33, #111216)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(180,184,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)',
          opacity: phoneIn,
          transform: `translateY(${(1 - phoneIn) * 120 - exit * 40}px) rotate(${(1 - phoneIn) * -4}deg)`,
        }}
      >
        <div style={{ position: 'relative', width: PHONE_W, height: phoneH, borderRadius: 42, overflow: 'hidden' }}>
          <ClipView name="phone" segments={[{ from: 0.3, to: 9.6 }]} seconds={seconds} width={PHONE_W} touch lead={0.6} clickVolume={0.22} />
          <div style={{ position: 'absolute', top: 10, left: '50%', width: 96, height: 26, marginLeft: -48, borderRadius: 20, background: '#000' }} />
        </div>
      </div>
      <Sequence from={0} durationInFrames={70} layout="none">
        <Audio src={staticFile('audio/whoosh.wav')} volume={0.2} />
      </Sequence>
    </AbsoluteFill>
  )
}
