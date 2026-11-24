import { interpolate, useCurrentFrame } from 'remotion'
import { C, DISPLAY, EASE_OUT, FONT } from '../theme'

const rise = (frame: number, at: number, dur = 26) => interpolate(frame, [at, at + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT })

/**
 * A feature caption: a small numbered eyebrow, a title whose words rise in one after another,
 * and a line of plain explanation. Everything fades out together at `out`.
 */
export function Caption({
  eyebrow,
  index,
  title,
  body,
  delay = 8,
  out,
  width = 440,
  size = 56,
  align = 'left',
}: {
  eyebrow?: string
  index?: number
  title: string
  body: string
  delay?: number
  out: number
  width?: number
  size?: number
  align?: 'left' | 'center'
}) {
  const frame = useCurrentFrame()
  const leave = interpolate(frame, [out - 20, out], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const words = title.split(' ')
  const eyebrowIn = rise(frame, delay)
  const bodyIn = rise(frame, delay + 10 + words.length * 4, 30)
  return (
    <div style={{ width, textAlign: align, opacity: leave, transform: `translateY(${(1 - leave) * -10}px)` }}>
      {eyebrow && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 22,
            opacity: eyebrowIn,
            transform: `translateY(${(1 - eyebrowIn) * 14}px)`,
            fontFamily: FONT,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 2.4,
            textTransform: 'uppercase',
            color: C.accentBright,
          }}
        >
          {index !== undefined && <span style={{ color: C.faint, fontVariantNumeric: 'tabular-nums' }}>{String(index).padStart(2, '0')}</span>}
          {index !== undefined && <span style={{ width: 28, height: 1.5, background: 'rgba(180,184,255,0.45)' }} />}
          {eyebrow}
        </div>
      )}
      <div style={{ fontFamily: DISPLAY, fontSize: size, fontWeight: 650, lineHeight: 1.08, letterSpacing: -size * 0.025, color: C.text }}>
        {words.map((w, i) => {
          const k = rise(frame, delay + 6 + i * 4, 30)
          return (
            <span key={i} style={{ display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * 22}px)`, filter: `blur(${(1 - k) * 6}px)`, whiteSpace: 'pre' }}>
              {w}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          )
        })}
      </div>
      <div style={{ marginTop: 22, fontFamily: FONT, fontSize: size * 0.42, lineHeight: 1.45, color: C.muted, opacity: bodyIn, transform: `translateY(${(1 - bodyIn) * 12}px)` }}>{body}</div>
    </div>
  )
}
