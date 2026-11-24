// Tiles evenly spaced frames of each clip into captures/<name>/sheet.jpg, for reviewing a take.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const names = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync('captures').filter((n) => fs.existsSync(`captures/${n}/clip.json`))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } })
for (const name of names) {
  const dir = path.resolve('captures', name)
  const { frames } = JSON.parse(fs.readFileSync(path.join(dir, 'clip.json'), 'utf8'))
  const t0 = frames[0].t
  const span = frames.at(-1).t - t0
  const picks = []
  for (let i = 0; i < 9; i++) {
    const want = t0 + (span * i) / 8
    let best = frames[0]
    for (const f of frames) if (f.t <= want) best = f
    picks.push({ src: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(dir, 'frames', best.file)).toString('base64'), t: (best.t - t0).toFixed(1) })
  }
  await page.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font:14px sans-serif;color:#fff">
    ${picks.map((p) => `<div style="position:relative"><img src="${p.src}" style="width:100%;display:block"><span style="position:absolute;left:6px;top:4px;background:#000a;padding:1px 4px">${p.t}s</span></div>`).join('')}</body>`)
  await page.waitForLoadState('load')
  await page.screenshot({ path: path.join(dir, 'sheet.jpg'), fullPage: true, type: 'jpeg', quality: 80 })
  console.log(`captures/${name}/sheet.jpg`)
}
await browser.close()
