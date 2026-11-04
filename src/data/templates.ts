import { addDoc, collection, deleteDoc, doc, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { CATEGORIES, type Category } from '../lib/habits'
import { PRIORITIES, type Priority, type Recurrence } from '../lib/tasks'
import type { Template, TemplateFields } from '../lib/templates'
import { useUserCollection } from './useCollection'

const str = (v: unknown) => (typeof v === 'string' ? v : '')

function toRecurrence(v: unknown): Recurrence {
  const r = v as Partial<{ type: string; days: unknown }> | undefined
  if (r?.type === 'daily' || r?.type === 'weekly') return { type: r.type }
  if (r?.type === 'custom' && Array.isArray(r.days)) return { type: 'custom', days: r.days.filter((d): d is number => typeof d === 'number') }
  return { type: 'none' }
}

function toTemplate(id: string, d: DocumentData): Template {
  return {
    id,
    name: str(d.name),
    title: str(d.title),
    description: str(d.description),
    category: CATEGORIES.includes(d.category) ? (d.category as Category) : 'personal',
    priority: PRIORITIES.includes(d.priority) ? (d.priority as Priority) : 'medium',
    steps: Array.isArray(d.steps) ? d.steps.filter((s: unknown): s is string => typeof s === 'string') : [],
    estimateMinutes: typeof d.estimateMinutes === 'number' ? d.estimateMinutes : 0,
    recurrence: toRecurrence(d.recurrence),
    builtIn: false,
  }
}

export const useTemplates = (uid: string) => useUserCollection(uid, 'taskTemplates', toTemplate)

export function saveTemplate(uid: string, fields: TemplateFields) {
  return addDoc(collection(db, 'users', uid, 'taskTemplates'), { ...fields, createdAt: new Date().toISOString() })
}

export function deleteTemplate(uid: string, id: string) {
  return deleteDoc(doc(db, 'users', uid, 'taskTemplates', id))
}
