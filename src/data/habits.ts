import { doc, updateDoc, addDoc, collection, writeBatch, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { dayKey } from '../lib/dates'
import { activityIds } from '../lib/friends'
import { postInBatch, removeInBatch } from './activity'
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
    shared: d.shared === true,
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
  return { ...fields, name: fields.name.trim(), targetNote: fields.targetNote.trim(), shared: fields.shared === true }
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

type HabitRef = Pick<Habit, 'id' | 'name' | 'shared'>

/** Records the habit as done, at the moment it was ticked, and posts it if it's shared. */
export function logHabit(uid: string, habit: HabitRef, at: Date) {
  const key = dayKey(at)
  const batch = writeBatch(db)
  batch.set(doc(db, 'users', uid, 'habitLogs', logId(habit.id, key)), {
    habitId: habit.id,
    dayKey: key,
    completedAt: at.toISOString(),
    note: '',
  })
  if (habit.shared) {
    postInBatch(batch, activityIds.habit(uid, habit.id, key), { uid, kind: 'habit', title: habit.name, at: at.toISOString() })
  }
  return batch.commit()
}

export function unlogHabit(uid: string, habit: HabitRef, key: string) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', uid, 'habitLogs', logId(habit.id, key)))
  removeInBatch(batch, activityIds.habit(uid, habit.id, key))
  return batch.commit()
}

export function setLogNote(uid: string, id: string, note: string) {
  return updateDoc(doc(db, 'users', uid, 'habitLogs', id), { note: note.trim() })
}
