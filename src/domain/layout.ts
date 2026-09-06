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
}

export interface FocusLayoutOptions {
  /** Afficher le bandeau des autres streams sous le stream en focus. */
  strip: boolean
  gap?: number
}

export const TILE_RATIO = 16 / 9
export const TILE_GAP = 2
export const HIDDEN_RECT: TileRect = { x: 0, y: 0, w: 0, h: 0 }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
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
 * Mode focus : un stream aussi grand que possible, les autres en bandeau de miniatures en bas
 * (ou masqués — rect nul — si le bandeau est replié).
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
  const showStrip = options.strip && others > 0

  let thumbW = 0
  let thumbH = 0
  let stripH = 0
  if (showStrip) {
    thumbH = clamp(size.height * 0.16, 64, 220)
    thumbW = thumbH * TILE_RATIO
    const maxTotal = size.width
    if (others * thumbW + gap * (others - 1) > maxTotal) {
      thumbW = (maxTotal - gap * (others - 1)) / others
      thumbH = thumbW / TILE_RATIO
    }
    stripH = thumbH + gap
  }

  const availH = size.height - stripH
  const mainW = Math.min(size.width, availH * TILE_RATIO)
  const mainH = mainW / TILE_RATIO
  const main: TileRect = { x: (size.width - mainW) / 2, y: (availH - mainH) / 2, w: mainW, h: mainH }

  const rects: TileRect[] = []
  let x = showStrip ? (size.width - (others * thumbW + gap * (others - 1))) / 2 : 0
  const y = size.height - thumbH
  for (let i = 0; i < count; i++) {
    if (i === index) {
      rects.push(main)
      continue
    }
    if (!showStrip) {
      rects.push(HIDDEN_RECT)
      continue
    }
    rects.push({ x, y, w: thumbW, h: thumbH })
    x += thumbW + gap
  }
  return rects
}
