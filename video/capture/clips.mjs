// The scripted clips for the demo video. Each one starts from freshly seeded data at the same
// moment (Friday afternoon, so weekly charts have five days), runs in its own browser, and
// writes captures/<name>/ with frames, timestamps and the cursor log.
//
//   node capture/clips.mjs            record every clip
//   node capture/clips.mjs focus tasks   record only these
import { execSync } from 'node:child_process'
import { openApp, record, APP } from './lib.mjs'

export const DEMO_NOW = '2026-11-27T16:30'

const btn = (page, name, exact = false) => page.getByRole('button', { name, exact }).first()

const CLIPS = {
  // Today: rings, this week, then ticking a task and watching the rings move.
  today: {
    route: '/',
    async run(a) {
      const { page } = a
      await a.wait(900)
      await a.hover('[aria-label="Today at a glance"] svg', 900)
      await a.wait(900)
      a.mark('week')
      await a.hover('main >> text=This week', 700)
      await a.wait(600)
      await a.scroll(520, 1300)
      await a.wait(500)
      a.mark('tick')
      await a.click(btn(page, 'Complete Read OS concepts, chapter 6'))
      await a.wait(1300)
      await a.scroll(-520, 1300)
      a.mark('rings-updated')
      await a.wait(1800)
    },
  },

  // Plain-words quick add: chips show what was understood, Enter adds it.
  quickadd: {
    route: '/tasks',
    async run(a) {
      const { page } = a
      await a.wait(600)
      await a.click(page.getByRole('textbox', { name: /Add a task/ }))
      await a.wait(300)
      a.mark('typing')
      await a.type('Revise networks notes tomorrow 6pm #study !high 45m', 65)
      a.mark('chips')
      await a.wait(1800)
      await a.key('Enter')
      a.mark('added')
      await a.wait(1600)
    },
  },

  // Tasks: the list, then the board, dragging a card into In progress.
  board: {
    route: '/tasks',
    async run(a) {
      const { page } = a
      await a.wait(700)
      await a.hover(btn(page, /^Finish DBMS assignment 4 high/), 700)
      await a.wait(500)
      await a.click(btn(page, 'Board', true))
      a.mark('board')
      await a.wait(1400)
      const card = page.locator('[aria-label^="Move Read OS concepts, chapter 6"]').first()
      const target = page.locator('section[aria-label="In progress"]')
      await a.drag(card, target, { dy: 0 })
      a.mark('dropped')
      await a.wait(1500)
    },
  },

  // Calendar: pick a day, glide to next month and back, then today.
  calendar: {
    route: '/calendar',
    async run(a) {
      const { page } = a
      await a.wait(700)
      await a.click(btn(page, 'Saturday, November 28'))
      await a.wait(900)
      await a.click(btn(page, 'Next month'))
      await a.wait(1000)
      await a.click(btn(page, 'Previous month'))
      await a.wait(1100)
      await a.click(btn(page, 'Friday, November 27'))
      await a.wait(1600)
    },
  },

  // Focus: choose 50/10, start, the calm ring; then jump to the end for the summary.
  focus: {
    route: '/focus',
    async run(a) {
      const { page } = a
      await a.wait(700)
      await a.click(btn(page, /^50 10 break/))
      await a.wait(900)
      await a.click(btn(page, 'Start focus', true))
      a.mark('running')
      await a.wait(4200)
      a.mark('cut')
      await page.evaluate(() => window.__skipAhead((49 * 60 + 56) * 1000))
      await a.wait(5000)
      a.mark('summary')
      await a.wait(2500)
    },
  },

  // Habits: tick one, then open a habit's page (the card glides to the top).
  habits: {
    route: '/habits',
    async run(a) {
      const { page } = a
      await a.wait(700)
      await a.click(btn(page, 'Complete LeetCode problem'))
      await a.wait(1400)
      a.mark('open')
      await a.click(btn(page, /^Meditate personal/))
      await a.wait(1600)
      await a.scroll(420, 1200)
      await a.wait(1400)
    },
  },

  // Plan: add tasks to today and give one a time; then the evening review.
  plan: {
    route: '/plan',
    async run(a) {
      const { page } = a
      await a.wait(700)
      await a.click(btn(page, 'Add to today: Update resume with Cadence'))
      await a.wait(700)
      await a.click(btn(page, 'Add to today: Hackathon pitch deck'))
      await a.wait(1000)
      a.mark('review')
      await a.click(btn(page, 'Review', true))
      await a.wait(1200)
      const stars = page.getByRole('radiogroup', { name: 'Rate today' }).or(page.locator('[aria-label="Rate today"]')).first()
      if (await stars.count()) {
        const five = stars.getByRole('radio').or(stars.getByRole('button')).nth(4)
        await a.click(five)
        await a.wait(500)
      }
      const win = page.getByRole('textbox', { name: 'Win 1' })
      if (await win.count()) {
        await a.click(win)
        await a.type('Finished the DBMS normalisation', 45)
      }
      await a.wait(1200)
    },
  },

  // Analytics: this week, a tooltip, then the month and the deeper charts.
  analytics: {
    route: '/analytics',
    async run(a) {
      const { page } = a
      await a.wait(1000)
      await a.click(btn(page, 'Month', true))
      a.mark('month')
      await a.wait(1400)
      await a.scroll(560, 1500)
      await a.wait(600)
      const col = page.locator('main svg rect').nth(12)
      if (await col.count()) await a.hover(col, 600)
      await a.wait(900)
      await a.scroll(700, 1600)
      await a.wait(1500)
    },
  },

  // Challenges: level, missions, personal bests and badges.
  challenges: {
    route: '/challenges',
    async run(a) {
      await a.wait(1400)
      await a.scroll(520, 1800)
      await a.wait(900)
      await a.scroll(520, 1800)
      await a.wait(1300)
    },
  },

  // Friends: cheer a friend's badge, open their page.
  friends: {
    route: '/friends',
    async run(a) {
      const { page } = a
      await a.wait(900)
      const item = page.locator('li.enter').filter({ hasText: 'Unbreakable' }).first()
      await a.click(item.locator('[role=group] button').nth(1))
      await a.wait(1200)
      a.mark('profile')
      await a.click(page.getByRole('link', { name: 'Open Priya Sharma’s profile' }))
      await a.wait(1500)
      await a.scroll(480, 1400)
      await a.wait(1400)
    },
  },

  // Group leaderboard.
  leaderboard: {
    route: '/leaderboard',
    async run(a) {
      const { page } = a
      await a.wait(900)
      await a.click(btn(page, 'DIT Study Circle'))
      await a.wait(1200)
      await a.click(btn(page, 'Weekly focus'))
      await a.wait(1500)
    },
  },

  // A live focus room: friends focusing, join the shared session.
  room: {
    route: '/rooms/exam-prep-room',
    async run(a) {
      const { page } = a
      await a.wait(1300)
      await a.hover('main >> text=In the room', 700)
      await a.wait(700)
      await a.click(btn(page, 'Join the session'))
      a.mark('joined')
      await a.wait(3500)
    },
  },

  // Ctrl+K: search and jump.
  palette: {
    route: '/',
    async run(a) {
      const { page } = a
      await a.wait(800)
      await a.key('Control+k')
      await a.wait(700)
      await a.type('pitch', 110)
      await a.wait(1000)
      // The first row adds the text as a task; the match is the one below it.
      await a.key('ArrowDown')
      await a.wait(500)
      await a.key('Enter')
      await a.wait(1800)
      void page
    },
  },

  // Settings: reminders and theme.
  settings: {
    route: '/profile',
    async run(a) {
      const { page } = a
      await a.wait(800)
      await a.scroll(900, 1800)
      await a.wait(1000)
      const heading = page.getByRole('heading', { name: /Reminders/ }).first()
      if (await heading.count()) await a.hover(heading, 600)
      await a.wait(1400)
    },
  },

  // Light theme: the same calm design.
  light: {
    route: '/',
    open: { theme: 'light' },
    async run(a) {
      await a.wait(1200)
      await a.scroll(520, 1500)
      await a.wait(1400)
    },
  },

  // Phone: the installed app's layout and bottom bar.
  phone: {
    route: '/',
    open: { view: { width: 390, height: 844 }, scale: 3, mobile: true },
    async run(a) {
      const { page } = a
      await a.wait(1100)
      await a.click(page.locator('nav a[href="/habits"]').last())
      await a.wait(1300)
      await a.click(page.locator('nav a[href="/focus"]').last())
      await a.wait(1300)
      await a.click(page.locator('nav a[href="/"]').last())
      await a.wait(1300)
    },
  },
}

async function recordClip(name) {
  const clip = CLIPS[name]
  execSync(`node seed.mjs --now=${DEMO_NOW}`, { stdio: 'ignore' })
  const { browser, page } = await openApp({ clock: new Date(DEMO_NOW), ...(clip.open ?? {}) })
  try {
    await page.goto(APP + clip.route)
    await page.waitForSelector('main h1')
    await page.waitForTimeout(1800)
    await record(page, name, clip.run)
  } finally {
    await browser.close()
  }
}

const wanted = process.argv.slice(2)
for (const name of wanted.length ? wanted : Object.keys(CLIPS)) {
  try {
    await recordClip(name)
  } catch (e) {
    console.error(`${name} FAILED: ${e.message.split('\n')[0]}`)
  }
}
