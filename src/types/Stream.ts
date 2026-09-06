/** Une chaîne Twitch affichée sur le mur. */
export interface StreamChannel {
  /** Nom de chaîne Twitch, toujours en minuscules. */
  name: string
  muted: boolean
}

export type WallMode = 'grid' | 'focus'

/** État partageable du mur : sérialisé dans l'URL, le localStorage et les messages de cast. */
export interface WallSnapshot {
  channels: StreamChannel[]
  /** Chaîne en focus (mode « un grand + bandeau »), null en mode grille. */
  focused: string | null
  /** Bandeau des autres streams visible en mode focus. */
  strip: boolean
  /** Panneau de chat Twitch ouvert. */
  chat: boolean
}
