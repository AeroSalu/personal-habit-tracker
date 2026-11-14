import { useLayoutEffect, useRef } from 'react'

/**
 * Lets rows glide to their new place when a list re-sorts (FLIP: first, last, invert, play).
 * Attach the returned ref to the list and give each row a stable `data-flip` attribute.
 * After every render it compares each row's position with the last one and, where a row
 * moved, starts it at the old spot and eases it into the new one. Rows that just appeared
 * are left to their own entrance. Reduced motion skips it.
 */
export function useFlip<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const last = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const list = ref.current
    if (!list) return
    const rows = [...list.querySelectorAll<HTMLElement>('[data-flip]')]
    const now = new Map(rows.map((el) => [el.dataset.flip!, el.getBoundingClientRect().top]))
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!still) {
      for (const el of rows) {
        const before = last.current.get(el.dataset.flip!)
        const dy = before === undefined ? 0 : before - now.get(el.dataset.flip!)!
        if (Math.abs(dy) < 1) continue
        el.style.transition = 'none'
        el.style.transform = `translateY(${dy}px)`
        // Read layout so the starting position applies before the transition starts.
        void el.offsetHeight
        el.style.transition = 'transform var(--dur-3) var(--ease-out)'
        el.style.transform = ''
        el.addEventListener('transitionend', () => (el.style.transition = ''), { once: true })
      }
    }
    last.current = now
  })

  return ref
}
