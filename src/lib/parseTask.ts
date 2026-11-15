// Plain-words quick add: "Gym tomorrow 6pm !high #fitness every Mon 1h" becomes a task with
// a date, time, priority, category, repeat and estimate. Each recognised phrase is cut out of
// the text and whatever is left is the title. It never produces an invalid task: anything it
// can't read stays in the title. No regex lookbehind, which older iPhones can't load.

import type { Category } from './habits'
import { addDays, dayKey, weekday, weekStart } from './dates'
import { formatMinutes } from './profile'
import { dueLabel, quickTask, recurrenceLabel, type Priority, type Recurrence, type TaskFields } from './tasks'

export type ParsedPart = { kind: 'date' | 'priority' | 'category' | 'repeat' | 'estimate'; label: string }
export type Parsed = { fields: TaskFields; parts: ParsedPart[] }

const DAY = '(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:s|nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)'
const DAY_NUM: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
const MONTH =
  '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
/** A phrase must stand on its own: start of text or a space before, a space or the end after. */
const word = (body: string) => new RegExp(`(^|\\s)${body}(?=\\s|$)`, 'i')

const dayOf = (name: string) => DAY_NUM[name.slice(0, 3).toLowerCase()]
const pad = (n: number) => String(n).padStart(2, '0')

/** The next date on or after `today` falling on weekday `d` (`skipToday` for "next fri"). */
function nextWeekday(today: string, d: number, skipToday = false): string {
  let diff = (d - weekday(today) + 7) % 7
  if (diff === 0 && skipToday) diff = 7
  return addDays(today, diff)
}

/** A day and month without a year means the next one to come. Null for dates like 31 Feb. */
function dayMonth(day: number, month: number, today: string, year?: number): string | null {
  let y = year ?? Number(today.slice(0, 4))
  const make = (yr: number) => {
    const d = new Date(yr, month, day)
    return d.getMonth() === month && d.getDate() === day ? dayKey(d) : null
  }
  let key = make(y)
  if (!key) return null
  if (year === undefined && key < today) {
    y += 1
    key = make(y)
  }
  return key
}

