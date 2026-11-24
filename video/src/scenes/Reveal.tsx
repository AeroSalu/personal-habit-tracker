import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { AppWindow } from '../components/AppWindow'
import { Caption } from '../components/Caption'
import { ClipView } from '../components/ClipView'
import { CLIPS, type Segment } from '../clips'
import type { Key } from '../timeline'
import { EASE_IN, EASE_OUT, FPS } from '../theme'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const WIN = 1300

/** The product appears: Today rises out of the dark and settles, caption above. */
export function Reveal({ clip, segments, camera, title, body, length, tail }: { clip: string; segments: Segment[]; camera: Key[]; title: string; body: string; length: number; tail: number }) {
  const frame = useCurrentFrame()
  const c = CLIPS[clip]
  const contentH = (c.view.height / c.view.width) * WIN
  const rise = interpolate(frame, [0, 70], [0, 1], { ...clamp, easing: EASE_OUT })
  const exit = interpolate(frame, [length - 4, length + tail], [0, 1], { ...clamp, easing: EASE_IN })

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <div style={{ position: 'absolute', top: 58, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Caption eyebrow="Meet Cadence" title={title} body={body} out={length + tail} width={1300} size={52} align="center" delay={18} />
      </div>
      <div style={{ position: 'absolute', left: (1920 - WIN) / 2, top: 292, perspective: 2000 }}>
        <div
          style={{
            opacity: rise,
            transform: `translateY(${(1 - rise) * 140 - exit * 40}px) rotateX(${(1 - rise) * 16}deg) scale(${0.94 + 0.06 * rise})`,
            transformOrigin: '50% 0%',
          }}
        >
          <AppWindow width={WIN} contentHeight={contentH}>
            <ClipView name={clip} segments={segments} seconds={length / FPS} camera={camera} width={WIN} lead={0.9} />
          </AppWindow>
        </div>
      </div>
      <Sequence from={0} durationInFrames={70} layout="none">
        <Audio src={staticFile('audio/whoosh.wav')} volume={0.2} />
      </Sequence>
    </AbsoluteFill>
  )
}
