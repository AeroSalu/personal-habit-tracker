// Task templates: reusable task details without dates or progress. Built-in starters ship
// with the app; saved ones live under users/{uid}/taskTemplates.

import type { Category } from './habits'
import type { Priority, Recurrence, Task, TaskFields } from './tasks'

export type Template = {
  id: string
  name: string
  title: string
  description: string
  category: Category
  priority: Priority
  /** Subtask titles; each new task gets fresh, unticked subtasks. */
  steps: string[]
  estimateMinutes: number
  recurrence: Recurrence
  builtIn: boolean
}

export type TemplateFields = Omit<Template, 'id' | 'builtIn'>

export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'builtin-study',
    name: 'Study block',
    title: 'Study: ',
    description: 'One topic, phone in another room.',
    category: 'study',
    priority: 'high',
    steps: ['Review last notes', 'Work through new material', 'Write a 3-line summary'],
    estimateMinutes: 90,
    recurrence: { type: 'none' },
    builtIn: true,
  },
  {
    id: 'builtin-dsa',
    name: 'DSA practice',
    title: 'Solve 2 DSA problems',
    description: 'One medium, one hard. Note the pattern used.',
    category: 'study',
    priority: 'medium',
    steps: ['Problem 1', 'Problem 2', 'Write down the patterns'],
    estimateMinutes: 60,
    recurrence: { type: 'daily' },
    builtIn: true,
  },
  {
    id: 'builtin-review',
    name: 'Weekly review',
    title: 'Weekly review',
    description: 'Look back at the week and plan the next one.',
    category: 'personal',
    priority: 'medium',
    steps: ['Check what got done', 'Clear the inbox and notes', 'Pick next week’s top 3', 'Block focus time'],
    estimateMinutes: 30,
    recurrence: { type: 'weekly' },
    builtIn: true,
  },
  {
    id: 'builtin-workout',
    name: 'Workout',
    title: 'Workout',
    description: '',
    category: 'fitness',
    priority: 'medium',
    steps: ['Warm up', 'Main sets', 'Stretch'],
    estimateMinutes: 60,
    recurrence: { type: 'none' },
    builtIn: true,
  },
]

const newId = () => Math.random().toString(36).slice(2, 10)

/** Fields for a new task from a template, due on `dueDate` if given. */
export function fieldsFromTemplate(t: Template, dueDate = ''): TaskFields {
  return {
    title: t.title,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: 'todo',
    // A repeating template needs a date to repeat from.
    dueDate: dueDate || '',
    dueTime: '',
    subtasks: t.steps.map((title) => ({ id: newId(), title, done: false })),
    recurrence: dueDate ? t.recurrence : { type: 'none' },
    estimateMinutes: t.estimateMinutes,
  }
}

/** A template from a task's details, dropping its dates, status and progress. */
export function templateFromTask(task: Pick<Task, 'title' | 'description' | 'category' | 'priority' | 'subtasks' | 'estimateMinutes' | 'recurrence'>, name: string): TemplateFields {
  return {
    name: name.trim() || task.title.trim(),
    title: task.title.trim(),
    description: task.description.trim(),
    category: task.category,
    priority: task.priority,
    steps: task.subtasks.map((s) => s.title.trim()).filter(Boolean),
    estimateMinutes: task.estimateMinutes,
    recurrence: task.recurrence,
  }
}

export function templateError(f: TemplateFields): string {
  if (!f.name.trim()) return 'Give the template a name.'
  if (f.name.trim().length > 60) return 'Keep the name under 60 characters.'
  return ''
}
