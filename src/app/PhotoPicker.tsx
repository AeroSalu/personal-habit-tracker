import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Dialog } from '../components/Dialog'
import { centredCrop, clampCrop, MAX_ZOOM, sourceSquare, zoomTo, type Crop } from '../lib/crop'
import ui from '../components/ui.module.css'
import styles from './PhotoPicker.module.css'

/** The window's size on screen, and the saved photo's size. */
const VIEW = 240
const OUT = 128
/** Matches the photo size limit in firestore.rules. */
const MAX_CHARS = 20000

/**
 * Shrinks the chosen square to a small image the database can hold: WebP where the browser
 * can make it, JPEG otherwise, lowering quality until it fits.
 */
function encode(img: HTMLImageElement, crop: Crop): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = OUT
  canvas.height = OUT
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const { sx, sy, side } = sourceSquare(crop, { w: img.naturalWidth, h: img.naturalHeight }, VIEW)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, side, side, 0, 0, OUT, OUT)
  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    let url = canvas.toDataURL('image/webp', quality)
    // Browsers without WebP encoding hand back a PNG instead.
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality)
    if (url.length <= MAX_CHARS) return url
  }
  return null
}

/** Pick a photo, drag and zoom it inside the circle, and save a small copy. */
export function PhotoPicker({ file, onSave, onClose }: { file: File; onSave: (photo: string) => void; onClose: () => void }) {
  const [src, setSrc] = useState('')
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, zoom: 1 })
  const [error, setError] = useState('')
  const drag = useRef<{ x: number; y: number; crop: Crop } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const size = img ? { w: img.naturalWidth, h: img.naturalHeight } : { w: 1, h: 1 }
  const scale = (VIEW / Math.min(size.w, size.h)) * crop.zoom

  function down(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, crop }
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || !img) return
    setCrop(clampCrop({ ...d.crop, x: d.crop.x + e.clientX - d.x, y: d.crop.y + e.clientY - d.y }, size, VIEW))
  }

  function save() {
    if (!img) return
    const photo = encode(img, crop)
    if (!photo) {
      setError('That photo could not be shrunk enough. Try another one.')
      return
    }
    onSave(photo)
  }

  return (
    <Dialog title="Profile photo" onClose={onClose}>
      <div
        className={styles.window}
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        role="img"
        aria-label="Drag to position the photo"
      >
        {src && (
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget
              setImg(el)
              setCrop(centredCrop({ w: el.naturalWidth, h: el.naturalHeight }, VIEW))
            }}
            onError={() => setError('That file isn’t a photo this browser can open.')}
            style={{ width: size.w * scale, height: size.h * scale, transform: `translate(${crop.x}px, ${crop.y}px)` }}
          />
        )}
      </div>
      <label className={ui.field}>
        <span className={ui.label}>Zoom</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          disabled={!img}
          onChange={(e) => setCrop(zoomTo(crop, Number(e.target.value), size, VIEW))}
        />
      </label>
      <p className={ui.error} role="alert">
        {error}
      </p>
      <button type="button" className={`${ui.button} ${ui.primary} ${ui.block}`} onClick={save} disabled={!img}>
        Save photo
      </button>
    </Dialog>
  )
}
