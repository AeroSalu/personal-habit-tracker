import { describe, expect, it } from 'vitest'
import { csvCell, tasksCsv } from './csv'
import type { Task } from './tasks'

describe('csv', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('plain')).toBe('plain')
    expect(csvCell('a, b')).toBe('"a, b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('two\nlines')).toBe('"two\nlines"')
    expect(csvCell(45)).toBe('45')
  })

  it('never lets a title run as a spreadsheet formula', () => {
    expect(csvCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)")
    expect(csvCell('-5 push-ups')).toBe("'-5 push-ups")
    expect(csvCell('@home')).toBe("'@home")
  })

  it('writes a header and one row per task, oldest first', () => {
    const t = (title: string, createdAt: string): Task => ({
      id: title,
      title,
      description: '',
      category: 'study',
      priority: 'high',
      status: 'todo',
      dueDate: '2026-11-05',
      dueTime: '18:00',
      subtasks: [],
      recurrence: { type: 'custom', days: [1, 4] },
      estimateMinutes: 60,
      order: 0,
      createdAt,
      completedAt: '',
      nextTaskId: '',
    })
    const lines = tasksCsv([t('B', '2026-11-02'), t('A, again', '2026-11-01')]).trim().split('\r\n')
    expect(lines[0]).toBe('Title,Status,Priority,Category,Due date,Due time,Repeats,Estimate (min),Created,Completed,Notes')
    expect(lines[1]).toBe('"A, again",todo,high,study,2026-11-05,18:00,"Mon, Thu",60,2026-11-01,,')
    expect(lines).toHaveLength(3)
  })
})
