import { useId, type CSSProperties } from 'react'
import styles from './Logo.module.css'

/** Ring slices stacked in depth; more slices read as a smoother edge. */
const SLICES = 8

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The Cadence mark: an indigo ring around a check, built in real 3D from stacked SVG slices
 * (CSS `preserve-3d`, no 3D library). `animated` adds a slow orbit, a gentle float, a light
 * sweep across the ring and the check drawing itself in; reduced motion always gets the still
 * version, which sits at a slight tilt.
 */
export function Logo({ size = 24, animated = false }: { size?: number; animated?: boolean }) {
  const id = useId().replace(/:/g, '')
  const moving = animated && !reducedMotion()
  const depth = Math.max(2, size * 0.14)

  return (
    <span
      className={`${styles.logo} ${moving ? styles.animated : ''}`}
      style={{ '--size': `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      {moving && <span className={styles.shadow} />}
      <span className={styles.float}>
        <span className={styles.spin}>
          {Array.from({ length: SLICES }, (_, i) => (
            <svg
              key={i}
              className={styles.layer}
              viewBox="0 0 100 100"
              style={{ transform: `translateZ(${-depth / 2 + (depth * i) / SLICES}px)` }}
            >
              <circle cx="50" cy="50" r="38" className={styles.edge} />
            </svg>
          ))}

          <svg className={styles.layer} viewBox="0 0 100 100" style={{ transform: `translateZ(${depth / 2}px)` }}>
            <defs>
              <linearGradient id={`face-${id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" style={{ stopColor: 'var(--accent-bright)' }} />
                <stop offset="0.55" style={{ stopColor: 'var(--accent)' }} />
                <stop offset="1" style={{ stopColor: 'var(--accent-deep)' }} />
              </linearGradient>
              <linearGradient id={`sheen-${id}`} x1="0" y1="0" x2="1" y2="0.4">
                <stop offset="0.35" style={{ stopColor: 'var(--highlight)', stopOpacity: 0 }} />
                <stop offset="0.5" style={{ stopColor: 'var(--highlight)' }} />
                <stop offset="0.65" style={{ stopColor: 'var(--highlight)', stopOpacity: 0 }} />
                {moving && (
                  <animateTransform
                    attributeName="gradientTransform"
                    type="translate"
                    values="-1.2 0; 1.2 0; 1.2 0"
                    keyTimes="0; 0.35; 1"
                    dur="6s"
                    repeatCount="indefinite"
                  />
                )}
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="38" className={styles.face} stroke={`url(#face-${id})`} />
            {moving && <circle cx="50" cy="50" r="38" className={styles.face} stroke={`url(#sheen-${id})`} />}
          </svg>

          <svg
            className={styles.layer}
            viewBox="0 0 100 100"
            style={{ transform: `translateZ(${depth / 2 + Math.max(1, size * 0.04)}px)` }}
          >
            <path d="M33 51 L45 63 L68 39" className={styles.check} pathLength={1} />
          </svg>
        </span>
      </span>
    </span>
  )
}
