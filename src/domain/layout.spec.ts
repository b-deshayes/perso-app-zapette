import { describe, expect, it } from 'vitest'
import {
  CARD_H,
  computeFocusLayout,
  computeGridLayout,
  meetsPlayerMinimum,
  MIN_PLAYER_H,
  THUMB_VIDEO_W,
  TILE_CAPTION,
  TILE_RATIO,
} from './layout'

const HD = { width: 1920, height: 1080 }
const QHD = { width: 2560, height: 1440 }
const ULTRAWIDE = { width: 3440, height: 1440 }

/** Une tuile = vidéo 16/9 + barre de contrôle. */
function isTile(w: number, h: number): boolean {
  return Math.abs(w / (h - TILE_CAPTION) - TILE_RATIO) < 1e-6
}

describe('computeGridLayout', () => {
  it('should_return_empty_when_no_tile_or_no_space', () => {
    expect(computeGridLayout(HD, 0)).toEqual([])
    expect(computeGridLayout({ width: 0, height: 0 }, 3)).toEqual([])
  })

  it('should_fill_container_when_single_tile', () => {
    const [tile] = computeGridLayout(HD, 1)
    expect(tile!.w).toBeCloseTo((1080 - TILE_CAPTION) * TILE_RATIO, 3)
    expect(tile!.h).toBeCloseTo(1080, 3)
    expect(tile!.y).toBeCloseTo(0, 3)
  })

  it('should_keep_video_16_9_and_stay_inside_container', () => {
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

  it('should_prefer_three_columns_for_eight_tiles_on_1080p', () => {
    // 4×2 donnerait 478 px de large (vidéo trop basse pour Twitch) ; 3×3 donne ~598 px et 336 px de vidéo.
    const rects = computeGridLayout(HD, 8)
    expect(rects[0]!.w).toBeGreaterThan(590)
    expect(rects.every(meetsPlayerMinimum)).toBe(true)
  })

  it('should_center_last_row_when_incomplete', () => {
    const rects = computeGridLayout(HD, 3)
    const [a, b, c] = rects
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

describe('meetsPlayerMinimum', () => {
  it('should_check_video_size_without_caption', () => {
    expect(meetsPlayerMinimum({ x: 0, y: 0, w: 534, h: MIN_PLAYER_H + TILE_CAPTION })).toBe(true)
    expect(meetsPlayerMinimum({ x: 0, y: 0, w: 534, h: MIN_PLAYER_H + TILE_CAPTION - 1 })).toBe(false)
    expect(meetsPlayerMinimum({ x: 0, y: 0, w: 399, h: 1000 })).toBe(false)
  })
})

describe('computeFocusLayout', () => {
  it('should_fill_container_when_alone', () => {
    const { rects, cards } = computeFocusLayout(HD, 1, 0, { strip: 'right' })
    expect(rects[0]!.h).toBeCloseTo(1080, 3)
    expect(cards).toEqual([])
  })

  it('should_put_live_thumbnails_at_twitch_minimum_in_right_column', () => {
    const { rects, cards } = computeFocusLayout(HD, 3, 1, { strip: 'right' })
    const main = rects[1]!
    const thumbs = [rects[0]!, rects[2]!]
    expect(cards).toEqual([])
    expect(isTile(main.w, main.h)).toBe(true)
    expect(main.x).toBeCloseTo(0, 3)
    for (const t of thumbs) {
      expect(isTile(t.w, t.h)).toBe(true)
      expect(t.w).toBeGreaterThanOrEqual(THUMB_VIDEO_W)
      expect(meetsPlayerMinimum(t)).toBe(true)
      expect(t.x + t.w).toBeCloseTo(HD.width, 3)
      expect(t.x).toBeGreaterThanOrEqual(main.x + main.w + 2 - 1e-6)
      expect(t.hidden).toBeUndefined()
    }
    expect(thumbs[0]!.y).toBeCloseTo(0, 3)
    expect(thumbs[1]!.y).toBeGreaterThan(thumbs[0]!.y)
  })

  it('should_put_column_on_left_when_strip_left', () => {
    const { rects } = computeFocusLayout(HD, 3, 0, { strip: 'left' })
    const main = rects[0]!
    for (const t of [rects[1]!, rects[2]!]) expect(t.x).toBeCloseTo(0, 3)
    expect(main.x).toBeGreaterThanOrEqual(rects[1]!.w + 2 - 1e-6)
    expect(main.x + main.w).toBeLessThanOrEqual(HD.width + 1e-6)
  })

  it('should_turn_overflowing_channels_into_cards_parked_behind_main', () => {
    const { rects, cards } = computeFocusLayout(HD, 8, 0, { strip: 'right' })
    const main = rects[0]!
    const live = rects.filter((r, i) => i !== 0 && !r.hidden)
    const parked = rects.filter((r) => r.hidden)
    expect(live.length).toBeGreaterThanOrEqual(2)
    expect(live.length + parked.length).toBe(7)
    expect(cards.map((c) => c.index).sort()).toEqual(rects.map((r, i) => (r.hidden ? i : -1)).filter((i) => i >= 0))
    for (const p of parked) expect({ ...p, hidden: undefined }).toEqual({ ...main, hidden: undefined })
    // colonne : miniatures puis cartes, sans chevauchement ni débordement
    const column = [...live, ...cards].sort((a, b) => a.y - b.y)
    for (let i = 1; i < column.length; i++) expect(column[i]!.y).toBeGreaterThanOrEqual(column[i - 1]!.y + column[i - 1]!.h)
    const last = column[column.length - 1]!
    expect(last.y + last.h).toBeLessThanOrEqual(HD.height + 1e-6)
    expect(cards.every((c) => c.h === CARD_H && c.x === live[0]!.x)).toBe(true)
  })

  it('should_fit_more_live_thumbnails_on_taller_screens', () => {
    const hd = computeFocusLayout(HD, 6, 0, { strip: 'right' })
    const qhd = computeFocusLayout(QHD, 6, 0, { strip: 'right' })
    const liveCount = (l: { rects: { hidden?: boolean }[] }) => l.rects.filter((r, i) => i !== 0 && !r.hidden).length
    expect(liveCount(qhd)).toBeGreaterThan(liveCount(hd))
  })

  it('should_park_everyone_behind_main_when_strip_off', () => {
    const { rects, cards } = computeFocusLayout(HD, 3, 0, { strip: 'off' })
    const main = rects[0]!
    expect(main.h).toBeCloseTo(1080, 3)
    expect(rects[1]).toEqual({ ...main, hidden: true })
    expect(rects[2]).toEqual({ ...main, hidden: true })
    expect(cards).toEqual([])
  })

  it('should_widen_column_on_ultrawide', () => {
    const { rects } = computeFocusLayout(ULTRAWIDE, 3, 0, { strip: 'right' })
    const main = rects[0]!
    const thumb = rects[1]!
    expect(main.h).toBeCloseTo(ULTRAWIDE.height, 3)
    expect(thumb.x).toBeCloseTo(main.x + main.w + 2, 3)
    expect(thumb.w).toBeGreaterThan(THUMB_VIDEO_W)
  })

  it('should_use_cards_only_when_window_too_narrow_for_live_thumbnails', () => {
    const { rects, cards } = computeFocusLayout({ width: 1000, height: 600 }, 4, 0, { strip: 'right' })
    expect(cards).toHaveLength(3)
    expect(rects.filter((r) => r.hidden)).toHaveLength(3)
    expect(rects[0]!.w).toBeLessThanOrEqual(1000 - cards[0]!.w - 2 + 1e-6)
  })

  it('should_clamp_focused_index_when_out_of_range', () => {
    const { rects } = computeFocusLayout(HD, 2, 7, { strip: 'right' })
    expect(rects[1]!.w).toBeGreaterThan(rects[0]!.w)
  })
})
