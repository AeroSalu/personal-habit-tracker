import { describe, expect, it } from 'vitest'
import type { Habit, HabitLog } from './habits'
import type { DayRecord } from './plan'
import { DEFAULT_REMINDERS, inQuiet, planReminders, slotOf, toPlanDoc, toReminderPrefs, type ReminderInput } from './reminders'
import type { Task } from './tasks'

// Wednesday 4 November 2026, 10:00 local time.
const NOW = new Date(2026, 10, 4, 10, 0)
const local = (day: number, h: number, m = 0) => slotOf(new Date(2026, 10, day, h, m).getTime())

const task = (over: Partial<Task>): Task => ({
  id: over.title ?? 't',
  title: 't',
  description: '',
  category: 'work',
  priority: 'medium',
  status: 'todo',
  dueDate: '',
  dueTime: '',
  subtasks: [],
  recurrence: { type: 'none' },
  estimateMinutes: 0,
  order: 0,
  createdAt: '',
  completedAt: '',
  nextTaskId: '',
  ...over,
})
const habit = (name: string, usualTime: string, days = [0, 1, 2, 3, 4, 5, 6]): Habit => ({
  id: name,
  name,
  category: 'fitness',
  schedule: { type: 'days', days },
  usualTime,
  targetNote: '',
  archived: false,
  createdAt: '',
})
const input = (over: Partial<ReminderInput> = {}): ReminderInput => ({
  tasks: [],
  habits: [],
  logs: [],
  days: [],
  prefs: { ...DEFAULT_REMINDERS, on: true, plan: false, review: false, streak: false },
  now: NOW,
  activeToday: false,
  streak: 0,
  ...over,
})
const titles = (i: ReminderInput) => planReminders(i).map((r) => `${r.slot} ${r.title}`)

describe('slotOf', () => {
  it('rounds down to a 15-minute UTC slot', () => {
    expect(slotOf(Date.UTC(2026, 10, 4, 12, 44, 59))).toBe('2026-11-04T12:30Z')
    expect(slotOf(Date.UTC(2026, 10, 4, 12, 45))).toBe('2026-11-04T12:45Z')
  })
})

describe('planReminders', () => {
  it('sends nothing when reminders are off', () => {
    expect(planReminders(input({ prefs: DEFAULT_REMINDERS, habits: [habit('Gym', '18:00')] }))).toEqual([])
  })

  it('reminds of timed tasks 15 minutes early, skipping done and past ones', () => {
    const tasks = [
      task({ title: 'Call', dueDate: '2026-11-04', dueTime: '18:00' }),
      task({ title: 'Done', dueDate: '2026-11-04', dueTime: '19:00', status: 'done' }),
      task({ title: 'Gone', dueDate: '2026-11-04', dueTime: '09:00' }),
      task({ title: 'Untimed', dueDate: '2026-11-04' }),
    ]
    expect(titles(input({ tasks }))).toEqual([`${local(4, 17, 45)} Call`])
  })

  it('reminds of habits at their usual time unless already ticked', () => {
    const logs: HabitLog[] = [{ id: 'Read_2026-11-04', habitId: 'Read', dayKey: '2026-11-04', completedAt: '', note: '' }]
    expect(titles(input({ habits: [habit('Gym', '18:00'), habit('Read', '21:00')], logs }))).toEqual([
      `${local(4, 18)} Time for Gym`,
      `${local(5, 18)} Time for Gym`,
      `${local(5, 21)} Time for Read`,
    ])
  })

  it('keeps quiet hours, even past midnight', () => {
    const prefs = { ...input().prefs, quietStart: '17:00', quietEnd: '19:00' }
    expect(titles(input({ prefs, habits: [habit('Gym', '18:00')] }))).toEqual([])
    expect(inQuiet(23 * 60, { quietStart: '22:30', quietEnd: '07:00' })).toBe(true)
    expect(inQuiet(6 * 60, { quietStart: '22:30', quietEnd: '07:00' })).toBe(true)
    expect(inQuiet(12 * 60, { quietStart: '22:30', quietEnd: '07:00' })).toBe(false)
    expect(inQuiet(12 * 60, { quietStart: '07:00', quietEnd: '07:00' })).toBe(false)
  })

  it('nudges to plan and review only days not yet planned or reviewed', () => {
    const prefs = { ...input().prefs, plan: true, review: true }
    const days: DayRecord[] = [{ key: '2026-11-04', plannedAt: 'x', reviewedAt: '', rating: 0, note: '', wins: [] }]
    expect(titles(input({ prefs, days }))).toEqual([
      `${local(4, 21)} Wrap up your day`,
      `${local(5, 8)} Plan your day`,
      `${local(5, 21)} Wrap up your day`,
      `${local(6, 8)} Plan your day`,
    ])
  })

  it('warns about a streak only when nothing is done today', () => {
    const prefs = { ...input().prefs, streak: true }
    expect(titles(input({ prefs, streak: 5 }))[0]).toBe(`${local(4, 20)} Keep your 5-day streak`)
    expect(titles(input({ prefs, streak: 5, activeToday: true }))[0]).toBe(`${local(5, 20)} Keep your streak going`)
    expect(titles(input({ prefs, streak: 0 }))).toEqual([])
  })

  it('groups reminders by slot for publishing', () => {
    const doc = toPlanDoc(planReminders(input({ habits: [habit('Gym', '18:00'), habit('Stretch', '18:10')] })))
    expect(doc.slots).toEqual([local(4, 18), local(5, 18)])
    expect(doc.items[local(4, 18)].map((r) => r.title)).toEqual(['Time for Gym', 'Time for Stretch'])
  })

  it('reads stored settings safely', () => {
    expect(toReminderPrefs(undefined)).toEqual(DEFAULT_REMINDERS)
    expect(toReminderPrefs({ on: true, planTime: '7:00', taskLead: 0, quietEnd: '06:30' })).toMatchObject({
      on: true,
      planTime: '08:00',
      taskLead: 0,
      quietEnd: '06:30',
    })
  })
})
