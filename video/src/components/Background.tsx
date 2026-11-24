import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { C, FPS } from '../theme'

/**
 * A deep graphite stage: two soft glows in the product's ring colours drifting slowly,
 * a faint dot grid for depth, and a vignette. Quiet enough that the app stays the subject.
 */
export function Background({ warmth = 1 }: { warmth?: number }) {
  const t = useCurrentFrame() / FPS
  const a = { x: 30 + Math.sin(t * 0.11) * 10, y: 30 + Math.cos(t * 0.09) * 8 }
  const b = { x: 72 + Math.cos(t * 0.08) * 9, y: 70 + Math.sin(t * 0.1) * 8 }
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(42% 52% at ${a.x}% ${a.y}%, rgba(124,131,255,${0.2 * warmth}), transparent 70%),
            radial-gradient(38% 46% at ${b.x}% ${b.y}%, rgba(25,158,112,${0.09 * warmth}), transparent 70%),
            radial-gradient(30% 40% at ${100 - a.x}% ${b.y - 40}%, rgba(217,89,38,${0.05 * warmth}), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1.2px)',
          backgroundSize: '36px 36px',
          backgroundPosition: `${(t * 4) % 36}px ${(t * 2) % 36}px`,
          maskImage: 'radial-gradient(70% 70% at 50% 50%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(70% 70% at 50% 50%, black, transparent)',
        }}
      />
      <AbsoluteFill style={{ background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.55))' }} />
    </AbsoluteFill>
  )
}
