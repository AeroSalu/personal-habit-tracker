// Renders still frames of the edit for checking layout: node render/stills.mjs 600 1500 ...
// (seconds with an "s" suffix also work: 12.5s). Writes out/stills/<frame>.jpg.
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'
import fs from 'node:fs'
import path from 'node:path'

const FPS = 60
const args = process.argv.slice(2)
const id = args[0] === '--cover' ? 'Cover' : 'CadenceDemo'
const frames = args.filter((a) => a !== '--cover').map((a) => (a.endsWith('s') ? Math.round(parseFloat(a) * FPS) : Number(a)))

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') })
const composition = await selectComposition({ serveUrl, id })
fs.mkdirSync('out/stills', { recursive: true })
for (const frame of id === 'Cover' ? [0] : frames) {
  const output = id === 'Cover' ? 'out/cover.png' : `out/stills/${String(frame).padStart(5, '0')}.jpg`
  await renderStill({ serveUrl, composition, frame, output, ...(id === 'Cover' ? { imageFormat: 'png' } : { imageFormat: 'jpeg', jpegQuality: 85 }) })
  console.log(output)
}
