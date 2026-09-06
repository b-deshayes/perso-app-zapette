import type { WallSnapshot } from '@/types/Stream'

/** Protocole PC (contrôleur) → TV (récepteur) via l'API Presentation. */
export type CastMessage = { type: 'state'; payload: WallSnapshot } | { type: 'hello' }

export type CastState = 'idle' | 'connecting' | 'connected'
