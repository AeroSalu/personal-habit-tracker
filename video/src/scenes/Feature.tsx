import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { AppWindow } from '../components/AppWindow'
import { Caption } from '../components/Caption'
import { ClipView } from '../components/ClipView'
import { CLIPS } from '../clips'
import type { FeatureScene } from '../timeline'
import { EASE_IN, EASE_OUT, FPS } from '../theme'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const WIN = 1240

/** One feature: caption on the left, the app playing in a floating window on the right. */
export function Feature({ scene, index, length, tail }: { scene: FeatureScene; index: number; length: number; tail: number }) {
  const frame = useCurrentFrame()
  const clip = CLIPS[scene.clip]
  const contentH = (clip.view.height / clip.view.width) * WIN
  const enter = interpolate(frame, [0, 34], [0, 1], { ...clamp, easing: EASE_OUT })
  const exit = interpolate(frame, [length - 4, length + tail], [0, 1], { ...clamp, easing: EASE_IN })
  const seconds = length / FPS
  const drift = interpolate(frame, [0, length], [1, 1.018])
  const chime = scene.chime

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <div style={{ position: 'absolute', left: 116, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
        <Caption eyebrow={scene.eyebrow} index={index} title={scene.title} body={scene.body} out={length + tail} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 600,
          top: (1080 - contentH - WIN * 0.027) / 2,
          perspective: 2400,
        }}
      >
        <div
          style={{
            opacity: enter,
            transform: `translateX(${(1 - enter) * 90 - exit * 60}px) rotateY(${(1 - enter) * -7}deg) scale(${(0.95 + 0.05 * enter) * drift})`,
            transformOrigin: '30% 50%',
          }}
        >
          <AppWindow width={WIN} contentHeight={contentH}>
            <ClipView name={scene.clip} segments={scene.segments} seconds={seconds} camera={scene.camera} width={WIN} lead={0.25} />
          </AppWindow>
        </div>
      </div>
      {chime !== undefined && (
        <Sequence from={Math.round(sceneTimeOf(scene, chime, seconds) * FPS)} durationInFrames={140} layout="none">
          <Audio src={staticFile('audio/chime.wav')} volume={0.3} />
        </Sequence>
      )}
    </AbsoluteFill>
  )
}

/** Scene time at which a source moment plays, matching ClipView's playback. */
function sceneTimeOf(scene: FeatureScene, sourceT: number, seconds: number) {
  const lead = 0.25
  const total = scene.segments.reduce((s, g) => s + (g.to - g.from), 0)
  const speed = Math.max(1, total / (seconds - lead))
  let offset = 0
  for (const g of scene.segments) {
    if (sourceT >= g.from && sourceT <= g.to) return lead + (offset + sourceT - g.from) / speed
    offset += g.to - g.from
  }
  return lead
}
