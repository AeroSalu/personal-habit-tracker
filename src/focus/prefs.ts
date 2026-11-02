import { PRESETS, type FocusLink, type Plan, type PresetId } from '../lib/focus'
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

/** A session plan from the remembered choices, for one-tap starts such as the dashboard's. */
export function planFromPrefs(prefs: FocusPrefs, link: FocusLink): Plan {
  const preset = PRESETS.find((p) => p.id === prefs.preset)
  return preset
    ? { preset: preset.id, focusMinutes: preset.focus, shortBreak: preset.short, longBreak: preset.long, strict: prefs.strict, link }
    : {
        preset: 'custom',
        focusMinutes: prefs.customFocus,
        shortBreak: prefs.customShort,
        longBreak: prefs.customLong,
        strict: prefs.strict,
        link,
      }
}

export function savePrefs(prefs: FocusPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // Private windows can refuse storage; the choices just won't be remembered.
  }
}
