import { describe, expect, it } from 'vitest'
import { sanitizeSnapshot } from './snapshot'

describe('sanitizeSnapshot', () => {
  it('should_return_null_when_not_an_object_with_channels', () => {
    expect(sanitizeSnapshot(null)).toBeNull()
    expect(sanitizeSnapshot('x')).toBeNull()
    expect(sanitizeSnapshot({})).toBeNull()
    expect(sanitizeSnapshot({ channels: 'zerator' })).toBeNull()
  })

  it('should_normalize_channels_and_defaults', () => {
    const result = sanitizeSnapshot({
      channels: [{ name: ' ZeratoR ', muted: false }, { name: 'zerator' }, { name: '!!' }, 42, { name: 'amixem' }],
      focused: 'Amixem',
    })
    expect(result).toEqual({
      channels: [
        { name: 'zerator', muted: false },
        { name: 'amixem', muted: true },
      ],
      focused: 'amixem',
      strip: 'right',
      chat: false,
    })
  })

  it('should_parse_strip_mode_including_legacy_boolean', () => {
    expect(sanitizeSnapshot({ channels: [], strip: 'left' })?.strip).toBe('left')
    expect(sanitizeSnapshot({ channels: [], strip: false })?.strip).toBe('off')
    expect(sanitizeSnapshot({ channels: [], strip: true })?.strip).toBe('right')
  })

  it('should_drop_focus_when_channel_missing', () => {
    expect(sanitizeSnapshot({ channels: [{ name: 'zerator' }], focused: 'amixem' })?.focused).toBeNull()
  })

  it('should_cap_channel_count', () => {
    const channels = Array.from({ length: 20 }, (_, i) => ({ name: `chaine${i}` }))
    expect(sanitizeSnapshot({ channels })?.channels).toHaveLength(12)
  })
})
