/** Typage minimal de l'embed interactif Twitch (https://player.twitch.tv/js/embed/v1.js). */
declare namespace Twitch {
  interface PlayerOptions {
    channel?: string
    video?: string
    collection?: string
    /** Domaines hébergeant la page (obligatoire) : ex. ["localhost"] ou ["b-deshayes.github.io"]. */
    parent?: string[]
    muted?: boolean
    autoplay?: boolean
    width?: number | string
    height?: number | string
    time?: string
  }

  interface PlayerQuality {
    name: string
    group: string
  }

  class Player {
    static readonly READY: string
    static readonly PLAY: string
    static readonly PLAYING: string
    static readonly PAUSE: string
    static readonly ENDED: string
    static readonly OFFLINE: string
    static readonly ONLINE: string
    static readonly SEEK: string
    static readonly PLAYBACK_BLOCKED: string

    constructor(target: string | HTMLElement, options: PlayerOptions)

    play(): void
    pause(): void
    setChannel(channel: string): void
    setMuted(muted: boolean): void
    getMuted(): boolean
    setVolume(volume: number): void
    getVolume(): number
    setQuality(quality: string): void
    getQuality(): string | undefined
    getQualities(): Array<PlayerQuality | string> | undefined
    getChannel(): string
    isPaused(): boolean
    addEventListener(event: string, callback: () => void): void
    removeEventListener(event: string, callback: () => void): void
    destroy?(): void
  }
}
