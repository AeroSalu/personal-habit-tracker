import { collection, doc, setDoc, updateDoc, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { PRESETS, type PresetId, type Session } from '../lib/focus'
import { useUserCollection } from './useCollection'

const PRESET_IDS: string[] = [...PRESETS.map((p) => p.id), 'custom']
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown) => (typeof v === 'number' ? v : 0)

function toSession(id: string, d: DocumentData): Session {
  return {
    id,
    taskId: str(d.taskId),
    habitId: str(d.habitId),
    title: str(d.title),
    preset: (PRESET_IDS.includes(d.preset) ? d.preset : 'custom') as PresetId,
    plannedMinutes: num(d.plannedMinutes),
    minutes: num(d.minutes),
    pausedMinutes: num(d.pausedMinutes),
    startedAt: str(d.startedAt),
    endedAt: str(d.endedAt),
    dayKey: str(d.dayKey),
    outcome: d.outcome === 'stopped' ? 'stopped' : 'completed',
    leaves: Array.isArray(d.leaves)
      ? d.leaves.map((l: DocumentData) => ({ at: str(l?.at), seconds: num(l?.seconds) }))
      : [],
    note: str(d.note),
  }
}

export const useSessions = (uid: string) => useUserCollection(uid, 'sessions', toSession)

const sessionsRef = (uid: string) => collection(db, 'users', uid, 'sessions')

/** An ID for a session about to start, so saving it later is idempotent. */
export const newSessionId = (uid: string) => doc(sessionsRef(uid)).id

/** Saves a finished session. Safe to repeat: it merges and never touches the note. */
export function saveSession(uid: string, session: Session) {
  const { id, note: _note, ...fields } = session
  void _note
  return setDoc(doc(sessionsRef(uid), id), fields, { merge: true })
}

export function setSessionNote(uid: string, id: string, note: string) {
  return updateDoc(doc(sessionsRef(uid), id), { note: note.trim() })
}
