import type { StripMode } from '@/types/Stream'

/**
 * Moteur de placement des tuiles : pur, testé, sans dépendance Vue.
 *
 * Contraintes imposées par le lecteur Twitch sur les domaines publics (lues dans son code) :
 * - rien ne doit recouvrir la vidéo, sinon l'autoplay est refusé et un lecteur en cours de lecture
 *   est mis en pause → chaque tuile porte une barre de contrôle SOUS la vidéo ;
 * - un lecteur plus petit que MIN_PLAYER_W × MIN_PLAYER_H ne démarre pas → les miniatures live du
 *   mode focus ont cette taille, et les chaînes qui ne tiennent plus deviennent des cartes.
 */
export interface Size {
  width: number
  height: number
}

/** Rectangle d'une tuile : vidéo + barre de contrôle (TILE_CAPTION) en bas. */
export interface TileRect {
  x: number
  y: number
  w: number
  h: number
  /** Tuile rangée derrière le stream en focus : même rect que lui, dessous, lecteur conservé. */
  hidden?: boolean
}

/** Carte compacte (sans lecteur) d'une chaîne qui n'a pas de place live dans la colonne. */
export interface CardRect {
  index: number
  x: number
  y: number
  w: number
  h: number
}

export interface FocusLayout {
  rects: TileRect[]
  cards: CardRect[]
}

export interface FocusLayoutOptions {
  /** Colonne des autres streams : à droite, à gauche, ou masquée. */
  strip: StripMode
  gap?: number
}

export const TILE_RATIO = 16 / 9
export const TILE_GAP = 2
/** Barre de contrôle sous chaque vidéo (hors de l'iframe : rien ne doit la recouvrir). */
export const TILE_CAPTION = 22
/** Hauteur d'une carte compacte dans la colonne. */
export const CARD_H = 28
/** Taille minimale d'un lecteur Twitch pour que l'autoplay soit accepté. */
export const MIN_PLAYER_W = 400
export const MIN_PLAYER_H = 300
/** Largeur vidéo d'une miniature live : la plus petite qui respecte le minimum en 16/9 (534×300). */
export const THUMB_VIDEO_W = Math.ceil(Math.max(MIN_PLAYER_W, MIN_PLAYER_H * TILE_RATIO))

/** La vidéo de cette tuile atteint-elle le minimum exigé par Twitch ? */
export function meetsPlayerMinimum(rect: TileRect): boolean {
  return rect.w >= MIN_PLAYER_W && rect.h - TILE_CAPTION >= MIN_PLAYER_H
}

/** Plus grande tuile (vidéo 16/9 + barre) dans une zone, centrée. */
function fitTile(areaX: number, areaY: number, areaW: number, areaH: number): TileRect {
  const w = Math.max(0, Math.min(areaW, Math.max(0, areaH - TILE_CAPTION) * TILE_RATIO))
  const h = w / TILE_RATIO + TILE_CAPTION
  return { x: areaX + (areaW - w) / 2, y: areaY + (areaH - h) / 2, w, h }
}

/**
 * Grille « multiviewer » : choisit le nombre de colonnes qui maximise la taille des tuiles,
 * centre l'ensemble et centre la dernière rangée si elle est incomplète.
 */
export function computeGridLayout(size: Size, count: number, gap: number = TILE_GAP): TileRect[] {
  if (count <= 0 || size.width <= 0 || size.height <= 0) return []

  let best = { cols: 1, rows: count, w: 0, h: 0 }
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols)
    const cellW = (size.width - gap * (cols - 1)) / cols
    const cellH = (size.height - gap * (rows - 1)) / rows
    const w = Math.min(cellW, Math.max(0, cellH - TILE_CAPTION) * TILE_RATIO)
    if (w > best.w) best = { cols, rows, w, h: w / TILE_RATIO + TILE_CAPTION }
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
 * Mode focus : un stream aussi grand que possible ; dans une colonne latérale, autant de
 * miniatures live (à la taille minimale Twitch) que la hauteur le permet, puis des cartes
 * compactes pour les autres, dont le lecteur est rangé derrière le stream en focus.
 * Colonne repliée : le stream prend tout, tous les autres sont rangés derrière lui.
 */
export function computeFocusLayout(
  size: Size,
  count: number,
  focusedIndex: number,
  options: FocusLayoutOptions,
): FocusLayout {
  if (count <= 0 || size.width <= 0 || size.height <= 0) return { rects: [], cards: [] }
  const gap = options.gap ?? TILE_GAP
  const index = Math.min(Math.max(focusedIndex, 0), count - 1)
  const others: number[] = []
  for (let i = 0; i < count; i++) if (i !== index) others.push(i)

  if (others.length === 0) return { rects: [fitTile(0, 0, size.width, size.height)], cards: [] }

  if (options.strip === 'off') {
    const main = fitTile(0, 0, size.width, size.height)
    const rects = Array.from({ length: count }, (_, i) => (i === index ? main : { ...main, hidden: true }))
    return { rects, cards: [] }
  }

  const side = options.strip === 'left' ? 'left' : 'right'
  // Des miniatures live seulement si le stream principal garde lui aussi la taille minimale.
  const canLive = size.width - THUMB_VIDEO_W - gap >= THUMB_VIDEO_W
  let column = canLive ? THUMB_VIDEO_W : Math.min(220, size.width * 0.25)
  if (canLive) {
    // Écran large : la largeur que le stream principal ne peut pas utiliser élargit la colonne.
    const mainW = Math.min(size.width - column - gap, (size.height - TILE_CAPTION) * TILE_RATIO)
    const leftover = size.width - gap - mainW - column
    if (leftover > 0) column = Math.min(column + leftover, size.width * 0.4)
  }
  const thumbH = column / TILE_RATIO + TILE_CAPTION
  const cardsHeight = (n: number) => (n > 0 ? n * CARD_H + (n - 1) * gap : 0)
  let live = canLive ? others.length : 0
  while (live > 0) {
    const cards = others.length - live
    const total = live * thumbH + (live - 1) * gap + (cards > 0 ? gap + cardsHeight(cards) : 0)
    if (total <= size.height) break
    live--
  }

  const main = fitTile(side === 'right' ? 0 : column + gap, 0, size.width - column - gap, size.height)
  const columnX = side === 'right' ? size.width - column : 0
  const rects: TileRect[] = new Array<TileRect>(count)
  const cards: CardRect[] = []
  rects[index] = main
  let y = 0
  others.forEach((i, k) => {
    if (k < live) {
      rects[i] = { x: columnX, y, w: column, h: thumbH }
      y += thumbH + gap
    } else {
      rects[i] = { ...main, hidden: true }
      cards.push({ index: i, x: columnX, y, w: column, h: CARD_H })
      y += CARD_H + gap
    }
  })
  return { rects, cards }
}
