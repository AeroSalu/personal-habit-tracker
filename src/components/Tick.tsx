/**
 * The check mark inside every completion control. It draws itself in when its button turns
 * on (`aria-pressed="true"`) and undraws on undo; `drawn` draws it once on appearing, for
 * marks shown only when something is already done. Styles are in global.css (`.tick`).
 */
export function Tick({ size = 14, drawn = false }: { size?: number; drawn?: boolean }) {
  return (
    <svg
      className={`tick ${drawn ? 'tick-drawn' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
    </svg>
  )
}
