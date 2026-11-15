// Light touch feedback through the Vibration API. Only Android browsers support it; iOS Safari
// has no haptics for web apps, so there it quietly does nothing. People can turn it off per
// device in Settings → Preferences.

const KEY = 'lockin.haptics'

const PATTERNS = {
  /** A completion tick or a picked-up card: one short tap. */
  tap: 10,
  /** A finished focus session: two soft pulses. */
  success: [14, 60, 22],
} as const

export type Haptic = keyof typeof PATTERNS

export function hapticsOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setHapticsOn(on: boolean) {
  try {
    if (on) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, 'off')
  } catch {
    // Without storage the setting lasts until the page reloads.
  }
}

/** Whether this device can vibrate at all, so Settings only offers the switch where it works. */
export const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export function haptic(kind: Haptic) {
  if (!canVibrate() || !hapticsOn()) return
  try {
    navigator.vibrate(PATTERNS[kind] as number | number[])
  } catch {
    // Some browsers refuse vibration without a recent tap; nothing to do.
  }
}
