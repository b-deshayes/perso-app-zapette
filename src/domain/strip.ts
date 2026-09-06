import type { StripMode } from '@/types/Stream'

export const STRIP_MODES: readonly StripMode[] = ['right', 'left', 'off']
export const DEFAULT_STRIP: StripMode = 'right'

/** Valeur venue de l'URL / du stockage : `0` (ancien format) vaut « masqué », l'inconnu vaut la valeur par défaut. */
export function parseStripMode(value: unknown): StripMode {
  if (value === '0' || value === false) return 'off'
  return typeof value === 'string' && (STRIP_MODES as readonly string[]).includes(value)
    ? (value as StripMode)
    : DEFAULT_STRIP
}

/** Touche « S » : droite → gauche → masqué → droite. */
export function nextStripMode(mode: StripMode): StripMode {
  const index = STRIP_MODES.indexOf(mode)
  return STRIP_MODES[(index + 1) % STRIP_MODES.length] ?? DEFAULT_STRIP
}
