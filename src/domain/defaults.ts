import { DEFAULT_STRIP } from '@/domain/strip'
import type { WallSnapshot } from '@/types/Stream'

/** Premier lancement : un mur vide, l'utilisateur choisit ses chaînes (aucune chaîne imposée). */
export function defaultSnapshot(): WallSnapshot {
  return {
    channels: [],
    focused: null,
    strip: DEFAULT_STRIP,
    chat: false,
  }
}
