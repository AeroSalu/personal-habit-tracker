// Draws a badge as an image card and hands it to the phone's share sheet, or downloads it
// where sharing files isn't supported. Colours match the dark design tokens in global.css.

const W = 1080
const H = 1080
const BG = '#0e0f12'
const CARD = '#16181d'
const ACCENT = '#7c83ff'
const TEXT = '#ecedef'
const MUTED = '#a0a4ad'

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function drawBadgeCard(badge: { name: string; description: string }, person: { name: string; username: string }) {
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const font = (weight: number, size: number) => `${weight} ${size}px "Inter Variable", "Segoe UI", system-ui, sans-serif`

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = CARD
  ctx.beginPath()
  ctx.roundRect(80, 80, W - 160, H - 160, 48)
  ctx.fill()

  // Badge medallion
  ctx.fillStyle = 'rgba(124, 131, 255, 0.14)'
  ctx.beginPath()
  ctx.arc(W / 2, 380, 150, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(W / 2, 380, 110, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 16
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(W / 2 - 48, 384)
  ctx.lineTo(W / 2 - 10, 422)
  ctx.lineTo(W / 2 + 56, 344)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = MUTED
  ctx.font = font(600, 34)
  ctx.fillText('BADGE EARNED', W / 2, 600)

  ctx.fillStyle = TEXT
  ctx.font = font(750, 76)
  wrap(ctx, badge.name, W - 280).forEach((l, i) => ctx.fillText(l, W / 2, 690 + i * 84))

  ctx.fillStyle = MUTED
  ctx.font = font(400, 36)
  wrap(ctx, badge.description, W - 320).slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 790 + i * 48))

  ctx.fillStyle = TEXT
  ctx.font = font(600, 34)
  ctx.fillText(`${person.name} · @${person.username}`, W / 2, 920)

  ctx.textAlign = 'left'
  ctx.fillStyle = ACCENT
  ctx.font = font(800, 34)
  ctx.fillText('CADENCE', 130, 160)

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No image'))), 'image/png'))
}

/** Returns 'shared', 'downloaded' or 'cancelled'. */
export async function shareBadge(
  badge: { id: string; name: string; description: string },
  person: { name: string; username: string },
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await drawBadgeCard(badge, person)
  const file = new File([blob], `cadence-${badge.id}.png`, { type: 'image/png' })
  const text = `I earned the ${badge.name} badge on Cadence.`
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: badge.name, text })
      return 'shared'
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
