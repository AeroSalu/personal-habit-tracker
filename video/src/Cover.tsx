import { AbsoluteFill, Img, staticFile } from 'remotion'
import { AppWindow } from './components/AppWindow'
import { Background } from './components/Background'
import { Logo } from './components/Logo'
import { CLIPS } from './clips'
import { C, DISPLAY, FONT } from './theme'

/** The post's cover image: the mark, the name, one line, and Today in a window. */
export function Cover() {
  const today = CLIPS.today
  const win = 1060
  const h = (today.view.height / today.view.width) * win
  // Today with its rings full on screen, near the end of the take.
  const frame = today.frames[today.frames.length - 1][0]
  return (
    <AbsoluteFill>
      <Background />
      <div style={{ position: 'absolute', left: 110, top: 300, width: 640 }}>
        <Logo size={110} still draw={-600} />
        <div style={{ marginTop: 30, fontFamily: DISPLAY, fontSize: 104, fontWeight: 700, letterSpacing: -3.4, color: C.text }}>Cadence</div>
        <div style={{ marginTop: 14, fontFamily: DISPLAY, fontSize: 40, fontWeight: 500, lineHeight: 1.2, color: C.muted }}>
          Tasks, focus and habits
          <br />
          in one calm place.
        </div>
        <div style={{ marginTop: 34, fontFamily: FONT, fontSize: 22, letterSpacing: 2.4, textTransform: 'uppercase', color: C.accentBright }}>Product demo · 1:53</div>
      </div>
      <div style={{ position: 'absolute', left: 750, top: (1080 - h - 30) / 2 }}>
        <AppWindow width={win} contentHeight={h}>
          <Img src={staticFile(`captures/today/frames/${frame}`)} style={{ width: win, height: h }} />
        </AppWindow>
      </div>
    </AbsoluteFill>
  )
}
