import { describe, expect, it } from 'vitest'
import { nextStripMode, parseStripMode } from './strip'

describe('strip', () => {
  it('should_parse_known_values_and_legacy_zero', () => {
    expect(parseStripMode('left')).toBe('left')
    expect(parseStripMode('right')).toBe('right')
    expect(parseStripMode('off')).toBe('off')
    expect(parseStripMode('0')).toBe('off')
    expect(parseStripMode(false)).toBe('off')
  })

  it('should_default_to_right_when_unknown', () => {
    expect(parseStripMode(null)).toBe('right')
    expect(parseStripMode('bottom')).toBe('right')
    expect(parseStripMode(true)).toBe('right')
  })

  it('should_cycle_right_left_off', () => {
    expect(nextStripMode('right')).toBe('left')
    expect(nextStripMode('left')).toBe('off')
    expect(nextStripMode('off')).toBe('right')
  })
})
