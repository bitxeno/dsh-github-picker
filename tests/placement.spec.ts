/** The popup placement math: fitting, side choice, sheet fallback, media hints. */
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  POPUP_GAP,
  POPUP_MARGIN,
  POPUP_MAX_HEIGHT,
  POPUP_WIDTH,
  SHEET_MAX_HEIGHT,
  SHEET_WIDTH,
  TOUCH_TOP_INSET,
  SHEET_THRESHOLD,
  computePopupPlacement,
  clipBoxFor,
  intersectBoxes,
  prefersCoarsePointer,
  readViewport,
  type Box,
  type ViewportBox,
} from '../src/client/placement.ts'

/** A viewport box helper (layout = visible unless overridden). */
const viewport = (width: number, height: number, left = 0, top = 0): ViewportBox => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
})

/** An anchor box helper. */
const anchor = (left: number, top: number, width = 28, height = 28): Box => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
})

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, 'visualViewport')
})

describe('computePopupPlacement', () => {
  it('opens above the button on a desktop viewport, right-aligned to it', () => {
    const placement = computePopupPlacement(anchor(700, 600), viewport(1024, 768))
    expect(placement.side).toBe('above')
    // Right edges align; the popup keeps its preferred width and height cap.
    expect(placement.offsetLeft + placement.width).toBe(28)
    expect(placement.width).toBe(POPUP_WIDTH)
    expect(placement.maxHeight).toBe(POPUP_MAX_HEIGHT)
    expect(placement.offsetBottom).toBe(28 + POPUP_GAP)
    expect(placement.offsetTop).toBeUndefined()
  })

  it('opens below the button when there is more room underneath', () => {
    const placement = computePopupPlacement(anchor(700, 40), viewport(1024, 768))
    expect(placement.side).toBe('below')
    expect(placement.offsetTop).toBe(28 + POPUP_GAP)
    expect(placement.offsetBottom).toBeUndefined()
  })

  it('shrinks the width to a narrow phone screen and keeps the left margin', () => {
    const placement = computePopupPlacement(anchor(280, 600), viewport(320, 640))
    expect(placement.width).toBe(320 - 2 * POPUP_MARGIN)
    expect(placement.offsetLeft).toBe(POPUP_MARGIN - 280)
    // The box still ends at the right margin.
    expect(placement.offsetLeft + placement.width).toBe(320 - POPUP_MARGIN - 280)
  })

  it('never lets the left edge cross the margin on a wide screen', () => {
    const placement = computePopupPlacement(anchor(10, 600, 28, 28), viewport(1024, 768))
    expect(placement.offsetLeft).toBe(POPUP_MARGIN - 10)
  })

  it('caps the height to the free room above when it is smaller than the preferred cap', () => {
    const top = 300
    const placement = computePopupPlacement(anchor(700, top), viewport(1024, 400))
    expect(placement.side).toBe('above')
    expect(placement.maxHeight).toBe(top - POPUP_GAP - POPUP_MARGIN)
  })

  it('caps the height to the free room below', () => {
    const height = 400
    const placement = computePopupPlacement(anchor(700, 100), viewport(1024, height))
    expect(placement.side).toBe('below')
    expect(placement.maxHeight).toBe(height - POPUP_MARGIN - 128 - POPUP_GAP)
  })

  it('falls back to a bottom sheet when neither side has room (landscape phone)', () => {
    const placement = computePopupPlacement(anchor(600, 150), viewport(700, 320))
    expect(placement.side).toBe('sheet')
    expect(placement.width).toBe(SHEET_WIDTH)
    expect(placement.maxHeight).toBe(320 - 2 * POPUP_MARGIN)
    // Centred in the viewport: (700 - 480) / 2 - 600.
    expect(placement.offsetLeft).toBe(-490)
    // The sheet's bottom sits at the viewport's bottom margin.
    expect(placement.offsetBottom).toBe(178 - (320 - POPUP_MARGIN))
    expect(placement.offsetTop).toBeUndefined()
  })

  it('shrinks the sheet to the viewport width and height', () => {
    const placement = computePopupPlacement(anchor(280, 150), viewport(320, 260))
    expect(placement.side).toBe('sheet')
    expect(placement.width).toBe(320 - 2 * POPUP_MARGIN)
    expect(placement.maxHeight).toBe(260 - 2 * POPUP_MARGIN)
    expect(placement.offsetLeft).toBe(POPUP_MARGIN - 280)
  })

  it('uses the sheet threshold boundary as the split point', () => {
    // Exactly the threshold of room above still opens above.
    const top = SHEET_THRESHOLD + POPUP_GAP + POPUP_MARGIN
    const placement = computePopupPlacement(anchor(600, top), viewport(1024, 300))
    expect(placement.side).toBe('above')
    const tight = computePopupPlacement(anchor(600, top - 1), viewport(1024, 300))
    expect(tight.side).toBe('sheet')
  })

  it('pins the left edge to the margin when the viewport is narrower than the margins', () => {
    const placement = computePopupPlacement(anchor(10, 500), viewport(10, 1000))
    expect(placement.side).toBe('above')
    expect(placement.width).toBe(0)
    expect(placement.offsetLeft).toBe(-2)
  })
  it('slides the popup back inside when the anchor sits below the visible viewport', () => {
    // The keyboard shrank the visible area to 360..600 while the button sits
    // at y=700 (hidden behind the keyboard).
    const anchorBox = anchor(280, 700)
    const view = viewport(320, 240, 0, 360)
    const placement = computePopupPlacement(anchorBox, view)
    expect(placement.side).toBe('above')
    const popupBottom = anchorBox.bottom - (placement.offsetBottom ?? 0)
    const popupTop = popupBottom - placement.maxHeight
    expect(popupTop).toBeGreaterThanOrEqual(view.top + POPUP_MARGIN)
    expect(popupBottom).toBeLessThanOrEqual(view.bottom - POPUP_MARGIN)
  })
})

