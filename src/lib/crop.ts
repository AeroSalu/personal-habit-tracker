// The square crop behind the profile photo picker. A photo sits under a square window of
// `view` pixels: it always covers the window, can be zoomed from 1× (its short side fills
// the window) to MAX_ZOOM, and dragged. Offsets are the photo's top-left corner relative to
// the window, so they are always ≤ 0.

export const MAX_ZOOM = 3

export type Crop = { x: number; y: number; zoom: number }
export type Size = { w: number; h: number }

/** Pixels on screen per pixel of the photo at a zoom. */
export function scaleOf(img: Size, view: number, zoom: number): number {
  return (view / Math.min(img.w, img.h)) * zoom
}

/** Keeps the photo covering the whole window. */
export function clampCrop(c: Crop, img: Size, view: number): Crop {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, c.zoom))
  const s = scaleOf(img, view, zoom)
  const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v))
  return { zoom, x: clamp(c.x, view - img.w * s), y: clamp(c.y, view - img.h * s) }
}

/** The photo centred in the window at 1×. */
export function centredCrop(img: Size, view: number): Crop {
  const s = scaleOf(img, view, 1)
  return { zoom: 1, x: (view - img.w * s) / 2, y: (view - img.h * s) / 2 }
}

/** Zooms about the window's centre, so the part in the middle stays in the middle. */
export function zoomTo(c: Crop, zoom: number, img: Size, view: number): Crop {
  const before = scaleOf(img, view, c.zoom)
  const next = Math.min(MAX_ZOOM, Math.max(1, zoom))
  const after = scaleOf(img, view, next)
  const mid = view / 2
  const k = after / before
  return clampCrop({ zoom: next, x: mid - (mid - c.x) * k, y: mid - (mid - c.y) * k }, img, view)
}

/** The square of the original photo that the window shows, for drawing onto a canvas. */
export function sourceSquare(c: Crop, img: Size, view: number) {
  const s = scaleOf(img, view, c.zoom)
  return { sx: (0 - c.x) / s, sy: (0 - c.y) / s, side: view / s }
}
