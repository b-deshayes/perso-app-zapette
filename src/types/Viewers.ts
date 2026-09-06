/** Un relevé du nombre de spectateurs d'une chaîne (`t` : horodatage ms, `v` : spectateurs). */
export interface ViewerSample {
  t: number
  v: number
}

/** Historique par chaîne (login Twitch → relevés, du plus ancien au plus récent). */
export type ViewerHistory = Record<string, ViewerSample[]>

/** Ce que Twitch sait d'un stream à un instant donné. */
export interface StreamInfo {
  login: string
  displayName: string
  live: boolean
  viewers: number | null
  title: string | null
  game: string | null
}

/** Tendance d'une chaîne : spectateurs actuels, variation vs la référence récente, pic en cours. */
export interface ViewerTrend {
  viewers: number | null
  /** Variation relative (0,31 = +31 %) par rapport à la médiane des 15 dernières minutes ; null si pas assez de recul. */
  delta: number | null
  hot: boolean
}
