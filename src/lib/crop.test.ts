import { describe, expect, it } from 'vitest'
import { centredCrop, clampCrop, MAX_ZOOM, sourceSquare, zoomTo } from './crop'

const WIDE = { w: 400, h: 200 }
const VIEW = 100

describe('photo crop', () => {
  it('centres a wide photo with its short side filling the window', () => {
    const c = centredCrop(WIDE, VIEW)
    expect(c).toEqual({ zoom: 1, x: -50, y: 0 })
    expect(sourceSquare(c, WIDE, VIEW)).toEqual({ sx: 100, sy: 0, side: 200 })
  })

  it('never lets the photo leave a gap in the window', () => {
    expect(clampCrop({ zoom: 1, x: 20, y: 5 }, WIDE, VIEW)).toEqual({ zoom: 1, x: 0, y: 0 })
    expect(clampCrop({ zoom: 1, x: -500, y: -9 }, WIDE, VIEW)).toEqual({ zoom: 1, x: -100, y: 0 })
  })

  it('keeps zoom between 1× and the maximum', () => {
    expect(clampCrop({ zoom: 0.2, x: 0, y: 0 }, WIDE, VIEW).zoom).toBe(1)
    expect(clampCrop({ zoom: 9, x: 0, y: 0 }, WIDE, VIEW).zoom).toBe(MAX_ZOOM)
  })

  it('zooms about the centre of the window', () => {
    const c = zoomTo(centredCrop(WIDE, VIEW), 2, WIDE, VIEW)
    const sq = sourceSquare(c, WIDE, VIEW)
    // Half the side, still centred on the photo's middle (200, 100).
    expect(sq.side).toBe(100)
    expect(sq.sx + sq.side / 2).toBe(200)
    expect(sq.sy + sq.side / 2).toBe(100)
  })
})
