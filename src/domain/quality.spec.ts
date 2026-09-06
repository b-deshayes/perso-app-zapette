import { describe, expect, it } from 'vitest'
import { pickQuality, qualityHeight, targetHeightForWidth } from './quality'

const QUALITIES = [
  { name: 'Auto', group: 'auto' },
  { name: '1080p60 (source)', group: 'chunked' },
  { name: '720p60', group: '720p60' },
  { name: '480p', group: '480p30' },
  { name: '360p', group: '360p30' },
  { name: '160p', group: '160p30' },
]

describe('quality', () => {
  it('should_parse_heights', () => {
    expect(qualityHeight('720p60')).toBe(720)
    expect(qualityHeight('chunked')).toBe(Number.POSITIVE_INFINITY)
    expect(qualityHeight('auto')).toBeNull()
  })

  it('should_map_width_to_target_height', () => {
    expect(targetHeightForWidth(300)).toBe(360)
    expect(targetHeightForWidth(600)).toBe(480)
    expect(targetHeightForWidth(900)).toBe(720)
    expect(targetHeightForWidth(1400)).toBeNull()
  })

  it('should_pick_smallest_sufficient_quality_for_small_tiles', () => {
    expect(pickQuality(QUALITIES, 300)).toBe('360p30')
    expect(pickQuality(QUALITIES, 600)).toBe('480p30')
    expect(pickQuality(QUALITIES, 900)).toBe('720p60')
  })

  it('should_return_auto_for_large_tiles_or_empty_list', () => {
    expect(pickQuality(QUALITIES, 1500)).toBe('auto')
    expect(pickQuality([], 300)).toBe('auto')
    expect(pickQuality(undefined, 300)).toBe('auto')
  })

  it('should_fallback_to_best_available_when_nothing_sufficient', () => {
    expect(pickQuality(['160p30', '360p30'], 900)).toBe('360p30')
  })
})
