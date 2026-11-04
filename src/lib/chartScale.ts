// Axis ticks for minute values: a clean top value and 3–5 evenly spaced ticks, in minutes
// for short spans and whole hours for long ones.

const STEPS = [5, 10, 15, 30, 60, 120, 180, 240, 360, 480, 600, 1200]

export function minuteTicks(max: number): number[] {
  if (max <= 0) return [0, 15, 30]
  const step = STEPS.find((s) => max / s <= 4) ?? Math.ceil(max / 4 / 60) * 60
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  return ticks
}

/** Compact tick label: "45m", "1h", "1.5h". */
export function tickLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = minutes / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`
}
