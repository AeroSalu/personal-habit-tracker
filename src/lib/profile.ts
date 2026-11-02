export type Profile = {
  displayName: string
  dailyFocusGoalMinutes: number
  createdAt: string
}

export type ProfileFields = Pick<Profile, 'displayName' | 'dailyFocusGoalMinutes'>

export const FOCUS_GOAL_PRESETS = [60, 120, 180, 240, 360]
export const MAX_FOCUS_GOAL_MINUTES = 16 * 60

export function profileError(fields: ProfileFields): string {
  if (!fields.displayName.trim()) return 'Enter your name.'
  if (fields.displayName.trim().length > 40) return 'Keep your name under 40 characters.'
  const goal = fields.dailyFocusGoalMinutes
  if (!Number.isInteger(goal) || goal < 15 || goal > MAX_FOCUS_GOAL_MINUTES) {
    return 'Set a daily focus goal between 15 minutes and 16 hours.'
  }
  return ''
}

/** 90 → "1h 30m", 120 → "2h", 45 → "45m" */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

/** Reads a stored profile, filling gaps so older or partial documents still load. */
export function toProfile(data: Record<string, unknown>): Profile {
  return {
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    dailyFocusGoalMinutes:
      typeof data.dailyFocusGoalMinutes === 'number' ? data.dailyFocusGoalMinutes : 120,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
  }
}

export function firstName(profile: Profile): string {
  return profile.displayName.trim().split(/\s+/)[0] ?? ''
}
