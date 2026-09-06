import { describe, expect, it } from 'vitest'
import {
  appendSample,
  computeTrend,
  formatDelta,
  formatViewers,
  HISTORY_MAX_AGE_MS,
  parseViewerHistory,
  pruneHistory,
} from './viewers'
import type { ViewerSample } from '@/types/Viewers'

const MIN = 60_000
const NOW = 1_800_000_000_000

/** Un relevé toutes les 30 s sur `minutes` minutes, terminé à `now`, valeur donnée par `value(minutesAgo)`. */
function series(now: number, minutes: number, value: (minutesAgo: number) => number): ViewerSample[] {
  const samples: ViewerSample[] = []
  for (let ago = minutes; ago >= 0; ago -= 0.5) samples.push({ t: now - ago * MIN, v: Math.round(value(ago)) })
  return samples
}

function plain(s: string): string {
  return s.replace(/[  ]/g, ' ')
}

describe('parseViewerHistory', () => {
  it('should_return_empty_when_garbage', () => {
    expect(parseViewerHistory(null)).toEqual({})
    expect(parseViewerHistory('x')).toEqual({})
    expect(parseViewerHistory([1, 2])).toEqual({})
    expect(parseViewerHistory({ zerator: 'nope' })).toEqual({})
  })

  it('should_keep_valid_samples_sorted_and_drop_invalid_ones', () => {
    const history = parseViewerHistory({
      zerator: [{ t: 20, v: 5 }, { t: 10, v: 3 }, { t: 'x', v: 1 }, { t: 30, v: -1 }, null, { t: 40 }],
      empty: [],
    })
    expect(history).toEqual({ zerator: [{ t: 10, v: 3 }, { t: 20, v: 5 }] })
  })
})

describe('appendSample / pruneHistory', () => {
  it('should_append_and_drop_samples_older_than_max_age', () => {
    const old = { t: NOW - HISTORY_MAX_AGE_MS - 1, v: 1 }
    const recent = { t: NOW - MIN, v: 2 }
    const next = appendSample({ zerator: [old, recent] }, 'zerator', { t: NOW, v: 3 })
    expect(next.zerator).toEqual([recent, { t: NOW, v: 3 }])
  })

  it('should_not_touch_other_channels_when_appending', () => {
    const next = appendSample({ amixem: [{ t: 1, v: 1 }] }, 'zerator', { t: NOW, v: 3 })
    expect(next.amixem).toEqual([{ t: 1, v: 1 }])
    expect(next.zerator).toEqual([{ t: NOW, v: 3 }])
  })

  it('should_prune_unknown_channels_and_old_samples', () => {
    const history = {
      zerator: [{ t: NOW - HISTORY_MAX_AGE_MS - 1, v: 1 }, { t: NOW, v: 2 }],
      gone: [{ t: NOW, v: 9 }],
      stale: [{ t: NOW - HISTORY_MAX_AGE_MS - 1, v: 1 }],
    }
    expect(pruneHistory(history, ['zerator', 'stale', 'newcomer'], NOW)).toEqual({ zerator: [{ t: NOW, v: 2 }] })
  })
})

describe('computeTrend', () => {
  it('should_return_empty_when_no_sample_or_stale_sample', () => {
    expect(computeTrend([], NOW)).toEqual({ viewers: null, delta: null, hot: false })
    expect(computeTrend([{ t: NOW - 10 * MIN, v: 100 }], NOW)).toEqual({ viewers: null, delta: null, hot: false })
  })

  it('should_give_viewers_without_delta_when_not_enough_history', () => {
    expect(computeTrend(series(NOW, 2, () => 1000), NOW)).toEqual({ viewers: 1000, delta: null, hot: false })
  })

  it('should_report_flat_trend_when_stable', () => {
    const trend = computeTrend(series(NOW, 20, () => 10_000), NOW)
    expect(trend.viewers).toBe(10_000)
    expect(trend.delta).toBeCloseTo(0, 6)
    expect(trend.hot).toBe(false)
  })

  it('should_detect_spike_when_big_relative_and_absolute_gain', () => {
    // 10 000 spectateurs pendant 15 min, puis montée à 14 000 sur les 2 dernières minutes
    const trend = computeTrend(series(NOW, 20, (ago) => (ago <= 2 ? 14_000 : 10_000)), NOW)
    expect(trend.viewers).toBe(14_000)
    expect(trend.delta).toBeCloseTo(0.4, 6)
    expect(trend.hot).toBe(true)
  })

  it('should_not_flag_small_channel_noise_as_spike', () => {
    const trend = computeTrend(series(NOW, 20, (ago) => (ago <= 2 ? 112 : 80)), NOW)
    expect(trend.delta).toBeCloseTo(0.4, 6)
    expect(trend.hot).toBe(false)
  })

  it('should_report_negative_delta_when_dropping', () => {
    const trend = computeTrend(series(NOW, 20, (ago) => (ago <= 2 ? 8_000 : 10_000)), NOW)
    expect(trend.delta).toBeCloseTo(-0.2, 6)
    expect(trend.hot).toBe(false)
  })

  it('should_use_median_so_a_single_outlier_does_not_move_the_reference', () => {
    const samples = series(NOW, 20, (ago) => (ago <= 2 ? 13_000 : 10_000))
    // un relevé aberrant dans la fenêtre de référence
    samples[10]!.v = 50_000
    const trend = computeTrend(samples, NOW)
    expect(trend.delta).toBeCloseTo(0.3, 6)
    expect(trend.hot).toBe(true)
  })
})

describe('formatViewers / formatDelta', () => {
  it('should_format_compact_french', () => {
    expect(plain(formatViewers(845))).toBe('845')
    expect(plain(formatViewers(1750))).toBe('1,8 k')
    expect(plain(formatViewers(56_445))).toBe('56,4 k')
    expect(plain(formatViewers(123_456))).toBe('123 k')
  })

  it('should_format_delta_with_sign', () => {
    expect(plain(formatDelta(0.312))).toBe('+31 %')
    expect(plain(formatDelta(-0.05))).toBe('-5 %')
    expect(plain(formatDelta(0.001))).toBe('0 %')
  })
})
