// Prints the accessible controls on given routes, to pick reliable selectors for the clips.
import { openApp } from './lib.mjs'

const routes = process.argv.slice(2)
const { browser, page } = await openApp({ clock: new Date('2026-11-27T16:30') })
for (const r of routes) {
  await page.goto(`http://127.0.0.1:5173/${r}`)
  await page.waitForSelector('main h1')
  await page.waitForTimeout(1500)
  const snap = await page.locator('main').ariaSnapshot()
  console.log(`\n===== ${r}\n` + snap.split('\n').filter((l) => /button|link|tab|checkbox|textbox|combobox|radio|heading/.test(l)).slice(0, 60).join('\n'))
}
await browser.close()
