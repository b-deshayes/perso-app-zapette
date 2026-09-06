import { MAX_CHANNELS, parseChannelInput } from '@/domain/channel'
import { parseStripMode } from '@/domain/strip'
import type { StreamChannel, WallSnapshot } from '@/types/Stream'

/**
 * Valide et normalise un état venu de l'extérieur (localStorage, message de cast) :
 * noms de chaîne nettoyés, doublons supprimés, focus cohérent, bornes respectées.
 */
export function sanitizeSnapshot(input: unknown): WallSnapshot | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  if (!Array.isArray(raw.channels)) return null

  const seen = new Set<string>()
  const channels: StreamChannel[] = []
  for (const item of raw.channels) {
    if (!item || typeof item !== 'object') continue
    const { name, muted } = item as Record<string, unknown>
    const parsed = typeof name === 'string' ? parseChannelInput(name) : null
    if (!parsed || seen.has(parsed)) continue
    seen.add(parsed)
    channels.push({ name: parsed, muted: muted !== false })
    if (channels.length >= MAX_CHANNELS) break
  }

  const focused = typeof raw.focused === 'string' ? parseChannelInput(raw.focused) : null
  return {
    channels,
    focused: focused && seen.has(focused) ? focused : null,
    strip: parseStripMode(raw.strip),
    chat: raw.chat === true,
  }
}
