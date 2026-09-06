import type { StripMode } from '@/types/Stream'

/** Moteur de placement des tuiles : pur, testé, sans dépendance Vue. */
export interface Size {
  width: number
  height: number
}

export interface TileRect {
  x: number
  y: number
  w: number
  h: number
  /**
   * Tuile masquée (colonne repliée) : elle prend la place du stream principal, derrière lui, et
   * continue de jouer. Jamais de visibility/display/clip-path : Twitch coupe l'autoplay d'un
   * lecteur qu'il juge invisible.
   */
  hidden?: boolean
}

export interface FocusLayoutOptions {
  /** Colonne des autres streams : à droite, à gauche, ou masquée. */
  strip: StripMode
  gap?: number
}

export const TILE_RATIO = 16 / 9
export const TILE_GAP = 2
/** Bandeau de légende sous chaque miniature (hors de la vidéo : rien ne doit recouvrir un lecteur). */
export const THUMB_CAPTION = 20

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Plus grand rectangle 16/9 dans une zone, centré. */
function fitTile(areaX: number, areaY: number, areaW: number, areaH: number): TileRect {
  const w = Math.min(areaW, areaH * TILE_RATIO)
  const h = w / TILE_RATIO
  return { x: areaX + (areaW - w) / 2, y: areaY + (areaH - h) / 2, w, h }
}

/**
 * Grille « multiviewer » : choisit le nombre de colonnes qui maximise la taille des tuiles 16/9
 * dans le conteneur, centre l'ensemble et centre la dernière rangée si elle est incomplète.
 */
export function computeGridLayout(size: Size, count: number, gap: number = TILE_GAP): TileRect[] {
  if (count <= 0 || size.width <= 0 || size.height <= 0) return []

  let best = { cols: 1, rows: count, w: 0, h: 0 }
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols)
    const cellW = (size.width - gap * (cols - 1)) / cols
    const cellH = (size.height - gap * (rows - 1)) / rows
    const w = Math.min(cellW, cellH * TILE_RATIO)
    if (w > best.w) best = { cols, rows, w, h: w / TILE_RATIO }
  }

  const totalW = best.cols * best.w + gap * (best.cols - 1)
  const totalH = best.rows * best.h + gap * (best.rows - 1)
  const originX = (size.width - totalW) / 2
  const originY = (size.height - totalH) / 2

  const rects: TileRect[] = []
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / best.cols)
    const col = i % best.cols
    const inRow = row === best.rows - 1 ? count - row * best.cols : best.cols
    const rowOffset = ((best.cols - inRow) * (best.w + gap)) / 2
    rects.push({
      x: originX + rowOffset + col * (best.w + gap),
      y: originY + row * (best.h + gap),
      w: best.w,
      h: best.h,
    })
  }
  return rects
}

/**
 * Mode focus : un stream aussi grand que possible, les autres empilés dans une colonne latérale
 * (à droite ou à gauche), chaque miniature portant sa légende sous la vidéo. Colonne repliée :
 * le stream prend tout, les autres se rangent derrière lui (`hidden`) sans cesser de jouer.
 *
 * La colonne part de ~20 % de la largeur, ne dépasse jamais la hauteur disponible pour N-1
 * miniatures, et récupère toute la largeur que le stream principal ne peut pas utiliser quand
 * c'est la hauteur qui le limite (écran large) : pas de gouttière noire inutile.
 */
export function computeFocusLayout(
  size: Size,
  count: number,
  focusedIndex: number,
  options: FocusLayoutOptions,
): TileRect[] {
  if (count <= 0 || size.width <= 0 || size.height <= 0) return []
  const gap = options.gap ?? TILE_GAP
  const index = clamp(focusedIndex, 0, count - 1)
  const others = count - 1
  const collapsed = options.strip === 'off'
  const side = options.strip === 'left' ? 'left' : 'right'

  if (others === 0) return [fitTile(0, 0, size.width, size.height)]

  if (collapsed) {
    const main = fitTile(0, 0, size.width, size.height)
    return Array.from({ length: count }, (_, i) => (i === index ? main : { ...main, hidden: true }))
  }

  const columnGaps = gap * (others - 1)
  const maxColumnByHeight = Math.max(0, (size.height - columnGaps) / others - THUMB_CAPTION) * TILE_RATIO
  let column = Math.min(clamp(size.width * 0.2, 160, 480), maxColumnByHeight, size.width * 0.5)
  const mainW = Math.min(size.width - column - gap, size.height * TILE_RATIO)
  const leftover = size.width - gap - mainW - column
  if (leftover > 0) column = Math.min(column + leftover, maxColumnByHeight, size.width * 0.35)

  const main = fitTile(side === 'right' ? 0 : column + gap, 0, size.width - column - gap, size.height)
  const thumbH = column / TILE_RATIO + THUMB_CAPTION
  const columnX = side === 'right' ? size.width - column : 0
  let y = (size.height - (others * thumbH + columnGaps)) / 2

  const rects: TileRect[] = []
  for (let i = 0; i < count; i++) {
    if (i === index) {
      rects.push(main)
      continue
    }
    rects.push({ x: columnX, y, w: column, h: thumbH })
    y += thumbH + gap
  }
  return rects
}
