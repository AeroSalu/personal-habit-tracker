import { describe, expect, it } from 'vitest'
import { parseTask } from './parseTask'
import { taskError } from './tasks'

// Wednesday 4 November 2026, 10:00 local time.
const NOW = new Date(2026, 10, 4, 10, 0)
const p = (text: string, defaultToday = false) => parseTask(text, NOW, { defaultToday })

describe('parseTask', () => {
  it('reads the example from the plan', () => {
    const { fields, parts } = p('Gym tomorrow 6pm !high #fitness every Mon 1h')
    expect(fields).toMatchObject({
      title: 'Gym',
      dueDate: '2026-11-05',
      dueTime: '18:00',
      priority: 'high',
      category: 'fitness',
      recurrence: { type: 'custom', days: [1] },
      estimateMinutes: 60,
    })
    expect(parts.map((x) => x.label)).toEqual(['Tomorrow, 6:00 PM', 'High', 'Fitness', 'Every Mon', '1h'])
  })

  it('leaves plain text alone, due today only when asked', () => {
    expect(p('Read chapter 4').fields).toMatchObject({ title: 'Read chapter 4', dueDate: '', priority: 'medium', category: 'work' })
    expect(p('Read chapter 4', true).fields.dueDate).toBe('2026-11-04')
    expect(p('Read chapter 4', true).parts).toEqual([])
  })

  it('reads days of the week, "next" and relative dates', () => {
    expect(p('call mom fri').fields).toMatchObject({ title: 'call mom', dueDate: '2026-11-06' })
    expect(p('standup on wednesday').fields.dueDate).toBe('2026-11-04')
    expect(p('standup next wed').fields.dueDate).toBe('2026-11-11')
    expect(p('review in 3 days').fields.dueDate).toBe('2026-11-07')
    expect(p('review in 2 weeks').fields.dueDate).toBe('2026-11-18')
    expect(p('plan next week').fields.dueDate).toBe('2026-11-09')
    expect(p('pay rent tmr').fields.dueDate).toBe('2026-11-05')
  })

  it('reads day-month dates, rolling past ones into next year', () => {
    expect(p('exam 15 nov').fields.dueDate).toBe('2026-11-15')
    expect(p('exam nov 15th').fields.dueDate).toBe('2026-11-15')
    expect(p('exam 2 jan').fields.dueDate).toBe('2027-01-02')
    expect(p('exam 25/12').fields.dueDate).toBe('2026-12-25')
    expect(p('exam 1/3/27').fields.dueDate).toBe('2027-03-01')
    // No 31 February: the text stays in the title.
    expect(p('exam 31 feb').fields).toMatchObject({ title: 'exam 31 feb', dueDate: '' })
  })

  it('reads times, defaulting the date to today', () => {
    expect(p('call at 6').fields).toMatchObject({ title: 'call', dueDate: '2026-11-04', dueTime: '18:00' })
    expect(p('call at 9').fields.dueTime).toBe('09:00')
    expect(p('call 6:30 pm').fields.dueTime).toBe('18:30')
    expect(p('call 12am').fields.dueTime).toBe('00:00')
    expect(p('call 18:45').fields.dueTime).toBe('18:45')
    expect(p('lunch noon').fields.dueTime).toBe('12:00')
    expect(p('movie tonight').fields).toMatchObject({ title: 'movie', dueDate: '2026-11-04', dueTime: '20:00' })
  })

  it('reads priority, category and estimates', () => {
    expect(p('fix bug !!!').fields.priority).toBe('urgent')
    expect(p('fix bug !!').fields.priority).toBe('high')
    expect(p('fix bug p4').fields.priority).toBe('low')
    expect(p('run #gym').fields.category).toBe('fitness')
    expect(p('notes for 45 min').fields).toMatchObject({ title: 'notes', estimateMinutes: 45 })
    expect(p('notes 1h30').fields.estimateMinutes).toBe(90)
    expect(p('notes 1.5h').fields.estimateMinutes).toBe(90)
  })

  it('reads repeats, starting on the first matching day', () => {
    expect(p('stretch daily').fields).toMatchObject({ recurrence: { type: 'daily' }, dueDate: '2026-11-04' })
    expect(p('stretch every weekday').fields.recurrence).toEqual({ type: 'custom', days: [1, 2, 3, 4, 5] })
    expect(p('swim every mon and thu').fields).toMatchObject({ recurrence: { type: 'custom', days: [1, 4] }, dueDate: '2026-11-05' })
    expect(p('report weekly').fields.recurrence).toEqual({ type: 'weekly' })
  })

  it('does not mistake dates for minutes or words inside other words', () => {
    expect(p('trip 15 may').fields).toMatchObject({ title: 'trip', dueDate: '2027-05-15', estimateMinutes: 0 })
    expect(p('Monday.com setup').fields.dueDate).toBe('')
    expect(p('fix #frontend issue').fields).toMatchObject({ title: 'fix #frontend issue', category: 'work' })
  })

  it('leaves empty text for the caller to refuse', () => {
    expect(p('   ').fields.title).toBe('')
  })

  it('always produces a valid task from any text', () => {
    for (const text of ['tomorrow', 'every fri 6pm', '!!', 'x 31/2', 'a in 400 days 23:59 !low #study 2h']) {
      expect(taskError(p(text, true).fields)).toBe('')
    }
  })
})
