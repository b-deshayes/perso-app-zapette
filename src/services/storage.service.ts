import { sanitizeSnapshot } from '@/domain/snapshot'
import type { WallSnapshot } from '@/types/Stream'

const WALL_KEY = 'zapette.wall.v1'

export function loadWallSnapshot(): WallSnapshot | null {
  try {
    const raw = localStorage.getItem(WALL_KEY)
    if (!raw) return null
    return sanitizeSnapshot(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveWallSnapshot(snapshot: WallSnapshot): void {
  try {
    localStorage.setItem(WALL_KEY, JSON.stringify(snapshot))
  } catch {
    // Stockage indisponible (navigation privée, quota) : l'URL reste la source de vérité.
  }
}
