import { sanitizeSnapshot } from '@/domain/snapshot'
import { parseViewerHistory } from '@/domain/viewers'
import type { WallSnapshot } from '@/types/Stream'
import type { ViewerHistory } from '@/types/Viewers'

const WALL_KEY = 'zapette.wall.v1'
const VIEWERS_KEY = 'zapette.viewers.v1'

/** Historique des spectateurs (pour détecter un pic même après un rechargement). */
export function loadViewerHistory(): ViewerHistory {
  try {
    const raw = localStorage.getItem(VIEWERS_KEY)
    return raw ? parseViewerHistory(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

export function saveViewerHistory(history: ViewerHistory): void {
  try {
    localStorage.setItem(VIEWERS_KEY, JSON.stringify(history))
  } catch {
    // Stockage indisponible : la détection repart de zéro au prochain chargement.
  }
}

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
