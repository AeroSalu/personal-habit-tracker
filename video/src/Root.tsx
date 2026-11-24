import { Composition, Still } from 'remotion'
import { Cover } from './Cover'
import { CadenceDemo, DURATION } from './Video'
import { FPS, H, W } from './theme'

export function Root() {
  return (
    <>
      <Composition id="CadenceDemo" component={CadenceDemo} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
      <Still id="Cover" component={Cover} width={W} height={H} />
    </>
  )
}
