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
   * Tuile masquée (bloc replié) : elle prend la place du stream principal, derrière lui. Twitch la
   * met en pause tant qu'elle est recouverte ; elle est relancée dès qu'elle réapparaît. Jamais de
   * visibility/display/clip-path : le lecteur serait détruit ou son autoplay refusé pour de bon.
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
/**
 * Barre de contrôle sous chaque tuile (nom, état, boutons). Elle est HORS de la vidéo : le lecteur
 * Twitch met en pause tout stream qu'un élément recouvre, même un bandeau révélé au survol.
 * Une tuile = vidéo 16/9 + cette barre.
 */
export const TILE_BAR = 24
/**
 * Largeur minimale d'une miniature pour que Twitch accepte de la lire (seuil « size » du lecteur :
 * 300 × 150 px). En dessous, la miniature reste sur son image d'attente.
 */
export const THUMB_MIN_WIDTH = 300
export const THUMB_MAX_WIDTH = 480

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Plus grande tuile (vidéo 16/9 + barre) dans une zone, centrée. */
function fitTile(areaX: number, areaY: number, areaW: number, areaH: number, bar: number): TileRect {
  const w = Math.max(0, Math.min(areaW, (areaH - bar) * TILE_RATIO))
  const h = w / TILE_RATIO + bar
  return { x: areaX + (areaW - w) / 2, y: areaY + (areaH - h) / 2, w, h }
}

/**
 * Grille « multiviewer » : choisit le nombre de colonnes qui maximise la taille des tuiles
 * dans le conteneur, centre l'ensemble et centre la dernière rangée si elle est incomplète.
 */
export function computeGridLayout(
  size: Size,
  count: number,
  gap: number = TILE_GAP,
  bar: number = TILE_BAR,
): TileRect[] {
  if (count <= 0 || size.width <= 0 || size.height <= 0) return []

  let best = { cols: 1, rows: count, w: 0, h: bar }
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols)
    const cellW = (size.width - gap * (cols - 1)) / cols
    const cellH = (size.height - gap * (rows - 1)) / rows
    const w = Math.min(cellW, (cellH - bar) * TILE_RATIO)
    if (w > best.w) best = { cols, rows, w, h: w / TILE_RATIO + bar }
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

/** Largeur maximale d'une miniature pour que `others` miniatures sur `cols` colonnes tiennent en hauteur. */
function maxThumbByHeight(height: number, others: number, cols: number, gap: number, bar: number): number {
  const rows = Math.ceil(others / cols)
  return Math.max(0, (height - gap * (rows - 1)) / rows - bar) * TILE_RATIO
}

/** Largeur maximale d'une miniature pour que le bloc de `cols` colonnes ne dépasse pas `maxBlock`. */
function maxThumbByWidth(maxBlock: number, cols: number, gap: number): number {
  return Math.max(0, (maxBlock - gap * (cols - 1)) / cols)
}

/**
 * Mode focus : un stream aussi grand que possible, les autres en miniatures dans un bloc latéral
 * (à droite ou à gauche), chaque tuile portant sa barre au-dessus de la vidéo. Bloc replié : le
 * stream prend tout, les autres se rangent derrière lui (`hidden`, en pause tant qu'ils y sont).
 *
 * Les miniatures font au moins 300 px de large (seuil de lecture de Twitch) : quand une seule
 * colonne ne suffit pas en hauteur, le bloc passe à 2, 3… colonnes tant qu'il reste sous la moitié
 * de la largeur. Sans solution, une colonne unique rétrécie. Sur écran large, le bloc récupère la
 * largeur que le stream principal ne peut pas utiliser (limité par la hauteur).
 */
export function computeFocusLayout(
  size: Size,
  count: number,
  focusedIndex: number,
  options: FocusLayoutOptions,
): TileRect[] {
  if (count <= 0 || size.width <= 0 || size.height <= 0) return []
  const gap = options.gap ?? TILE_GAP
  const bar = TILE_BAR
  const index = clamp(focusedIndex, 0, count - 1)
  const others = count - 1
  const collapsed = options.strip === 'off'
  const side = options.strip === 'left' ? 'left' : 'right'

  if (others === 0) return [fitTile(0, 0, size.width, size.height, bar)]

  if (collapsed) {
    const main = fitTile(0, 0, size.width, size.height, bar)
    return Array.from({ length: count }, (_, i) => (i === index ? main : { ...main, hidden: true }))
  }

  const base = clamp(size.width * 0.2, THUMB_MIN_WIDTH, THUMB_MAX_WIDTH)
  const thumbLimit = (cols: number) =>
    Math.min(
      maxThumbByHeight(size.height, others, cols, gap, bar),
      maxThumbByWidth(size.width * 0.5, cols, gap),
    )
  let cols = 1
  for (let k = 1; k <= others; k++) {
    if (thumbLimit(k) >= THUMB_MIN_WIDTH) {
      cols = k
      break
    }
  }
  let thumbW = Math.min(base, thumbLimit(cols))
  const blockW = (w: number) => cols * w + gap * (cols - 1)

  const mainW = Math.min(size.width - blockW(thumbW) - gap, (size.height - bar) * TILE_RATIO)
  const leftover = size.width - gap - mainW - blockW(thumbW)
  if (leftover > 0) {
    thumbW = Math.min(
      thumbW + leftover / cols,
      maxThumbByHeight(size.height, others, cols, gap, bar),
      maxThumbByWidth(size.width * 0.35, cols, gap),
    )
  }

  const block = blockW(thumbW)
  const rows = Math.ceil(others / cols)
  const thumbH = thumbW / TILE_RATIO + bar
  const main = fitTile(side === 'right' ? 0 : block + gap, 0, size.width - block - gap, size.height, bar)
  const blockX = side === 'right' ? size.width - block : 0
  const blockY = (size.height - (rows * thumbH + gap * (rows - 1))) / 2

  const rects: TileRect[] = []
  let slot = 0
  for (let i = 0; i < count; i++) {
    if (i === index) {
      rects.push(main)
      continue
    }
    const row = Math.floor(slot / cols)
    const col = slot % cols
    rects.push({ x: blockX + col * (thumbW + gap), y: blockY + row * (thumbH + gap), w: thumbW, h: thumbH })
    slot++
  }
  return rects
}
