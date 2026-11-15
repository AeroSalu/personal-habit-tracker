import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSignedIn } from '../auth/authContext'
import { useToast } from '../components/toast'
import { logHabit, useHabitLogs, useHabits } from '../data/habits'
import { setRoomMinutes } from '../data/rooms'
import { newSessionId, saveSession, setSessionNote, useSessions } from '../data/sessions'
import { completeTask, setStatus, useTasks } from '../data/tasks'
import { dayKey } from '../lib/dates'
import {
  advance,
  completedOn,
  endEarly,
  leaveApp,
  MIN_SAVED_MINUTES,
  nextSession,
  pause,
  resume,
  returnToApp,
  startBreak,
  startFocus,
  toSession,
  type FocusState,
  type Plan,
} from '../lib/focus'
import { logId } from '../lib/habits'
import { FocusContext, type FocusApi } from './focusContext'
import { FocusOverlay } from './FocusOverlay'
import { loadPrefs, savePrefs } from './prefs'
import { haptic } from '../design/haptics'
import { chime, playAmbient, unlockAudio, type Sound } from './sound'

const KEY = 'lockin.focusState'

function loadState(uid: string): FocusState | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as FocusState | null
    return saved?.uid === uid ? advance(saved, Date.now()) : null
  } catch {
    return null
  }
}

function enterFullscreen() {
  document.documentElement.requestFullscreen?.().catch(() => {})
}

function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
}

/**
 * Runs the focus session for the whole app: the clock, saving on the device so a reload
 * resumes it, leave detection, wake lock, sound, and writing the finished session.
 */
export function FocusProvider({ children }: { children: ReactNode }) {
  const { user } = useSignedIn()
  const uid = user.uid
  const sessions = useSessions(uid)
  const tasks = useTasks(uid)
  const habitLogs = useHabitLogs(uid)
  const habits = useHabits(uid)
  const toast = useToast()

  const [state, setState] = useState<FocusState | null>(() => loadState(uid))
  const [now, setNow] = useState(() => Date.now())
  const [sound, setSoundState] = useState<Sound>(() => loadPrefs().sound)
  const phase = state?.phase
  const paused = state?.phase === 'focus' && state.pausedAt !== null
  const failed = useCallback(() => toast('Your session could not be saved. Check your connection.'), [toast])

  // Keep the session on this device so a reload or a closed tab picks it up again.
  useEffect(() => {
    try {
      if (state) localStorage.setItem(KEY, JSON.stringify(state))
      else localStorage.removeItem(KEY)
    } catch {
      // Without storage the session still runs; it just won't survive a reload.
    }
  }, [state])

  useEffect(() => {
    if (phase !== 'focus' && phase !== 'break') return
    const timer = setInterval(() => {
      const t = Date.now()
      setNow(t)
      setState((s) => (s ? advance(s, t) : s))
    }, 250)
    return () => clearInterval(timer)
  }, [phase])

  useEffect(() => {
    const onVisibility = () => {
      // Read now, not inside the updater: React may apply it after visibility changed again.
      const t = Date.now()
      const hidden = document.visibilityState === 'hidden'
      setNow(t)
      setState((s) => (s ? (hidden ? leaveApp(s, t) : returnToApp(s, t)) : s))
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Chime when a session completes or a break ends.
  const lastPhase = useRef(phase)
  useEffect(() => {
    const before = lastPhase.current
    lastPhase.current = phase
    if (before === 'focus' && state?.phase === 'summary' && state.outcome === 'completed') {
      chime()
      haptic('success')
    }
    if (before === 'break' && phase === 'breakOver') chime()
  }, [phase, state])

  // Save the finished session, and tick a linked habit when the session completed.
  const summaryId = state?.phase === 'summary' ? state.sessionId : null
  const handled = useRef(new Set<string>())
  useEffect(() => {
    if (!state || state.phase !== 'summary' || !habitLogs.loaded || handled.current.has(state.sessionId)) return
    handled.current.add(state.sessionId)
    if (state.minutes >= MIN_SAVED_MINUTES) {
      saveSession(uid, toSession(state, dayKey(new Date(state.startedAt)))).catch(failed)
      const roomId = state.plan.roomId
      if (roomId) {
        const earlier = sessions.data.filter((s) => s.roomId === roomId && s.id !== state.sessionId)
        const total = earlier.reduce((sum, s) => sum + s.minutes, 0) + state.minutes
        setRoomMinutes(roomId, uid, total).catch(() => {})
      }
    }
    const link = state.plan.link
    if (link?.kind === 'habit' && state.outcome === 'completed') {
      const today = dayKey(new Date(state.endedAt))
      if (!habitLogs.data.some((l) => l.id === logId(link.id, today))) {
        const habit = habits.data.find((h) => h.id === link.id) ?? { id: link.id, name: link.title, shared: false }
        logHabit(uid, habit, new Date(state.endedAt)).catch(failed)
      }
    }
    // Runs once per finished session; the other values are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryId, habitLogs.loaded])

  // Keep the screen on during focus and breaks.
  useEffect(() => {
    if (phase !== 'focus' && phase !== 'break') return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const request = () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) l.release().catch(() => {})
          else lock = l
        })
        .catch(() => {})
    }
    request()
    document.addEventListener('visibilitychange', request)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      lock?.release().catch(() => {})
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'focus' || paused || sound === 'off') return
    return playAmbient(sound)
  }, [phase, paused, sound])

  useEffect(() => {
    if (!state) exitFullscreen()
  }, [state])

  const api = useMemo<FocusApi>(() => {
    const at = () => Date.now()
    return {
      state,
      now,
      sound,
      setSound(next) {
        setSoundState(next)
        savePrefs({ ...loadPrefs(), sound: next })
        unlockAudio()
      },
      start(plan: Plan, endsAt?: number) {
        unlockAudio()
        enterFullscreen()
        const today = dayKey(new Date())
        setState(startFocus(uid, plan, completedOn(sessions.data, today) + 1, at(), newSessionId(uid), endsAt))
      },
      pause: () => setState((s) => (s ? pause(s, at()) : s)),
      resume: () => setState((s) => (s ? resume(s, at()) : s)),
      endEarly: () => setState((s) => (s ? endEarly(s, at()) : s)),
      startBreak(kind) {
        unlockAudio()
        setState((s) => (s ? startBreak(s, kind, at()) : s))
      },
      next() {
        unlockAudio()
        enterFullscreen()
        setState((s) => (s ? nextSession(s, at(), newSessionId(uid)) : s))
      },
      close: () => setState(null),
      markTask(status) {
        const link = state?.plan.link
        const task = link?.kind === 'task' ? tasks.data.find((t) => t.id === link.id) : undefined
        if (!task || task.status === 'done') return
        if (status === 'done') completeTask(uid, task, new Date()).catch(failed)
        else setStatus(uid, task.id, 'in_progress').catch(failed)
      },
      saveNote(note) {
        if (state?.phase === 'summary' && state.minutes >= MIN_SAVED_MINUTES) {
          setSessionNote(uid, state.sessionId, note).catch(failed)
        }
      },
    }
  }, [state, now, sound, uid, sessions.data, tasks.data, failed])

  return (
    <FocusContext.Provider value={api}>
      {children}
      {state && <FocusOverlay />}
    </FocusContext.Provider>
  )
}
