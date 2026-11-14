// Light, dark or follow the device, chosen per device. The same logic runs inline in
// index.html before first paint so a reload never flashes the wrong theme.

export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = 'lockin.theme'
const BAR = { light: '#f7f7f8', dark: '#0e0f12' }
const prefersLight = () => window.matchMedia('(prefers-color-scheme: light)').matches

export function loadTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

/** Applies a choice to the page: the `data-theme` stamp and the browser bar color. */
export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
  const resolved = choice === 'system' ? (prefersLight() ? 'light' : 'dark') : choice
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR[resolved])
}

export function saveTheme(choice: ThemeChoice) {
  try {
    if (choice === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, choice)
  } catch {
    // Without storage the choice lasts until the next reload.
  }
  applyTheme(choice)
}

/** Keeps the browser bar in step when the device switches between light and dark. */
export function watchSystemTheme() {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (loadTheme() === 'system') applyTheme('system')
  })
}
