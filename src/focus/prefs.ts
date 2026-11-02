import type { PresetId } from '../lib/focus'
import { SOUNDS, type Sound } from './sound'

/** Per-device choices remembered between sessions. */
export type FocusPrefs = {
  preset: PresetId
  customFocus: number
  customShort: number
  customLong: number
  strict: boolean
  sound: Sound
}

const KEY = 'lockin.focusPrefs'

const DEFAULTS: FocusPrefs = {
  preset: '25/5',
  customFocus: 40,
  customShort: 8,
  customLong: 20,
  strict: false,
  sound: 'off',
}

export function loadPrefs(): FocusPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<FocusPrefs>
    const prefs = { ...DEFAULTS, ...saved }
    if (!SOUNDS.includes(prefs.sound)) prefs.sound = 'off'
    return prefs
  } catch {
    return DEFAULTS
  }
}

export function savePrefs(prefs: FocusPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // Private windows can refuse storage; the choices just won't be remembered.
  }
}
