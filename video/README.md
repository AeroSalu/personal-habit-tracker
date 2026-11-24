# Cadence product video

The 1:53 LinkedIn demo of Cadence, built from real recordings of the app running on local demo data.

**Outputs:** `out/cadence-demo.mp4` (1920×1080, 60 fps, H.264 + AAC) and `out/cover.png`.

## Rebuilding it

Start the emulators (`npm run emulators`) and the dev server (`npm run dev`) in the app folder first. Then, in this folder:

1. `npm run record` seeds the emulators (`seed.mjs`) and records every clip into `public/captures/`. Name clips to redo only those: `node capture/clips.mjs focus`.
2. `npm run manifest` collects the clips into `src/clips.json`.
3. `npm run music` composes the soundtrack and sound effects into `public/audio/`.
4. `npm run render` writes `out/cadence-demo.mp4`. `node render/stills.mjs --cover` writes the cover.

To check a take or a frame of the edit:
- `node capture/contact.mjs <clip>` tiles a clip's frames into a contact sheet.
- `node render/stills.mjs 30s 61.5s` renders single frames.
- `npm run studio` opens the timeline in Remotion Studio.

## How it fits together

- **Demo data:** `seed.mjs` builds ten weeks of believable history for Aryan, four friends, a group and a live focus room. It only ever writes to the `demo-lockin` emulators.
- **Recording:** `capture/clips.mjs` drives Chromium with Playwright. It saves CDP screencast frames at 2× with their timestamps, plus the mouse path.
  - The app's `Date` is shifted to Friday 4:30 PM so weekly charts are full. Playwright's own fake clock stalls Motion's exit animations, so it isn't used.
  - Service workers are blocked so the app never reloads mid-take.
  - Headless fullscreen is stubbed out so the Focus overlay keeps the full window size.
- **The edit:** `src/timeline.ts` lists every scene in bars of the 100 BPM music, with each scene's source segments, camera keyframes and caption. `ClipView` plays a clip's real frames, eases the camera, and draws the cursor and click ripples from the recorded mouse log.
- **Music:** `audio/compose.mjs` synthesises an original track, so there are no licence questions. Its sections match the timeline.
- **Captions** only claim what the app does today. Reminders are left out until they're set up live.
