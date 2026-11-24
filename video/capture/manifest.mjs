// Collects every recorded clip into src/clips.json for the Remotion edit: frame files with
// their times (seconds from the clip's first frame), the cursor path, clicks and marks.
import fs from 'node:fs'
import path from 'node:path'

const root = 'public/captures'
const out = {}
for (const name of fs.readdirSync(root)) {
  const file = path.join(root, name, 'clip.json')
  if (!fs.existsSync(file)) continue
  const clip = JSON.parse(fs.readFileSync(file, 'utf8'))
  const t0 = clip.frames[0].t
  const r = (t) => Math.round((t - t0) * 1000) / 1000
  out[name] = {
    view: clip.view,
    scale: clip.scale,
    span: r(clip.frames.at(-1).t),
    frames: clip.frames.map((f) => [f.file, r(f.t)]),
    moves: clip.events.filter((e) => e.type === 'move' || e.type === 'start').map((e) => [r(e.t), Math.round(e.x), Math.round(e.y)]),
    clicks: clip.events.filter((e) => e.type === 'click' || e.type === 'down').map((e) => [r(e.t), Math.round(e.x), Math.round(e.y)]),
    marks: Object.fromEntries(clip.events.filter((e) => e.type === 'mark').map((e) => [e.label, r(e.t)])),
  }
}
fs.writeFileSync('src/clips.json', JSON.stringify(out))
console.log(`src/clips.json: ${Object.keys(out).length} clips`)
