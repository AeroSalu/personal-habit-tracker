import type { CSSProperties, ReactNode } from 'react'
import { useCurrentFrame } from 'remotion'
import { C, FONT, FPS } from '../theme'

/**
 * A floating app window: a hairline border with a slowly travelling indigo light, a soft glow
 * and a deep shadow, and a slim title bar with the app's address. Children fill the content area.
 */
export function AppWindow({
  width,
  contentHeight,
  children,
  light = false,
  style,
}: {
  width: number
  contentHeight: number
  children: ReactNode
  light?: boolean
  style?: CSSProperties
}) {
  const t = useCurrentFrame() / FPS
  const angle = (t * 40) % 360
  const bar = Math.round(width * 0.027)
  const radius = Math.round(width * 0.012)
  return (
    <div
      style={{
        position: 'relative',
        width,
        height: contentHeight + bar,
        borderRadius: radius + 1,
        padding: 1.5,
        background: `conic-gradient(from ${angle}deg, rgba(124,131,255,0.05), rgba(180,184,255,0.9) 12%, rgba(124,131,255,0.05) 30%, rgba(124,131,255,0.05) 55%, rgba(25,158,112,0.55) 68%, rgba(124,131,255,0.05) 85%)`,
        boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 80px rgba(124,131,255,0.16)`,
        boxSizing: 'content-box',
        ...style,
      }}
    >
      <div style={{ position: 'relative', width, height: contentHeight + bar, borderRadius: radius, overflow: 'hidden', background: light ? '#f5f5f7' : C.bg }}>
        <div
          style={{
            height: bar,
            display: 'flex',
            alignItems: 'center',
            gap: bar * 0.22,
            padding: `0 ${bar * 0.5}px`,
            background: light ? '#ececf0' : '#121318',
            borderBottom: `1px solid ${light ? '#dcdce2' : C.border}`,
          }}
        >
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <span key={c} style={{ width: bar * 0.28, height: bar * 0.28, borderRadius: '50%', background: c, opacity: 0.85 }} />
          ))}
          <div
            style={{
              margin: '0 auto',
              padding: `${bar * 0.1}px ${bar * 0.6}px`,
              borderRadius: bar,
              background: light ? '#ffffff' : '#1b1d23',
              color: light ? '#6a6a70' : C.faint,
              fontFamily: FONT,
              fontSize: bar * 0.36,
              letterSpacing: 0.2,
              transform: `translateX(-${bar * 0.6}px)`,
            }}
          >
            lockin-habits-aerosalu.firebaseapp.com
          </div>
        </div>
        <div style={{ position: 'relative', width, height: contentHeight, overflow: 'hidden' }}>{children}</div>
      </div>
    </div>
  )
}
