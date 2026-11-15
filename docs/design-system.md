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
3. **Core components:** done.
   - **Buttons:** press, and a loading spinner via `aria-busy` (`ui.button`).
   - **Inputs:** a focus halo, and a red state via `aria-invalid`.
   - **Chips:** hover and press.
   - **On/off settings:** switches (`ui.switch` with `role="switch"`, label left, switch right).
   - **Every completion control:** a drawn tick (`Tick`).
   - **`Ring`:** single or concentric progress rings that sweep in and describe themselves.
   - **Toasts:** can carry an action; completing a task or habit, or deleting a task, offers Undo.
   - **`PageSkeleton`:** replaces blank pages while data loads.
   - **Not done yet:** a separate success state for buttons (saving already confirms with a toast), and the remaining off-scale spacings. Both are left for the screen work in Phase 5.
4. **Navigation and motion:** done.
   - **Library:** `motion` 14.9 (Motion for React), loaded as slim `m` components under `LazyMotion`. Its animation features (34 KB gzipped) arrive as their own chunk after the first paint, so the first load grows by about 17 KB. `MotionConfig reducedMotion="user"` respects the device setting. Tokens are in `src/design/motion.ts`.
   - **Screen changes (`PageTransition`):** tabs crossfade with a 6px rise; detail pages push in from the right and Back slides the other way. The old screen leaves while the new one arrives. New screens start at the top; Back and Forward restore the scroll position.
   - **Phone tab bar:** a floating glass bar with a highlight that slides to the chosen tab.
   - **Phone sheets:** drag the handle or header down to close; a short pull springs back.
   - **Shared element:** the focus ring on Today expands into focus mode's ring, and returns from the session summary, which now shows the completed ring.
   - **Habit card → habit page:** moved to Phase 5 and done there.
5. **Screens:** done.
   - **Today (done):** one overview card with three concentric rings (focus, tasks, habits) and a legend naming each with its numbers, Next and Start focus, and this week as seven small ring sets, Monday first, with future days faint. Streaks and XP stay off Today.
   - **Habits (done):** each habit has its own page (`/habits/:id`); its card or row grows into the page header and shrinks back on Back. The page has the tick (only when due), stats, the month calendar, today's note and history; editing and archiving open from the pencil.
   - **Focus (done):** the idle screen is one calm ring showing the session length over today's progress, a segmented length picker whose selection glides, what you're working on, and Start; sound and strict mode fold away. The ring grows into the running timer, which has a slow breathing glow behind it that rests while paused (none with reduced motion).
   - **Calendar (done):** the month sits on one card, with days as plain numbers rather than boxes. A soft ring marks the chosen day and glides to the next one; months and weeks slide in the direction you move, and a sideways swipe changes them on phones.
   - **Analytics (done):** the report card leads with the period's three rings (focus against the goal for the days so far, tasks on time, habits as planned) and its sentences. A new period's numbers and charts crossfade in, and the charts themselves never animate their values. Segmented controls on Calendar and Analytics have a gliding selection.
   - **Not done:** a separate success state for buttons (saving already confirms with a toast) and the remaining off-scale spacings. Both move to Phase 6.

   The goal: Today as an at-a-glance overview with three rings (focus, tasks, habits), the week's consistency and what's next. Habits with satisfying completion, undo and a detail view. Focus mode as the signature immersive timer, still driven by timestamps. A lighter calendar with a selection indicator and month slides. Analytics with animated rings and charts that read without animation.
6. **Polish:** micro-interactions, achievement feedback kept subtle, considered empty and loading states, Android haptics.
7. **QA:** every flow in both themes, phone, tablet and desktop, reduced motion, timer accuracy across sleep and backgrounding, and the existing tests.
