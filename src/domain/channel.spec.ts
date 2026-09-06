import { describe, expect, it } from 'vitest'
import { parseChannelInput } from './channel'

describe('parseChannelInput', () => {
  it('should_lowercase_and_trim_when_plain_name', () => {
    expect(parseChannelInput('  ZeratoR ')).toBe('zerator')
  })

  it('should_extract_name_when_full_url', () => {
    expect(parseChannelInput('https://www.twitch.tv/sylvainlyve?referrer=x')).toBe('sylvainlyve')
    expect(parseChannelInput('twitch.tv/Amixem')).toBe('amixem')
    expect(parseChannelInput('https://www.twitch.tv/popout/zerator/chat')).toBe('zerator')
  })

  it('should_strip_leading_at_sign', () => {
    expect(parseChannelInput('@amixem')).toBe('amixem')
  })

  it('should_return_null_when_invalid', () => {
    expect(parseChannelInput('')).toBeNull()
    expect(parseChannelInput('   ')).toBeNull()
    expect(parseChannelInput('a')).toBeNull()
    expect(parseChannelInput('nom avec espace')).toBeNull()
    expect(parseChannelInput('trop-de-tirets')).toBeNull()
    expect(parseChannelInput('x'.repeat(26))).toBeNull()
  })
})
