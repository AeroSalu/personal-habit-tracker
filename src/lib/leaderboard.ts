// Rankings for friends and groups, invite codes, and group challenge progress. Totals from
// an older week or season count as zero, so a board resets itself each Monday and month.

import { currentSeasonXp, currentWeekMinutes, currentWeekXp, type PublicStats } from './social'

export type Metric = 'weekXp' | 'weekFocus' | 'seasonXp'

export const METRIC_LABEL: Record<Metric, string> = {
  weekXp: 'Weekly XP',
  weekFocus: 'Weekly focus',
  seasonXp: 'Season XP',
}

export type Entry = {
  uid: string
  name: string
  username: string
  stats: Pick<PublicStats, 'weekKey' | 'weekXp' | 'weekFocusMinutes' | 'seasonKey' | 'seasonXp' | 'level' | 'streak'> | null
}

export type Ranked = Entry & { rank: number; value: number }

export function metricValue(e: Entry, metric: Metric, today: string): number {
  if (!e.stats) return 0
  if (metric === 'weekXp') return currentWeekXp(e.stats, today)
  if (metric === 'weekFocus') return currentWeekMinutes(e.stats, today)
  return currentSeasonXp(e.stats, today)
}

/** Highest first. Ties share a rank (1, 2, 2, 4) and are listed by name. */
export function rank(entries: Entry[], metric: Metric, today: string): Ranked[] {
  const valued = entries
    .map((e) => ({ ...e, value: metricValue(e, metric, today) }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
  return valued.map((e, i) => ({
    ...e,
    rank: i > 0 && e.value === valued[i - 1].value ? valued.findIndex((x) => x.value === e.value) + 1 : i + 1,
  }))
}

/** Six characters, no 0/O or 1/I, so a code read aloud or typed from a screenshot works. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/

export function makeCode(random: () => number = Math.random): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join('')
}

/** Tidies what someone typed into the code field. */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function groupNameError(name: string): string {
  if (!name.trim()) return 'Give the group a name.'
  if (name.trim().length > 40) return 'Keep the name under 40 characters.'
  return ''
}

/** The group's combined focus this week against its weekly target. */
export function challengeProgress(entries: Entry[], targetMinutes: number, today: string) {
  const minutes = entries.reduce((sum, e) => sum + metricValue(e, 'weekFocus', today), 0)
  return { minutes, target: targetMinutes, share: targetMinutes ? Math.min(1, minutes / targetMinutes) : 0, done: targetMinutes > 0 && minutes >= targetMinutes }
}
