import { describe, expect, it } from 'vitest'
import { decodeWallState, encodeWallState, isReceiverMode } from './url-state'
import type { WallSnapshot } from '@/types/Stream'

const snapshot: WallSnapshot = {
  channels: [
    { name: 'sylvainlyve', muted: true },
    { name: 'zerator', muted: false },
    { name: 'amixem', muted: true },
  ],
  focused: 'zerator',
  strip: 'left',
  chat: true,
}

describe('url-state', () => {
  it('should_roundtrip_when_encoding_then_decoding', () => {
    const params = encodeWallState(snapshot)
    expect(params.get('c')).toBe('sylvainlyve,zerator,amixem')
    expect(params.get('a')).toBe('zerator')
    expect(params.get('f')).toBe('zerator')
    expect(params.get('strip')).toBe('left')
    expect(params.get('chat')).toBe('1')
    expect(decodeWallState(params)).toEqual(snapshot)
  })

  it('should_omit_strip_when_default_and_accept_legacy_zero', () => {
    expect(encodeWallState({ ...snapshot, strip: 'right' }).get('strip')).toBeNull()
    expect(encodeWallState({ ...snapshot, strip: 'off' }).get('strip')).toBe('off')
    expect(decodeWallState(new URLSearchParams('c=zerator&strip=0'))?.strip).toBe('off')
    expect(decodeWallState(new URLSearchParams('c=zerator&strip=nimporte'))?.strip).toBe('right')
  })

  it('should_encode_nothing_when_no_channel', () => {
    const params = encodeWallState({ channels: [], focused: null, strip: 'right', chat: false })
    expect(params.toString()).toBe('')
  })

  it('should_return_null_when_url_has_no_channels', () => {
    expect(decodeWallState(new URLSearchParams(''))).toBeNull()
    expect(decodeWallState(new URLSearchParams('chat=1'))).toBeNull()
  })

  it('should_make_first_channel_audible_when_audible_param_absent', () => {
    const state = decodeWallState(new URLSearchParams('c=zerator,amixem'))
    expect(state?.channels).toEqual([
      { name: 'zerator', muted: false },
      { name: 'amixem', muted: true },
    ])
    expect(state?.strip).toBe('right')
    expect(state?.chat).toBe(false)
  })

  it('should_mute_everything_when_audible_param_empty', () => {
    const state = decodeWallState(new URLSearchParams('c=zerator,amixem&a='))
    expect(state?.channels.every((c) => c.muted)).toBe(true)
  })

  it('should_drop_invalid_and_duplicate_channels', () => {
    const state = decodeWallState(new URLSearchParams('c=ZeratoR,zerator,,nom%20invalide,amixem'))
    expect(state?.channels.map((c) => c.name)).toEqual(['zerator', 'amixem'])
  })

  it('should_ignore_focus_when_unknown_channel', () => {
    const state = decodeWallState(new URLSearchParams('c=zerator&f=inconnu'))
    expect(state?.focused).toBeNull()
  })

  it('should_detect_receiver_mode', () => {
    expect(isReceiverMode(new URLSearchParams('receiver=1'))).toBe(true)
    expect(isReceiverMode(new URLSearchParams('c=zerator'))).toBe(false)
  })
})
