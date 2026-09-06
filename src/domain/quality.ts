/** Une qualité telle que retournée par `player.getQualities()` (objet ou simple chaîne). */
export type QualityLike = { group?: string; name?: string } | string

const AUTO = 'auto'

function groupOf(quality: QualityLike): string {
  return typeof quality === 'string' ? quality : (quality.group ?? quality.name ?? '')
}

/** Hauteur en pixels d'un groupe de qualité (« 720p60 » → 720, « chunked » = source → Infinity). */
export function qualityHeight(group: string): number | null {
  if (group === 'chunked') return Number.POSITIVE_INFINITY
  const match = /^(\d{3,4})p/.exec(group)
  return match?.[1] ? Number(match[1]) : null
}

/** Hauteur de vidéo suffisante pour une tuile de cette largeur (au-delà de 720p on laisse l'auto). */
export function targetHeightForWidth(width: number): number | null {
  if (width <= 0) return null
  if (width < 420) return 360
  if (width < 700) return 480
  if (width < 1100) return 720
  return null
}

/**
 * Choisit la plus petite qualité disponible qui couvre la tuile : inutile de décoder du 1080p
 * dans une miniature de 300 px, surtout quand le PC encode aussi le flux vers la Chromecast.
 * Retourne « auto » pour les grandes tuiles ou si la liste est inexploitable.
 */
export function pickQuality(qualities: QualityLike[] | undefined, tileWidth: number): string {
  const target = targetHeightForWidth(tileWidth)
  if (target === null || !qualities?.length) return AUTO

  const candidates = qualities
    .map(groupOf)
    .map((group) => ({ group, height: qualityHeight(group) }))
    .filter((q): q is { group: string; height: number } => q.height !== null && Number.isFinite(q.height))
    .sort((a, b) => a.height - b.height)
  if (candidates.length === 0) return AUTO

  const enough = candidates.find((q) => q.height >= target)
  return (enough ?? candidates[candidates.length - 1])?.group ?? AUTO
}
