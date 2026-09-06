import { describe, expect, it } from 'vitest'
import { decodeCastMessage, encodeCastMessage } from './cast-protocol'

describe('cast-protocol', () => {
  it('should_roundtrip_state_message', () => {
    const encoded = encodeCastMessage({
      type: 'state',
      payload: { channels: [{ name: 'zerator', muted: false }], focused: 'zerator', strip: true, chat: false },
    })
    expect(decodeCastMessage(encoded)).toEqual({
      type: 'state',
      payload: { channels: [{ name: 'zerator', muted: false }], focused: 'zerator', strip: true, chat: false },
    })
  })

  it('should_reject_garbage', () => {
    expect(decodeCastMessage('{not json')).toBeNull()
    expect(decodeCastMessage(42)).toBeNull()
    expect(decodeCastMessage(JSON.stringify({ type: 'state', payload: { channels: 'x' } }))).toBeNull()
    expect(decodeCastMessage(JSON.stringify({ type: 'other' }))).toBeNull()
  })

  it('should_accept_hello', () => {
    expect(decodeCastMessage(JSON.stringify({ type: 'hello', extra: 1 }))).toEqual({ type: 'hello' })
  })
})
