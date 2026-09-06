import { sanitizeSnapshot } from '@/domain/snapshot'
import type { CastMessage } from '@/types/Cast'

export function encodeCastMessage(message: CastMessage): string {
  return JSON.stringify(message)
}

/** Décode un message reçu d'un pair (jamais de confiance aveugle : tout est revalidé). */
export function decodeCastMessage(data: unknown): CastMessage | null {
  if (typeof data !== 'string') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const message = parsed as Record<string, unknown>
  if (message.type === 'hello') return { type: 'hello' }
  if (message.type === 'state') {
    const payload = sanitizeSnapshot(message.payload)
    return payload ? { type: 'state', payload } : null
  }
  return null
}
