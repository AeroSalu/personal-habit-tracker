import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFocus } from '../focus/focusContext'
import { loadPrefs, planFromPrefs } from '../focus/prefs'

/**
 * Home-screen shortcuts open the app with `?start` (start a focus session with your usual
 * settings) or `?add` (put the cursor in quick add). Each runs once, then the address is
 * tidied so a reload doesn't repeat it.
 */
export function useLaunch() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const focus = useFocus()

  useEffect(() => {
    const params = new URLSearchParams(search)
    const start = params.has('start')
    const add = params.has('add')
    if (!start && !add) return
    if (start && !focus.state) focus.start(planFromPrefs(loadPrefs(), null))
    params.delete('start')
    params.delete('add')
    const rest = params.toString()
    navigate(`${pathname}${rest ? `?${rest}` : ''}`, { replace: true })
    // The quick add box mounts with the page; give it a moment.
    if (add) window.setTimeout(() => document.querySelector<HTMLInputElement>('[data-quick-add]')?.focus(), 350)
  }, [search, pathname, navigate, focus])
}
