import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion'
import { Background } from './components/Background'
import { Feature } from './scenes/Feature'
import { Intro } from './scenes/Intro'
import { Outro } from './scenes/Outro'
import { Reveal } from './scenes/Reveal'
import { Value } from './scenes/Value'
import { SCENES, STARTS, TOTAL_BARS } from './timeline'
import { FPS, bars } from './theme'

/** Frames each scene keeps playing past its bar line while the next one fades in. */
const TAIL = 18

export const DURATION = bars(TOTAL_BARS)

export function CadenceDemo() {
  let feature = 0
  return (
    <AbsoluteFill>
      <Background />
      {SCENES.map((scene, i) => {
        const from = bars(STARTS[i])
        const length = bars(scene.bars)
        const last = i === SCENES.length - 1
        const tail = last ? 0 : TAIL
        let body
        if (scene.kind === 'intro') body = <Intro length={length} />
        else if (scene.kind === 'reveal') body = <Reveal {...scene} length={length} tail={tail} />
        else if (scene.kind === 'feature') body = <Feature scene={scene} index={++feature} length={length} tail={tail} />
        else if (scene.kind === 'value') body = <Value length={length} tail={tail} />
        else body = <Outro length={length} />
        return (
          <Sequence key={i} from={from} durationInFrames={length + tail} name={scene.kind === 'feature' ? scene.clip : scene.kind}>
            {body}
          </Sequence>
        )
      })}
      <Audio
        src={staticFile('audio/music.wav')}
        volume={(f) => interpolate(f, [0, FPS * 0.5, DURATION - FPS * 2, DURATION], [0, 0.62, 0.62, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
    </AbsoluteFill>
  )
}
