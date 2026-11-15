# Cadence design system

Cadence aims to feel calm, precise and premium, after the design principles of Apple Fitness (progress and consistency), Reminders (tasks), Music (immersive focus and fluid transitions) and Liquid Glass (floating, translucent controls). It doesn't copy their screens. Visual effects belong mainly in transitions, focus mode, navigation and contextual controls; the productivity surfaces stay minimal.

All tokens live in [`src/styles/global.css`](../src/styles/global.css). Components use tokens, never literal values. Any colour token change goes in all three theme blocks: dark, media light, and `[data-theme=light]`.

## Tokens

| Group | Tokens | Use |
|---|---|---|
| Neutrals | `--bg`, `--card`, `--card-raised`, `--border`, `--separator`, `--text`, `--muted`, `--faint` | Dark: graphite, never pure black. Light: Apple-like off-white `#f5f5f7` with white cards. |
| Accent | `--accent`, `--accent-soft`, `--accent-ink` | Primary actions, selection, ticks, the active item. Nothing else. |
| Status | `--urgent`, `--warning`, `--success` (+ `-soft`) | Only when they mean something, always with an icon or words. |
| Rings | `--ring-focus`, `--ring-tasks`, `--ring-habits` | The same three progress colours on every screen. Validated all-pairs for colour-blind separation in both themes. Always labelled. |
| Charts | `--cat-*`, `--heat-*`, `--chart-grid`, `--chart-axis` | Category hues and the heat ramp, validated per theme. |
| Glass | `.glass`, `--glass`, `--glass-border` | Floating navigation, sheets, toasts and contextual controls only. Opaque fallback where blur isn't supported. |
| Type | `--font`, `--font-display`, `--text-caption2` … `--text-large`, `--weight-regular` … `--weight-bold` | The platform font (SF Pro on Apple devices, Segoe UI Variable on Windows, Roboto on Android). Apple text-style sizes 11/12/13/14/15/17/20/24/28/34. Tabular numbers (`.num`) for timers and statistics. |
| Spacing | `--space-1` … `--space-9` | 4, 8, 12, 16, 24, 32, 40, 48, 64. |
| Corners | `--radius-xs` 6, `--radius-sm` 10, `--radius` 12, `--radius-lg` 16, `--radius-xl` 22, `--radius-sheet` 26, `--radius-pill` | Controls, nested boxes, cards, hero cards, sheets, pills. Inner corners are smaller than the container's. |
| Depth | `--shadow-1` … `--shadow-3` | Light shadows only where depth means something. Prefer surface contrast. |
| Motion | `--dur-instant` 100 · `--dur-1` 160 · `--dur-2` 250 · `--dur-3` 350 · `--dur-4` 500 · `--dur-5` 800; `--ease-standard`, `--ease-out` (enter), `--ease-in` (exit) | Presses, small changes, items, pages and sheets, expressive moments, data visualisations. Reduced motion zeroes all durations and delays. |

## Audit (November 2026)

Problems found before this work:

- **Type:** 18 different font sizes and 8 font weights, with half-steps (12.5, 13.5, 550, 650) that made text look slightly inconsistent between screens.
- **Corners:** 13 corner radius values.
- **Spacing:** 118 spacing values outside the scale.
- **Font:** Inter on every platform, instead of the platform's own font.
- **Light theme:** neutrals were close to but not quite the platform's.
- **Missing:** no shared progress-ring colours, no translucent material, no sheet radius.
- **Motion:** CSS only, with no springs, no exit transitions between pages, and no shared-element transitions.
- **Screens:** the dashboard has one focus ring rather than an at-a-glance overview. The focus page's idle state is a settings form rather than a calm timer. The calendar month view is dense, with a filled box for every day. Empty states are plain text.

There is one app: a React + Vite PWA, installed on phones from the browser. There is no React Native app, so "native feel" means the PWA's safe areas, touch feedback, gestures and haptics where the browser allows (Android vibration only; iOS Safari has no haptics API).

## Phases

1. **Audit:** done (above).
2. **Design system:** done. Tokens above, base type in the platform font, the glass material, ring colours, and literal sizes, weights, radii and on-scale spacings across all CSS modules mapped onto tokens. The off-scale spacings that remain (2, 3, 6, 10px …) are settled per component in Phase 3. Charts keep their exact sizes.
3. **Core components:** buttons (press, loading, success), inputs (focus, validation), toggles, checkboxes with a drawn tick, cards, progress rings, toasts with undo, skeletons.
4. **Navigation and motion:** add `motion` (Motion for React) for springs, exit animations and shared-element transitions: tab crossfades, pushes for detail pages, sheets with drag-to-dismiss, habit card → habit detail, focus card → focus mode. A glass bottom bar and sidebar.
5. **Screens:** Today as an at-a-glance overview with three rings (focus, tasks, habits), the week's consistency and what's next. Habits with satisfying completion, undo and a detail view. Focus mode as the signature immersive timer, still driven by timestamps. A lighter calendar with a selection indicator and month slides. Analytics with animated rings and charts that read without animation.
6. **Polish:** micro-interactions, achievement feedback kept subtle, considered empty and loading states, Android haptics.
7. **QA:** every flow in both themes, phone, tablet and desktop, reduced motion, timer accuracy across sleep and backgrounding, and the existing tests.
