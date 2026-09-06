import { describe, expect, it } from 'vitest'
import { computeFocusLayout, computeGridLayout, THUMB_MIN_WIDTH, TILE_BAR, TILE_RATIO } from './layout'

const HD = { width: 1920, height: 1080 }
const ULTRAWIDE = { width: 3440, height: 1440 }

/** Une tuile = vidéo 16/9 + barre de contrôle sous la vidéo. */
function isTile(w: number, h: number): boolean {
  return Math.abs(w / (h - TILE_BAR) - TILE_RATIO) < 1e-6
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: typeof a): boolean {
  return a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6
}

describe('computeGridLayout', () => {
  it('should_return_empty_when_no_tile_or_no_space', () => {
    expect(computeGridLayout(HD, 0)).toEqual([])
    expect(computeGridLayout({ width: 0, height: 0 }, 3)).toEqual([])
  })

  it('should_fill_height_and_keep_bar_when_single_tile', () => {
    const [tile] = computeGridLayout(HD, 1)
    // limité par la hauteur : (1080 - 24) × 16/9 = 1877,3 px de large, centré
    expect(tile!.h).toBeCloseTo(1080, 6)
    expect(tile!.w).toBeCloseTo((1080 - TILE_BAR) * TILE_RATIO, 3)
    expect(tile!.x).toBeCloseTo((1920 - tile!.w) / 2, 3)
    expect(tile!.y).toBeCloseTo(0, 6)
  })

  it('should_keep_bar_under_video_and_stay_inside_container', () => {
    for (const count of [2, 3, 4, 5, 6, 7, 9, 12]) {
      const rects = computeGridLayout(HD, count)
      expect(rects).toHaveLength(count)
      for (const r of rects) {
        expect(isTile(r.w, r.h)).toBe(true)
        expect(r.x).toBeGreaterThanOrEqual(-1e-6)
        expect(r.y).toBeGreaterThanOrEqual(-1e-6)
        expect(r.x + r.w).toBeLessThanOrEqual(HD.width + 1e-6)
        expect(r.y + r.h).toBeLessThanOrEqual(HD.height + 1e-6)
      }
    }
  })

  it('should_use_two_columns_when_four_tiles_on_16_9', () => {
    const rects = computeGridLayout(HD, 4)
    // 2 rangées : (1080 - 2) / 2 = 539 px par cellule, moins la barre → 515 px de vidéo → 915,6 px de large
    expect(rects[0]?.w).toBeCloseTo((539 - TILE_BAR) * TILE_RATIO, 1)
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
      for (let j = i + 1; j < rects.length; j++) expect(overlaps(rects[i]!, rects[j]!)).toBe(false)
    }
  })
})

