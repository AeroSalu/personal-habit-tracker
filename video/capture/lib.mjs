// Shared pieces for recording Cadence: a signed-in browser, a sharp screencast, and a log of
// where the (invisible) mouse goes so Remotion can draw a cursor and clicks on top.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

export const APP = 'http://127.0.0.1:5173'
export const VIEW = { width: 1440, height: 810 }
export const SCALE = 2
const DEMO = { email: 'aryan@cadence.test', password: 'cadence-demo-2026' }

export async function openApp({ clock, theme = 'dark', view = VIEW, scale = SCALE, mobile = false } = {}) {
  const browser = await chromium.launch({ args: ['--hide-scrollbars', '--force-color-profile=srgb'] })
  const context = await browser.newContext({
    viewport: view,
    deviceScaleFactor: scale,
    colorScheme: theme,
    reducedMotion: 'no-preference',
    isMobile: mobile,
    hasTouch: mobile,
    // A service worker taking control mid-take reloads the app, splash and all.
    serviceWorkers: 'block',
  })
  // Headless fullscreen shrinks the window to 800×600; the overlay covers the page anyway.
  await context.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.resolve()
  })
  // Shift only Date, by a fixed offset, so the app believes it's `clock` while animations keep
  // running on real time (Playwright's full fake clock stalls Motion's exit animations).
  // window.__skipAhead(ms) jumps the app's time forward, as at the end of a focus session.
  if (clock) {
    await context.addInitScript((offset) => {
      const RealDate = Date
      const realNow = RealDate.now.bind(RealDate)
      let shift = offset
      class ShiftedDate extends RealDate {
        constructor(...args) {
          if (args.length) super(...args)
          else super(realNow() + shift)
        }
        static now() {
          return realNow() + shift
        }
      }
      window.Date = ShiftedDate
      window.__skipAhead = (ms) => {
        shift += ms
      }
    }, clock.getTime() - Date.now())
  }
  const page = await context.newPage()
  await page.goto(APP)
  await page.waitForLoadState('networkidle')
  if (await page.locator('input[type=email]').count()) {
    await page.fill('input[type=email]', DEMO.email)
    await page.fill('input[type=password]', DEMO.password)
    await page.press('input[type=password]', 'Enter')
  }
  await page.waitForSelector('main h1', { timeout: 20_000 })
  await page.waitForTimeout(1500)
  return { browser, context, page }
}

/**
 * Records one clip: JPEG frames with their real timestamps, plus a log of mouse moves and
 * clicks. `script` drives the page through the returned `act` helpers.
 */
export async function record(page, name, script, { quality = 92 } = {}) {
  const dir = path.join('captures', name)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(path.join(dir, 'frames'), { recursive: true })
  const cdp = await page.context().newCDPSession(page)
  const frames = []
  const events = []
  let t0 = null
  const clockMs = () => (t0 === null ? 0 : performance.now() - t0)
  let pending = Promise.resolve()

  cdp.on('Page.screencastFrame', ({ data, sessionId, metadata }) => {
    const i = frames.length
    const file = `f${String(i).padStart(5, '0')}.jpg`
    frames.push({ file, t: metadata.timestamp })
    pending = pending.then(() => fs.promises.writeFile(path.join(dir, 'frames', file), Buffer.from(data, 'base64')))
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })

  const view = page.viewportSize()
  let mouse = { x: view.width * 0.62, y: view.height * 0.7 }
  const log = (type, extra = {}) => events.push({ type, t: Date.now() / 1000, x: mouse.x, y: mouse.y, ...extra })

  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
  const act = {
    page,
    wait: (ms) => page.waitForTimeout(ms),
    /** Glides the mouse to a point over `ms`, so hover states play as a person's would. */
    async moveTo(x, y, ms = 650) {
      const from = { ...mouse }
      const steps = Math.max(8, Math.round(ms / 16))
      for (let i = 1; i <= steps; i++) {
        const k = ease(i / steps)
        mouse = { x: from.x + (x - from.x) * k, y: from.y + (y - from.y) * k }
        await page.mouse.move(mouse.x, mouse.y)
        log('move')
        await page.waitForTimeout(ms / steps)
      }
    },
    async box(target) {
      const loc = typeof target === 'string' ? page.locator(target).first() : target
      await loc.scrollIntoViewIfNeeded()
      const b = await loc.boundingBox()
      if (!b) throw new Error(`No box for ${target}`)
      return b
    },
    async hover(target, ms) {
      const b = await act.box(target)
      await act.moveTo(b.x + b.width / 2, b.y + b.height / 2, ms)
      return b
    },
    async click(target, { ms, pause = 180 } = {}) {
      await act.hover(target, ms)
      await page.waitForTimeout(pause)
      log('click')
      await page.mouse.down()
      await page.waitForTimeout(70)
      await page.mouse.up()
    },
    /** Presses on `from`, glides to `to` (offset by dy), and lets go, as a drag-and-drop. */
    async drag(from, to, { dy = 0, ms = 1100 } = {}) {
      await act.hover(from, 600)
      await page.waitForTimeout(150)
      log('down')
      await page.mouse.down()
      await act.moveTo(mouse.x + 12, mouse.y + 6, 160)
      const b = await (typeof to === 'string' ? page.locator(to).first() : to).boundingBox()
      // Aim near the top of tall targets, so the drag never nears the edge and scrolls the page.
      await act.moveTo(b.x + b.width / 2, b.y + Math.min(b.height / 2, 150) + dy, ms)
      await page.waitForTimeout(200)
      log('up')
      await page.mouse.up()
    },
    async type(text, delay = 55) {
      log('type', { text })
      await page.keyboard.type(text, { delay })
    },
    async key(k) {
      log('key', { key: k })
      await page.keyboard.press(k)
    },
    /** Marks a moment the edit can cut or zoom to. */
    mark(label) {
      log('mark', { label })
    },
    async scroll(dy, ms = 900) {
      log('scroll', { dy })
      const steps = Math.round(ms / 16)
      for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, dy / steps)
        await page.waitForTimeout(16)
      }
    },
  }

  await page.mouse.move(mouse.x, mouse.y)
  const scale = await page.evaluate(() => window.devicePixelRatio)
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality, everyNthFrame: 1, maxWidth: Math.round(view.width * scale), maxHeight: Math.round(view.height * scale) })
  const start = Date.now() / 1000
  t0 = performance.now()
  log('start')
  await page.waitForTimeout(400)
  try {
    await script(act)
  } finally {
    await page.waitForTimeout(500)
    log('end')
    await cdp.send('Page.stopScreencast')
    await pending
  }
  const meta = { name, view, scale, start, frames, events }
  fs.writeFileSync(path.join(dir, 'clip.json'), JSON.stringify(meta, null, 1))
  const span = frames.at(-1).t - frames[0].t
  console.log(`${name}: ${frames.length} frames over ${span.toFixed(1)} s (${(frames.length / span).toFixed(1)} fps)`)
  void clockMs
  return meta
}
