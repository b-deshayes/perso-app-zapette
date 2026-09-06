import { parseChannelInput } from '@/domain/channel'
import type { WallSnapshot } from '@/types/Stream'

/**
 * L'URL porte tout l'état du mur → une adresse se partage, se met en favori, et sert
 * de point de départ à la page « récepteur » sur la TV.
 *
 *   ?c=sylvainlyve,zerator,amixem   chaînes, dans l'ordre
 *   &a=zerator                      chaînes audibles (vide = tout coupé, absent = la première)
 *   &f=zerator                      chaîne en focus
 *   &strip=0                        bandeau replié
 *   &chat=1                         chat ouvert
 *   &receiver=1                     mode récepteur (TV) : aucune interface, piloté par le PC
 */
export const URL_KEYS = {
  channels: 'c',
  audible: 'a',
  focused: 'f',
  strip: 'strip',
  chat: 'chat',
  receiver: 'receiver',
} as const

export function encodeWallState(snapshot: WallSnapshot): URLSearchParams {
  const params = new URLSearchParams()
  if (snapshot.channels.length === 0) return params
  params.set(URL_KEYS.channels, snapshot.channels.map((c) => c.name).join(','))
  params.set(
    URL_KEYS.audible,
    snapshot.channels
      .filter((c) => !c.muted)
      .map((c) => c.name)
      .join(','),
  )
  if (snapshot.focused) params.set(URL_KEYS.focused, snapshot.focused)
  if (!snapshot.strip) params.set(URL_KEYS.strip, '0')
  if (snapshot.chat) params.set(URL_KEYS.chat, '1')
  return params
}

/** Retourne null si l'URL ne décrit aucun mur (pas de paramètre `c`). */
export function decodeWallState(params: URLSearchParams): WallSnapshot | null {
  const rawChannels = params.get(URL_KEYS.channels)
  if (rawChannels === null) return null

  const names: string[] = []
  for (const part of rawChannels.split(',')) {
    const name = parseChannelInput(part)
    if (name && !names.includes(name)) names.push(name)
  }

  const rawAudible = params.get(URL_KEYS.audible)
  const audible = new Set(
    rawAudible === null ? names.slice(0, 1) : rawAudible.split(',').map((s) => s.trim().toLowerCase()),
  )
  const rawFocused = params.get(URL_KEYS.focused)
  const focused = rawFocused ? parseChannelInput(rawFocused) : null

  return {
    channels: names.map((name) => ({ name, muted: !audible.has(name) })),
    focused: focused && names.includes(focused) ? focused : null,
    strip: params.get(URL_KEYS.strip) !== '0',
    chat: params.get(URL_KEYS.chat) === '1',
  }
}

export function isReceiverMode(params: URLSearchParams): boolean {
  return params.get(URL_KEYS.receiver) === '1'
}
