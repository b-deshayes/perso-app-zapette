import {
  onBeforeUnmount,
  onMounted,
  readonly,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import { watchDebounced } from '@vueuse/core'
import { pickQuality } from '@/domain/quality'
import { embedParents, loadTwitchEmbed } from '@/services/twitch-embed.service'

export type PlayerStatus = 'loading' | 'live' | 'offline' | 'paused' | 'error'

export interface UseTwitchPlayerOptions {
  channel: string
  muted: MaybeRefOrGetter<boolean>
  /** Tuile masquée (bandeau replié) : on met le lecteur en pause pour économiser la bande passante. */
  hidden: MaybeRefOrGetter<boolean>
  /** Largeur affichée, pour adapter la qualité demandée. */
  width: MaybeRefOrGetter<number>
  /**
   * Activer le son sans attendre un geste utilisateur. Vrai sur la TV (récepteur Presentation,
   * autoplay sonore autorisé par Chrome), faux sur le PC où l'on attend le premier clic.
   */
  eagerAudio?: boolean
}

const ACTIVATION_EVENTS = ['pointerdown', 'keydown'] as const

/** Le navigateur a-t-il déjà vu un geste utilisateur sur cette page ? */
function hasUserActivation(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  return activation ? activation.hasBeenActive : true
}

/** Pilote un lecteur Twitch dans `host` : création, son, qualité, pause, statut live/hors ligne. */
export function useTwitchPlayer(host: Ref<HTMLElement | null>, options: UseTwitchPlayerOptions) {
  const status = ref<PlayerStatus>('loading')
  /** Le navigateur a refusé la lecture avec son (autoplay) : il faut un clic. */
  const blocked = ref(false)
  const player = shallowRef<Twitch.Player | null>(null)
  let ready = false
  let disposed = false
  let activationHandler: (() => void) | null = null

  function withPlayer(action: (p: Twitch.Player) => void): void {
    const p = player.value
    if (!p || !ready) return
    try {
      action(p)
    } catch {
      // Le lecteur peut être détruit ou pas encore prêt : on ignore, l'état sera réappliqué.
    }
  }

  function disarmActivation(): void {
    if (!activationHandler) return
    for (const type of ACTIVATION_EVENTS) window.removeEventListener(type, activationHandler, true)
    activationHandler = null
  }

  /** Sans geste utilisateur, un unmute couperait la lecture : on attend le premier clic / touche. */
  function armActivation(): void {
    if (activationHandler) return
    activationHandler = () => {
      disarmActivation()
      applyMuted()
    }
    for (const type of ACTIVATION_EVENTS) window.addEventListener(type, activationHandler, true)
  }

  const applyMuted = () =>
    withPlayer((p) => {
      const muted = toValue(options.muted)
      if (!muted && !options.eagerAudio && !hasUserActivation()) {
        p.setMuted(true)
        armActivation()
        return
      }
      disarmActivation()
      p.setMuted(muted)
    })
  const applyHidden = () =>
    withPlayer((p) => {
      if (toValue(options.hidden)) p.pause()
      else if (p.isPaused()) p.play()
    })
  const applyQuality = () =>
    withPlayer((p) => {
      const wanted = pickQuality(p.getQualities(), toValue(options.width))
      if (wanted !== p.getQuality()) p.setQuality(wanted)
    })

  onMounted(async () => {
    try {
      await loadTwitchEmbed()
    } catch {
      status.value = 'error'
      return
    }
    if (disposed || !host.value) return

    // Toujours créé muet : l'autoplay muet passe partout, le son demandé est appliqué au READY
    // (et, s'il est refusé faute de clic, Twitch signale PLAYBACK_BLOCKED → bouton « Activer le son »).
    const p = new Twitch.Player(host.value, {
      channel: options.channel,
      parent: embedParents(),
      muted: true,
      autoplay: true,
      width: '100%',
      height: '100%',
    })
    // Surtout pas de play() ni de setMuted(false) au READY : un appel programmatique à ce moment-là
    // court-circuite l'autoplay du lecteur, qui affiche alors son gros bouton « lecture ».
    p.addEventListener(Twitch.Player.READY, () => {
      ready = true
      applyQuality()
      if (toValue(options.hidden)) p.pause()
    })
    p.addEventListener(Twitch.Player.PLAYING, () => {
      status.value = 'live'
      blocked.value = false
      applyMuted()
    })
    p.addEventListener(Twitch.Player.ONLINE, () => {
      if (status.value === 'offline') status.value = 'loading'
    })
    p.addEventListener(Twitch.Player.OFFLINE, () => (status.value = 'offline'))
    p.addEventListener(Twitch.Player.ENDED, () => (status.value = 'offline'))
    p.addEventListener(Twitch.Player.PAUSE, () => {
      if (status.value === 'live') status.value = 'paused'
    })
    p.addEventListener(Twitch.Player.PLAY, () => {
      if (status.value === 'paused') status.value = 'live'
    })
    p.addEventListener(Twitch.Player.PLAYBACK_BLOCKED, () => (blocked.value = true))
    if (import.meta.env.DEV) {
      for (const event of ['ready', 'play', 'playing', 'pause', 'playbackBlocked', 'online', 'offline', 'ended']) {
        p.addEventListener(event, () => console.debug(`[player:${options.channel}] ${event}`))
      }
    }
    player.value = p
  })

  watch(() => toValue(options.muted), applyMuted)
  watch(() => toValue(options.hidden), applyHidden)
  watchDebounced(() => toValue(options.width), applyQuality, { debounce: 500 })

  /** À appeler depuis un clic : lève le blocage d'autoplay et redonne le son. */
  function unblock(): void {
    withPlayer((p) => {
      p.setMuted(false)
      p.play()
    })
    blocked.value = false
  }

  onBeforeUnmount(() => {
    disposed = true
    disarmActivation()
    const p = player.value
    player.value = null
    try {
      p?.destroy?.()
    } catch {
      // Le conteneur est retiré du DOM par Vue de toute façon.
    }
  })

  return { status: readonly(status), blocked: readonly(blocked), unblock }
}
