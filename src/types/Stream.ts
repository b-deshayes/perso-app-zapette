/** Une chaîne Twitch affichée sur le mur. */
export interface StreamChannel {
  /** Nom de chaîne Twitch, toujours en minuscules. */
  name: string
  muted: boolean
}

export type WallMode = 'grid' | 'focus'

/** Colonne des autres streams en mode focus : à droite, à gauche, ou masquée. */
export type StripMode = 'right' | 'left' | 'off'

/** État partageable du mur : sérialisé dans l'URL, le localStorage et les messages de cast. */
export interface WallSnapshot {
  channels: StreamChannel[]
  /** Chaîne en focus (mode « un grand + colonne »), null en mode grille. */
  focused: string | null
  /** Position de la colonne des autres streams en mode focus. */
  strip: StripMode
  /** Panneau de chat Twitch ouvert. */
  chat: boolean
}
