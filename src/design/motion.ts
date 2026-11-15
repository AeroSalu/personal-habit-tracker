// Motion tokens for Motion (motion/react), matching the CSS ones in src/styles/global.css.
// Durations are in seconds here. Use these, never literal timings or easings.

export const dur = {
  instant: 0.1,
  quick: 0.16,
  standard: 0.25,
  emphasized: 0.35,
  expressive: 0.5,
  extended: 0.8,
} as const

export const ease = {
  standard: [0.4, 0, 0.2, 1],
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
} as const

/**
 * For things that move with the hand or settle into place: sheets, cards expanding, drags,
 * gliding selections. Critically damped (damping ≥ 2·√stiffness), so it settles without overshoot.
 */
export const spring = { type: 'spring', damping: 30, stiffness: 220, mass: 1 } as const

/** A firmer spring for small indicators that should arrive without wobble. */
export const snappy = { type: 'spring', damping: 30, stiffness: 380, mass: 0.8 } as const
