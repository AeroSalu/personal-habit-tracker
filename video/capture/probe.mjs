// Checks the capture: frame rate while animating, and whether a moved clock keeps the app working.
import { openApp, record } from './lib.mjs'

const clock = process.argv[2] ? new Date(process.argv[2]) : undefined
const { browser, page } = await openApp({ clock })
console.log('app date:', await page.evaluate(() => new Date().toString()))
await record(page, 'probe', async (a) => {
  await a.click('nav a[href="/analytics"]')
  await a.wait(1500)
  await a.click('nav a[href="/calendar"]')
  await a.wait(1500)
  await a.click('nav a[href="/"]')
  await a.wait(1500)
})
console.log('h1:', await page.locator('main h1').first().textContent())
console.log('today text:', (await page.locator('main').innerText()).slice(0, 300).replace(/\n/g, ' | '))
await browser.close()
