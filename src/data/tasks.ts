import { addDoc, collection, deleteDoc, doc, updateDoc, writeBatch, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { dayKey } from '../lib/dates'
import { CATEGORIES, type Category } from '../lib/habits'
import {
  nextDueDate,
  PRIORITIES,
  STATUSES,
  type Priority,
  type Recurrence,
  type Status,
  type Subtask,
  type Task,
  type TaskFields,
} from '../lib/tasks'
import { useUserCollection } from './useCollection'

const str = (v: unknown) => (typeof v === 'string' ? v : '')

function toRecurrence(v: unknown): Recurrence {
  const r = v as Partial<{ type: string; days: unknown }> | undefined
  if (r?.type === 'daily' || r?.type === 'weekly') return { type: r.type }
  if (r?.type === 'custom' && Array.isArray(r.days)) {
    return { type: 'custom', days: r.days.filter((d): d is number => typeof d === 'number') }
  }
  return { type: 'none' }
}

function toSubtasks(v: unknown): Subtask[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((s) => s && typeof s.title === 'string')
    .map((s, i) => ({ id: str(s.id) || String(i), title: s.title, done: s.done === true }))
}

function toTask(id: string, d: DocumentData): Task {
  return {
    id,
    title: str(d.title),
    description: str(d.description),
    category: CATEGORIES.includes(d.category) ? (d.category as Category) : 'personal',
    priority: PRIORITIES.includes(d.priority) ? (d.priority as Priority) : 'medium',
    status: STATUSES.includes(d.status) ? (d.status as Status) : 'todo',
    dueDate: str(d.dueDate),
    dueTime: str(d.dueTime),
    subtasks: toSubtasks(d.subtasks),
    recurrence: toRecurrence(d.recurrence),
    estimateMinutes: typeof d.estimateMinutes === 'number' ? d.estimateMinutes : 0,
    order: typeof d.order === 'number' ? d.order : 0,
    createdAt: str(d.createdAt),
    completedAt: str(d.completedAt),
    nextTaskId: str(d.nextTaskId),
  }
}

export const useTasks = (uid: string) => useUserCollection(uid, 'tasks', toTask)

const tasksRef = (uid: string) => collection(db, 'users', uid, 'tasks')

/** The task as stored: everything but its ID, which is the document's own. */
function stored(task: Task): Omit<Task, 'id'> {
  const copy: Partial<Task> = { ...task }
  delete copy.id
  return copy as Omit<Task, 'id'>
}

function clean(fields: TaskFields) {
  return {
    ...fields,
    title: fields.title.trim(),
    description: fields.description.trim(),
    subtasks: fields.subtasks
      .map((s) => ({ ...s, title: s.title.trim() }))
      .filter((s) => s.title),
  }
}

// Writes resolve once the server confirms; screens don't await them (see CLAUDE.md).

export function createTask(uid: string, fields: TaskFields) {
  const now = new Date()
  return addDoc(tasksRef(uid), {
    ...clean(fields),
    order: now.getTime(),
    createdAt: now.toISOString(),
    completedAt: fields.status === 'done' ? now.toISOString() : '',
    nextTaskId: '',
  })
}

/**
 * Saves edits. Moving into or out of done goes through completion and reopening, so a
 * repeating task gets (or loses) its next instance either way.
 */
export function saveTask(uid: string, task: Task, fields: TaskFields, all: Task[]) {
  const edited = { ...task, ...clean(fields) }
  if (task.status !== 'done' && fields.status === 'done') return completeTask(uid, edited, new Date())
  if (task.status === 'done' && fields.status !== 'done') return reopenTask(uid, edited, all, fields.status)
  return updateDoc(doc(tasksRef(uid), task.id), clean(fields))
}

/** Marks done and, for a repeating task, creates the next one in the same write. */
export function completeTask(uid: string, task: Task, at: Date) {
  const batch = writeBatch(db)
  const ref = doc(tasksRef(uid), task.id)
  const nextDate = nextDueDate(task, dayKey(at))
  let nextTaskId = ''

  if (nextDate) {
    const nextRef = doc(tasksRef(uid))
    nextTaskId = nextRef.id
    batch.set(nextRef, {
      ...stored(task),
      status: 'todo',
      dueDate: nextDate,
      subtasks: task.subtasks.map((s) => ({ ...s, done: false })),
      order: at.getTime(),
      createdAt: at.toISOString(),
      completedAt: '',
      nextTaskId: '',
    })
  }

  batch.set(ref, { ...stored(task), status: 'done', completedAt: at.toISOString(), nextTaskId })
  return batch.commit()
}

/**
 * Undoes completion. The next instance of a repeating task is removed too, unless it has
 * already been worked on, in which case it is kept.
 */
export function reopenTask(uid: string, task: Task, all: Task[], status: Status = 'todo') {
  const batch = writeBatch(db)
  const next = all.find((t) => t.id === task.nextTaskId)
  const untouched = next && next.status === 'todo' && !next.subtasks.some((s) => s.done)
  if (next && untouched) batch.delete(doc(tasksRef(uid), next.id))
  batch.set(doc(tasksRef(uid), task.id), { ...stored(task), status, completedAt: '', nextTaskId: '' })
  return batch.commit()
}

export function setSubtasks(uid: string, id: string, subtasks: Subtask[]) {
  return updateDoc(doc(tasksRef(uid), id), { subtasks })
}

export function setStatus(uid: string, id: string, status: Exclude<Status, 'done'>) {
  return updateDoc(doc(tasksRef(uid), id), { status })
}

export function deleteTask(uid: string, id: string) {
  return deleteDoc(doc(tasksRef(uid), id))
}
