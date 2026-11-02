// Day keys are local dates written YYYY-MM-DD, so they sort and compare as strings.
// Weeks run Monday to Sunday. Weekday numbers follow Date.getDay: 0 is Sunday.

const pad = (n: number) => String(n).padStart(2, '0')

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Noon avoids daylight-saving shifts moving the date. */
export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function addDays(key: string, n: number): string {
  const date = parseDay(key)
  date.setDate(date.getDate() + n)
  return dayKey(date)
}

export function weekday(key: string): number {
  return parseDay(key).getDay()
}

export function weekStart(key: string): string {
  return addDays(key, -((weekday(key) + 6) % 7))
}

/** Whole days from a to b; positive when b is later. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000)
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/** "18:30" → 1110 */
export function parseClock(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

/** 1110 → "6:30 PM" */
export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60)
  return `${((h + 11) % 12) + 1}:${pad(minutes % 60)} ${h < 12 ? 'AM' : 'PM'}`
}

/** 78 → "1 hr 18 min" */
export function span(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return `${h} hr${m ? ` ${m} min` : ''}`
}

/** Monday-first weekday numbers with short labels, for pickers and calendars. */
export const WEEK: { day: number; short: string; letter: string }[] = [
  { day: 1, short: 'Mon', letter: 'M' },
  { day: 2, short: 'Tue', letter: 'T' },
  { day: 3, short: 'Wed', letter: 'W' },
  { day: 4, short: 'Thu', letter: 'T' },
  { day: 5, short: 'Fri', letter: 'F' },
  { day: 6, short: 'Sat', letter: 'S' },
  { day: 0, short: 'Sun', letter: 'S' },
]