describe('clipBoxFor', () => {
  it('intersects the viewport with the nearest scrolling ancestor', () => {
    const scroll = document.createElement('div')
    scroll.style.overflowY = 'auto'
    scroll.getBoundingClientRect = () => ({ top: 60, left: 0, right: 390, bottom: 800, width: 390, height: 740, x: 0, y: 60, toJSON: () => ({}) }) as DOMRect
    const wrapper = document.createElement('div')
    scroll.appendChild(wrapper)
    document.body.appendChild(scroll)
    const clip = clipBoxFor(wrapper, viewport(390, 844))
    expect(clip).toEqual({ top: 60, left: 0, right: 390, bottom: 800 })
    scroll.remove()
  })

  it('keeps clear of floating chrome through the top inset', () => {
    const wrapper = document.createElement('div')
    document.body.appendChild(wrapper)
    const clip = clipBoxFor(wrapper, viewport(390, 844), TOUCH_TOP_INSET)
    expect(clip.top).toBe(TOUCH_TOP_INSET)
    wrapper.remove()
  })

  it('never raises the top edge above the visual viewport', () => {
    const wrapper = document.createElement('div')
    document.body.appendChild(wrapper)
    const clip = clipBoxFor(wrapper, viewport(390, 844, 0, 300), TOUCH_TOP_INSET)
    expect(clip.top).toBe(300 + TOUCH_TOP_INSET)
    wrapper.remove()
  })

  it('falls back to the viewport when no ancestor scrolls', () => {
    const wrapper = document.createElement('div')
    document.body.appendChild(wrapper)
    const box = viewport(390, 844)
    expect(clipBoxFor(wrapper, box)).toEqual(box)
    wrapper.remove()
  })
})

describe('intersectBoxes', () => {
  it('keeps the overlapping part of two boxes', () => {
    const a = { top: 0, left: 0, right: 100, bottom: 100 }
    const b = { top: 20, left: 30, right: 200, bottom: 60 }
    expect(intersectBoxes(a, b)).toEqual({ top: 20, left: 30, right: 100, bottom: 60 })
  })

  it('collapses to an empty box when the boxes do not overlap', () => {
    const a = { top: 0, left: 0, right: 10, bottom: 10 }
    const b = { top: 50, left: 50, right: 60, bottom: 60 }
    expect(intersectBoxes(a, b)).toEqual({ top: 50, left: 50, right: 50, bottom: 50 })
  })
})

describe('readViewport', () => {
  it('prefers the visual viewport when the browser exposes one', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { offsetLeft: 4, offsetTop: 12, width: 360, height: 420 },
    })
    expect(readViewport()).toEqual({
      left: 4,
      top: 12,
      width: 360,
      height: 420,
      right: 364,
      bottom: 432,
    })
  })

  it('falls back to the window size when the visual viewport is null', () => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: null })
    const box = readViewport()
    expect(box.left).toBe(0)
    expect(box.top).toBe(0)
    expect(box.width).toBe(window.innerWidth)
    expect(box.height).toBe(window.innerHeight)
    expect(box.right).toBe(window.innerWidth)
    expect(box.bottom).toBe(window.innerHeight)
  })

  it('falls back to the window size when the visual viewport is absent', () => {
    const box = readViewport()
    expect(box.width).toBe(window.innerWidth)
    expect(box.height).toBe(window.innerHeight)
  })
})

describe('prefersCoarsePointer', () => {
  it('reports the coarse-pointer media query result', () => {
    expect(prefersCoarsePointer({ matchMedia: () => ({ matches: true }) })).toBe(true)
    expect(prefersCoarsePointer({ matchMedia: () => ({ matches: false }) })).toBe(false)
  })

  it('assumes a fine pointer when the query is unsupported', () => {
    expect(prefersCoarsePointer({})).toBe(false)
    expect(prefersCoarsePointer(undefined)).toBe(false)
  })

  it('reads the live window when no target is injected', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true }),
    })
    expect(prefersCoarsePointer()).toBe(true)
  })
})
