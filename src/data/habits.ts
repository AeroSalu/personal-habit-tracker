import { deleteDoc, doc, setDoc, updateDoc, addDoc, collection, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { dayKey } from '../lib/dates'
import { CATEGORIES, logId, type Category, type Habit, type HabitFields, type HabitLog, type Schedule } from '../lib/habits'
import { useUserCollection } from './useCollection'

function toSchedule(value: unknown): Schedule {
  const s = value as Partial<{ type: string; days: unknown; perWeek: unknown }> | undefined
  if (s?.type === 'count' && typeof s.perWeek === 'number') return { type: 'count', perWeek: s.perWeek }
  return { type: 'days', days: Array.isArray(s?.days) ? s.days.filter((d) => typeof d === 'number') : [] }
}

function toHabit(id: string, d: DocumentData): Habit {
  return {
    id,
    name: typeof d.name === 'string' ? d.name : '',
    category: CATEGORIES.includes(d.category) ? (d.category as Category) : 'personal',
    schedule: toSchedule(d.schedule),
    usualTime: typeof d.usualTime === 'string' ? d.usualTime : '',
    targetNote: typeof d.targetNote === 'string' ? d.targetNote : '',
    archived: d.archived === true,
    createdAt: typeof d.createdAt === 'string' ? d.createdAt : '',
  }
}

function toLog(id: string, d: DocumentData): HabitLog {
  return {
    id,
    habitId: String(d.habitId ?? ''),
    dayKey: String(d.dayKey ?? ''),
    completedAt: typeof d.completedAt === 'string' ? d.completedAt : '',
    note: typeof d.note === 'string' ? d.note : '',
  }
}

export const useHabits = (uid: string) => useUserCollection(uid, 'habits', toHabit)
export const useHabitLogs = (uid: string) => useUserCollection(uid, 'habitLogs', toLog)

// Writes resolve once the server confirms; screens don't await them (see CLAUDE.md).
function clean(fields: HabitFields): HabitFields {
  return { ...fields, name: fields.name.trim(), targetNote: fields.targetNote.trim() }
}

export function createHabit(uid: string, fields: HabitFields) {
  return addDoc(collection(db, 'users', uid, 'habits'), {
    ...clean(fields),
    archived: false,
    createdAt: new Date().toISOString(),
  })
}

export function updateHabit(uid: string, id: string, fields: HabitFields) {
  return updateDoc(doc(db, 'users', uid, 'habits', id), clean(fields))
}

export function setHabitArchived(uid: string, id: string, archived: boolean) {
  return updateDoc(doc(db, 'users', uid, 'habits', id), { archived })
}

/** Records the habit as done, at the moment it was ticked. */
export function logHabit(uid: string, habitId: string, at: Date) {
  const key = dayKey(at)
  return setDoc(doc(db, 'users', uid, 'habitLogs', logId(habitId, key)), {
    habitId,
    dayKey: key,
    completedAt: at.toISOString(),
    note: '',
  })
}

export function unlogHabit(uid: string, habitId: string, key: string) {
  return deleteDoc(doc(db, 'users', uid, 'habitLogs', logId(habitId, key)))
}

export function setLogNote(uid: string, id: string, note: string) {
  return updateDoc(doc(db, 'users', uid, 'habitLogs', id), { note: note.trim() })
}
