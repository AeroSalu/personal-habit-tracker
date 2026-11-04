import { useToast } from '../components/toast'
import { completeTask, createTask, deleteTask, moveTask, reopenTask, saveTask } from '../data/tasks'
import { deleteTemplate, saveTemplate } from '../data/templates'
import { dueLabel, nextDueDate, type Status, type Task, type TaskFields } from '../lib/tasks'
import { templateFromTask, type Template } from '../lib/templates'
import { dayKey } from '../lib/dates'

/** Task writes with their confirmation and failure messages, shared by Tasks and Calendar. */
export function useTaskActions(uid: string, tasks: Task[]) {
  const toast = useToast()
  const failed = () => toast('That change could not be saved. Check your connection.')

  return {
    toggle(task: Task) {
      if (task.status === 'done') {
        reopenTask(uid, task, tasks).catch(failed)
        return
      }
      const at = new Date()
      completeTask(uid, task, at).catch(failed)
      const next = nextDueDate(task, dayKey(at))
      toast(next ? `Done. Next one: ${dueLabel({ dueDate: next, dueTime: task.dueTime }, dayKey(at))}` : 'Task done')
    },

    save(task: Task | null, fields: TaskFields) {
      if (task) saveTask(uid, task, fields, tasks).catch(failed)
      else createTask(uid, fields).catch(failed)
    },

    remove(task: Task) {
      deleteTask(uid, task.id).catch(failed)
      toast(`Deleted “${task.title}”`)
    },

    move(task: Task, status: Status, order: number) {
      const at = new Date()
      moveTask(uid, task, status, order, tasks, at).catch(failed)
      if (status === 'done' && task.status !== 'done') {
        const next = nextDueDate(task, dayKey(at))
        toast(next ? `Done. Next one: ${dueLabel({ dueDate: next, dueTime: task.dueTime }, dayKey(at))}` : 'Task done')
      }
    },

    saveTemplate(name: string, fields: TaskFields) {
      saveTemplate(uid, templateFromTask(fields, name)).catch(failed)
      toast(`Template “${name.trim() || fields.title.trim()}” saved`)
    },

    removeTemplate(template: Template) {
      deleteTemplate(uid, template.id).catch(failed)
      toast(`Deleted template “${template.name}”`)
    },
  }
}
