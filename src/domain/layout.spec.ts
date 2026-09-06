import { describe, expect, it } from 'vitest'
import { computeFocusLayout, computeGridLayout, HIDDEN_RECT, TILE_RATIO } from './layout'

const HD = { width: 1920, height: 1080 }

function isRatio(w: number, h: number): boolean {
  return Math.abs(w / h - TILE_RATIO) < 1e-6
}

describe('computeGridLayout', () => {
  it('should_return_empty_when_no_tile_or_no_space', () => {
    expect(computeGridLayout(HD, 0)).toEqual([])
    expect(computeGridLayout({ width: 0, height: 0 }, 3)).toEqual([])
  })

  it('should_fill_container_when_single_tile', () => {
    const [tile] = computeGridLayout(HD, 1)
    expect(tile).toEqual({ x: 0, y: 0, w: 1920, h: 1080 })
  })

  it('should_keep_16_9_and_stay_inside_container', () => {
    for (const count of [2, 3, 4, 5, 6, 7, 9, 12]) {
      const rects = computeGridLayout(HD, count)
      expect(rects).toHaveLength(count)
      for (const r of rects) {
        expect(isRatio(r.w, r.h)).toBe(true)
        expect(r.x).toBeGreaterThanOrEqual(-1e-6)
        expect(r.y).toBeGreaterThanOrEqual(-1e-6)
        expect(r.x + r.w).toBeLessThanOrEqual(HD.width + 1e-6)
        expect(r.y + r.h).toBeLessThanOrEqual(HD.height + 1e-6)
      }
    }
  })

  it('should_use_two_columns_when_four_tiles_on_16_9', () => {
    const rects = computeGridLayout(HD, 4)
    // 2 colonnes : (1080 - 2) / 2 = 539 px de haut → 958,2 px de large en 16/9
    expect(rects[0]?.w).toBeCloseTo(958.22, 1)
    expect(rects[1]?.x).toBeGreaterThan(rects[0]!.x)
    expect(rects[2]?.y).toBeGreaterThan(rects[0]!.y)
  })

  it('should_center_last_row_when_incomplete', () => {
    const rects = computeGridLayout(HD, 3)
    const [a, b, c] = rects
    // 2 colonnes + 1 seule tuile centrée en 2e rangée
    expect(a!.y).toBeCloseTo(b!.y)
    expect(c!.y).toBeGreaterThan(a!.y)
    expect(c!.x + c!.w / 2).toBeCloseTo(HD.width / 2, 3)
  })

  it('should_not_overlap', () => {
    const rects = computeGridLayout({ width: 1000, height: 700 }, 5)
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!
        const b = rects[j]!
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
        expect(overlap).toBe(false)
      }
    }
  })
})

describe('computeFocusLayout', () => {
  it('should_fill_container_when_alone', () => {
    const [tile] = computeFocusLayout(HD, 1, 0, { strip: true })
    expect(tile).toEqual({ x: 0, y: 0, w: 1920, h: 1080 })
  })

  it('should_place_focused_big_and_others_in_bottom_strip', () => {
    const rects = computeFocusLayout(HD, 3, 1, { strip: true })
    const main = rects[1]!
    const thumbs = [rects[0]!, rects[2]!]
    expect(main.w).toBeGreaterThan(thumbs[0]!.w * 3)
    expect(isRatio(main.w, main.h)).toBe(true)
    for (const t of thumbs) {
      expect(isRatio(t.w, t.h)).toBe(true)
      expect(t.y + t.h).toBeCloseTo(HD.height, 3)
      expect(t.y).toBeGreaterThanOrEqual(main.y + main.h - 1e-6)
    }
    expect(thumbs[1]!.x).toBeGreaterThan(thumbs[0]!.x)
  })

  it('should_hide_others_when_strip_disabled', () => {
    const rects = computeFocusLayout(HD, 3, 0, { strip: false })
    expect(rects[0]).toEqual({ x: 0, y: 0, w: 1920, h: 1080 })
    expect(rects[1]).toEqual(HIDDEN_RECT)
    expect(rects[2]).toEqual(HIDDEN_RECT)
  })

  it('should_shrink_thumbnails_when_too_many_for_width', () => {
    const rects = computeFocusLayout({ width: 800, height: 450 }, 12, 0, { strip: true })
    const thumbs = rects.slice(1)
    const total = thumbs.reduce((sum, t) => sum + t.w, 0) + 2 * (thumbs.length - 1)
    expect(total).toBeLessThanOrEqual(800 + 1e-6)
    expect(thumbs.every((t) => t.w > 0)).toBe(true)
  })

  it('should_clamp_focused_index_when_out_of_range', () => {
    const rects = computeFocusLayout(HD, 2, 7, { strip: true })
    expect(rects[1]!.w).toBeGreaterThan(rects[0]!.w)
  })
})
