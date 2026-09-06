import { DEFAULT_STRIP } from '@/domain/strip'
import type { WallSnapshot } from '@/types/Stream'

/** Le trio de départ : les chaînes suivies pour le ZEVENT. */
export const DEFAULT_CHANNELS = ['sylvainlyve', 'zerator', 'amixem'] as const

export function defaultSnapshot(): WallSnapshot {
  return {
    channels: DEFAULT_CHANNELS.map((name, index) => ({ name, muted: index !== 0 })),
    focused: null,
    strip: DEFAULT_STRIP,
    chat: false,
  }
}