export function parseTask(input: string, now: Date, opts: { defaultToday?: boolean } = {}): Parsed {
  const today = dayKey(now)
  let rest = ` ${input} `

  /** Finds a phrase, cuts it out of the text, and returns its match (group 1 is the space). */
  const grab = (re: RegExp) => {
    const m = rest.match(re)
    if (!m || m.index === undefined) return null
    rest = rest.slice(0, m.index) + m[1] + ' ' + rest.slice(m.index + m[0].length)
    return m
  }

  // Priority: !urgent !high !medium !low, !!! and !!, or p1–p4.
  let priority: Priority | null = null
  const pr = grab(word('(!!!|!!|!(urgent|high|medium|med|low)|p([1-4]))'))
  if (pr) {
    const token = pr[2].toLowerCase()
    const named = pr[3]?.toLowerCase()
    priority =
      token === '!!!'
        ? 'urgent'
        : token === '!!'
          ? 'high'
          : named
            ? ((named === 'med' ? 'medium' : named) as Priority)
            : (['urgent', 'high', 'medium', 'low'] as const)[Number(pr[4]) - 1]
  }

  // Category: #study #work #fitness (or #gym) #personal.
  let category: Category | null = null
  const cat = grab(word('#(study|work|fitness|gym|personal)'))
  if (cat) category = (cat[2].toLowerCase() === 'gym' ? 'fitness' : cat[2].toLowerCase()) as Category

  // Repeat.
  let recurrence: Recurrence | null = null
  if (grab(word('(every\\s+weekday|weekdays)'))) recurrence = { type: 'custom', days: [1, 2, 3, 4, 5] }
  else if (grab(word('(every\\s*day|daily)'))) recurrence = { type: 'daily' }
  else if (grab(word('(every\\s+week|weekly)'))) recurrence = { type: 'weekly' }
  else {
    const ev = grab(word(`every\\s+(${DAY}(?:\\s*(?:,|and|&)\\s*${DAY})*)`))
    if (ev) {
      const days = [...ev[2].matchAll(new RegExp(DAY, 'gi'))].map((x) => dayOf(x[1]))
      recurrence = { type: 'custom', days: [...new Set(days)].sort((a, b) => a - b) }
    }
  }

  // Estimate: 1h, 1.5h, 1h30, 1h 30m, 45m, 45 min, optionally after "for".
  let estimate: number | null = null
  const hrs = grab(word('(?:for\\s+)?(\\d+(?:\\.\\d+)?)\\s?(?:h|hr|hrs|hour|hours)(?:\\s?(\\d+)\\s?(?:m|min|mins)?)?'))
  if (hrs) estimate = Math.round(Number(hrs[2]) * 60 + Number(hrs[3] ?? 0))
  else {
    const mins = grab(word('(?:for\\s+)?(\\d+)\\s?(?:m|min|mins|minutes)'))
    if (mins) estimate = Number(mins[2])
  }
  if (estimate !== null && (estimate <= 0 || estimate > 1440)) estimate = null

  // Time: 6pm, 6:30 pm, 18:00, "at 6" (1–7 read as evening), noon.
  let time = ''
  const ampm = grab(word('(?:at\\s+|@\\s?)?(\\d{1,2})(?:[:.](\\d{2}))?\\s?(am|pm)'))
  if (ampm) {
    const h = Number(ampm[2])
    const m = Number(ampm[3] ?? 0)
    if (h >= 1 && h <= 12 && m < 60) time = `${pad((h % 12) + (ampm[4].toLowerCase() === 'pm' ? 12 : 0))}:${pad(m)}`
  } else {
    const h24 = grab(word('(?:at\\s+|@\\s?)?([01]?\\d|2[0-3]):([0-5]\\d)'))
    if (h24) time = `${pad(Number(h24[2]))}:${h24[3]}`
    else if (grab(word('(?:at\\s+)?noon'))) time = '12:00'
    else {
      const at = grab(word('(?:at|@)\\s?(\\d{1,2})'))
      if (at) {
        const h = Number(at[2])
        if (h >= 1 && h <= 23) time = `${pad(h <= 7 ? h + 12 : h)}:00`
      }
    }
  }

  // Date.
  let date = ''
  if (grab(word('(?:by\\s+|due\\s+)?today'))) date = today
  else if (grab(word('tonight'))) {
    date = today
    if (!time) time = '20:00'
  } else if (grab(word('(?:by\\s+|due\\s+)?(tomorrow|tmrw|tmr)'))) date = addDays(today, 1)
  else if (grab(word('next\\s+week'))) date = addDays(weekStart(today), 7)
  else {
    const inN = grab(word('in\\s+(\\d+)\\s+(days?|weeks?)'))
    if (inN) date = addDays(today, Number(inN[2]) * (inN[3].toLowerCase().startsWith('week') ? 7 : 1))
    else {
      const wd = grab(word(`(?:(on|by|due|this|next)\\s+)?${DAY}`))
      if (wd) date = nextWeekday(today, dayOf(wd[3]), wd[2]?.toLowerCase() === 'next')
      else {
        // Put the text back if the date doesn't exist, so "31 feb" stays in the title.
        const before = rest
        const dm = grab(word(`(?:on\\s+|by\\s+|due\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}`))
        const md = dm ? null : grab(word(`(?:on\\s+|by\\s+|due\\s+)?${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?`))
        const slash = dm || md ? null : grab(word('(?:on\\s+|by\\s+|due\\s+)?(\\d{1,2})/(\\d{1,2})(?:/(\\d{2}|\\d{4}))?'))
        const found = dm
          ? dayMonth(Number(dm[2]), MONTHS.indexOf(dm[3].slice(0, 3).toLowerCase()), today)
          : md
            ? dayMonth(Number(md[3]), MONTHS.indexOf(md[2].slice(0, 3).toLowerCase()), today)
            : slash
              ? dayMonth(
                  Number(slash[2]),
                  Number(slash[3]) - 1,
                  today,
                  slash[4] ? Number(slash[4].length === 2 ? `20${slash[4]}` : slash[4]) : undefined,
                )
              : null
        if (found) date = found
        else rest = before
      }
    }
  }

  const dateRead = Boolean(date || time)
  // A repeat or a time needs a date to hang on: the first matching day from today.
  if (!date && recurrence?.type === 'custom') {
    date = recurrence.days.map((d) => nextWeekday(today, d)).sort()[0]
  }
  if (!date && (recurrence || time || opts.defaultToday)) date = today

  const title = rest
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+(on|at|by|due|for|in)$/i, '')
    .slice(0, 120)

  const fields: TaskFields = {
    ...quickTask(title || input, today),
    dueDate: date,
    dueTime: date ? time : '',
    ...(priority ? { priority } : {}),
    ...(category ? { category } : {}),
    ...(recurrence ? { recurrence } : {}),
    ...(estimate !== null ? { estimateMinutes: estimate } : {}),
  }

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const parts: ParsedPart[] = []
  if (dateRead && fields.dueDate) parts.push({ kind: 'date', label: dueLabel(fields, today) })
  if (priority) parts.push({ kind: 'priority', label: cap(priority) })
  if (category) parts.push({ kind: 'category', label: cap(category) })
  if (recurrence) parts.push({ kind: 'repeat', label: recurrence.type === 'custom' ? `Every ${recurrenceLabel(recurrence)}` : recurrenceLabel(recurrence) })
  if (estimate !== null) parts.push({ kind: 'estimate', label: formatMinutes(estimate) })
  return { fields, parts }
}
