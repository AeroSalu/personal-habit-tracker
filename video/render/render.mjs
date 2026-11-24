// Renders the finished video for LinkedIn: 1920×1080, 60 fps, H.264 (high quality, yuv420p)
// with AAC audio, tagged BT.709 limited range so players and LinkedIn show true colours.
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'node:path'

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') })
const composition = await selectComposition({ serveUrl, id: 'CadenceDemo' })
let last = -1
const started = Date.now()
await renderMedia({
  serveUrl,
  composition,
  codec: 'h264',
  crf: 12,
  colorSpace: 'bt709',
  pixelFormat: 'yuv420p',
  x264Preset: 'medium',
  audioCodec: 'aac',
  audioBitrate: '320k',
  imageFormat: 'jpeg',
  jpegQuality: 95,
  outputLocation: 'out/cadence-demo.mp4',
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 20) * 5
    if (pct !== last) {
      last = pct
      console.log(`${pct}% after ${Math.round((Date.now() - started) / 1000)} s`)
    }
  },
})
console.log('out/cadence-demo.mp4')