describe('computeFocusLayout', () => {
  it('should_fill_container_when_alone', () => {
    const [tile] = computeFocusLayout(HD, 1, 0, { strip: 'right' })
    expect(tile!.h).toBeCloseTo(1080, 6)
    expect(isTile(tile!.w, tile!.h)).toBe(true)
  })

  it('should_stack_others_in_right_column_when_strip_right', () => {
    const rects = computeFocusLayout(HD, 3, 1, { strip: 'right' })
    const main = rects[1]!
    const thumbs = [rects[0]!, rects[2]!]
    expect(isTile(main.w, main.h)).toBe(true)
    expect(main.w).toBeGreaterThan(thumbs[0]!.w * 3)
    expect(main.x).toBeCloseTo(0, 3)
    for (const t of thumbs) {
      expect(isTile(t.w, t.h)).toBe(true)
      expect(t.x + t.w).toBeCloseTo(HD.width, 3)
      expect(t.x).toBeGreaterThanOrEqual(main.x + main.w + 2 - 1e-6)
      expect(t.y).toBeGreaterThanOrEqual(-1e-6)
      expect(t.y + t.h).toBeLessThanOrEqual(HD.height + 1e-6)
      expect(t.hidden).toBeUndefined()
    }
    expect(thumbs[1]!.y).toBeGreaterThan(thumbs[0]!.y)
    expect(thumbs[0]!.x).toBeCloseTo(thumbs[1]!.x)
  })

  it('should_stack_others_in_left_column_when_strip_left', () => {
    const rects = computeFocusLayout(HD, 3, 0, { strip: 'left' })
    const main = rects[0]!
    const thumbs = [rects[1]!, rects[2]!]
    for (const t of thumbs) expect(t.x).toBeCloseTo(0, 3)
    expect(main.x).toBeGreaterThanOrEqual(thumbs[0]!.w + 2 - 1e-6)
    expect(main.x + main.w).toBeLessThanOrEqual(HD.width + 1e-6)
  })

  it('should_park_others_behind_main_when_strip_off', () => {
    const rects = computeFocusLayout(HD, 3, 0, { strip: 'off' })
    const main = rects[0]!
    expect(main.h).toBeCloseTo(1080, 6)
    expect(main.hidden).toBeUndefined()
    expect(rects[1]).toEqual({ ...main, hidden: true })
    expect(rects[2]).toEqual({ ...main, hidden: true })
  })

  it('should_use_full_height_and_widen_column_on_ultrawide', () => {
    const rects = computeFocusLayout(ULTRAWIDE, 3, 0, { strip: 'right' })
    const main = rects[0]!
    const thumb = rects[1]!
    expect(main.h).toBeCloseTo(ULTRAWIDE.height, 3)
    expect(main.x).toBeCloseTo(0, 3)
    // toute la largeur restante va au bloc : pas de gouttière entre le stream et les miniatures
    expect(thumb.x).toBeCloseTo(main.w + 2, 3)
    expect(thumb.w).toBeGreaterThan(480)
  })

  it('should_keep_thumbnails_playable_by_adding_columns_when_too_many_for_one', () => {
    // 8 streams en 1080p : 7 miniatures ≥ 300 px ne tiennent pas en une colonne → 2 colonnes
    const rects = computeFocusLayout(HD, 8, 0, { strip: 'right' })
    const main = rects[0]!
    const thumbs = rects.slice(1)
    const xs = new Set(thumbs.map((t) => Math.round(t.x)))
    expect(xs.size).toBe(2)
    for (const t of thumbs) {
      expect(t.w).toBeGreaterThanOrEqual(THUMB_MIN_WIDTH - 1e-6)
      expect(isTile(t.w, t.h)).toBe(true)
      expect(t.x).toBeGreaterThanOrEqual(main.x + main.w + 2 - 1e-6)
      expect(t.y).toBeGreaterThanOrEqual(-1e-6)
      expect(t.y + t.h).toBeLessThanOrEqual(HD.height + 1e-6)
      expect(t.x + t.w).toBeLessThanOrEqual(HD.width + 1e-6)
    }
    // le bloc reste sous la moitié de la largeur et le stream principal garde la majorité
    expect(main.w).toBeGreaterThan(HD.width / 2)
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) expect(overlaps(rects[i]!, rects[j]!)).toBe(false)
    }
  })

  it('should_fill_thumbnails_row_by_row_when_multi_column', () => {
    const rects = computeFocusLayout(HD, 8, 7, { strip: 'left' })
    const thumbs = rects.slice(0, 7)
    // 1re rangée : miniatures 0 et 1 côte à côte ; la 3e passe à la rangée suivante
    expect(thumbs[0]!.y).toBeCloseTo(thumbs[1]!.y, 6)
    expect(thumbs[1]!.x).toBeGreaterThan(thumbs[0]!.x)
    expect(thumbs[2]!.x).toBeCloseTo(thumbs[0]!.x, 6)
    expect(thumbs[2]!.y).toBeGreaterThan(thumbs[0]!.y)
    expect(thumbs[0]!.x).toBeCloseTo(0, 6)
  })

  it('should_shrink_single_column_when_no_layout_keeps_minimum_width', () => {
    const rects = computeFocusLayout({ width: 800, height: 450 }, 12, 0, { strip: 'right' })
    const thumbs = rects.slice(1)
    expect(new Set(thumbs.map((t) => Math.round(t.x))).size).toBe(1)
    const total = thumbs.reduce((sum, t) => sum + t.h, 0) + 2 * (thumbs.length - 1)
    expect(total).toBeLessThanOrEqual(450 + 1e-6)
    expect(thumbs.every((t) => t.w > 0 && t.x + t.w <= 800 + 1e-6)).toBe(true)
    expect(rects[0]!.x + rects[0]!.w).toBeLessThanOrEqual(thumbs[0]!.x - 2 + 1e-6)
  })

  it('should_clamp_focused_index_when_out_of_range', () => {
    const rects = computeFocusLayout(HD, 2, 7, { strip: 'right' })
    expect(rects[1]!.w).toBeGreaterThan(rects[0]!.w)
  })
})
