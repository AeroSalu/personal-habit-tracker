import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFocus } from '../focus/focusContext'
import { loadPrefs, planFromPrefs } from '../focus/prefs'

/** The keys, for the help sheet. Ctrl+K works everywhere; the rest not while typing. */
export const SHORTCUTS: { keys: string; does: string }[] = [
  { keys: 'Ctrl K', does: 'Search, go anywhere, or add a task' },
  { keys: '/', does: 'Type a quick task' },
  { keys: 'N', does: 'New task with all the details' },
  { keys: 'F', does: 'Start a focus session' },
  { keys: '?', does: 'Show these shortcuts' },
]

function typing(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return Boolean(el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)))
}

/** Keyboard shortcuts for PC, wired to the command box and help sheet that `AppLayout` owns. */
export function useShortcuts(open: { palette: () => void; help: () => void }) {
  const navigate = useNavigate()
  const focus = useFocus()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        open.palette()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || document.querySelector('dialog[open]')) return
      if (e.key === '/') {
        e.preventDefault()
        const box = document.querySelector<HTMLInputElement>('[data-quick-add]')
        if (box) box.focus()
        else open.palette()
      } else if (e.key === 'n' || e.key === 'N') {
        navigate('/tasks?new=1')
      } else if (e.key === 'f' || e.key === 'F') {
        if (!focus.state) focus.start(planFromPrefs(loadPrefs(), null))
      } else if (e.key === '?') {
        open.help()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, navigate, focus])
}
