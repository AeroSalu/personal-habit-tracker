import { createContext, useContext } from 'react'
import type { FocusState, Plan } from '../lib/focus'
import type { Sound } from './sound'

export type FocusApi = {
  /** null when no session or break is running. */
  state: FocusState | null
  now: number
  sound: Sound
  setSound: (sound: Sound) => void
  start: (plan: Plan) => void
  pause: () => void
  resume: () => void
  endEarly: () => void
  startBreak: (kind: 'short' | 'long') => void
  next: () => void
  close: () => void
  markTask: (status: 'done' | 'in_progress') => void
  saveNote: (note: string) => void
}

export const FocusContext = createContext<FocusApi | null>(null)

export function useFocus(): FocusApi {
  const api = useContext(FocusContext)
  if (!api) throw new Error('useFocus used outside FocusProvider')
  return api
}
