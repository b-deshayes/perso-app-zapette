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
  /** Tuile rognée (colonne masquée) : le lecteur continue en qualité minimale, jamais en pause. */
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
/** Délais des relances quand un lecteur est trouvé en pause après un changement de disposition. */
const NUDGE_DELAYS_MS = [400, 1500]

/** Le navigateur a-t-il déjà vu un geste utilisateur sur cette page ? */
function hasUserActivation(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  return activation ? activation.hasBeenActive : true
}

/**
 * Pilote un lecteur Twitch dans `host` : création, son, qualité, statut live/hors ligne.
 *
 * Règles apprises à la dure (Twitch coupe l'autoplay pour de bon si elles sont violées) :
 * - ne créer le lecteur qu'une fois la tuile réellement visible (jamais dans un élément masqué,
 *   ni pendant une animation d'opacité) ;
 * - ne rien appeler au READY (ni play(), ni setMuted(false)) : son et qualité sont appliqués au PLAYING ;
 * - ne jamais mettre en pause nous-mêmes : une reprise par play() est trop souvent refusée.
 */
export function useTwitchPlayer(host: Ref<HTMLElement | null>, options: UseTwitchPlayerOptions) {
  const status = ref<PlayerStatus>('loading')
  /** Le navigateur a refusé la lecture avec son (autoplay) : il faut un clic. */
  const blocked = ref(false)
  const player = shallowRef<Twitch.Player | null>(null)
  let ready = false
  let creating = false
  let disposed = false
  let activationHandler: (() => void) | null = null
  const timers = new Set<number>()

  function withPlayer(action: (p: Twitch.Player) => void): void {
    const p = player.value
    if (!p || !ready) return
    try {
      action(p)
    } catch {
      // Le lecteur peut être détruit ou pas encore prêt : on ignore, l'état sera réappliqué.
    }
  }

  function later(delayMs: number, action: () => void): void {
    const id = window.setTimeout(() => {
      timers.delete(id)
      if (!disposed) action()
    }, delayMs)
    timers.add(id)
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

  const applyQuality = () =>
    withPlayer((p) => {
      const wanted = pickQuality(p.getQualities(), toValue(options.width), { minimal: toValue(options.hidden) })
      if (wanted !== p.getQuality()) p.setQuality(wanted)
    })

  /** Un lecteur trouvé en pause après un changement de disposition est relancé (miniatures toujours en direct). */
  const nudge = () =>
    withPlayer((p) => {
      if (status.value !== 'loading' && p.isPaused()) p.play()
    })

  function scheduleNudges(): void {
    for (const delay of NUDGE_DELAYS_MS) later(delay, nudge)
  }

  async function createPlayer(): Promise<void> {
    try {
      await loadTwitchEmbed()
    } catch {
      status.value = 'error'
      return
    }
    if (disposed || !host.value || player.value) return

    // Toujours créé muet : l'autoplay muet passe partout, le son demandé est appliqué au PLAYING.
    const p = new Twitch.Player(host.value, {
      channel: options.channel,
      parent: embedParents(),
      muted: true,
      autoplay: true,
      width: '100%',
      height: '100%',
    })
    p.addEventListener(Twitch.Player.READY, () => {
      ready = true
    })
    p.addEventListener(Twitch.Player.PLAYING, () => {
      status.value = 'live'
      blocked.value = false
      applyMuted()
      applyQuality()
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
      // Registre de debug : window.__zapettePlayers.get('zerator').isPaused() depuis la console.
      const registry = ((window as unknown as { __zapettePlayers?: Map<string, Twitch.Player> }).__zapettePlayers ??=
        new Map())
      registry.set(options.channel, p)
      for (const event of ['ready', 'play', 'playing', 'pause', 'playbackBlocked', 'online', 'offline', 'ended']) {
        p.addEventListener(event, () => console.debug(`[player:${options.channel}] ${event}`))
      }
    }
    player.value = p
  }

  onMounted(() => {
    // Création différée : la tuile doit être visible (mesurée, non rognée) au moment où Twitch
    // évalue ses conditions d'autoplay.
    watch(
      () => toValue(options.hidden),
      (hidden) => {
        if (hidden || creating || disposed) return
        creating = true
        void createPlayer()
      },
      { immediate: true, flush: 'post' },
    )
  })

  watch(() => toValue(options.muted), applyMuted)
  watch(
    () => toValue(options.hidden),
    () => {
      applyQuality()
      scheduleNudges()
    },
    { flush: 'post' },
  )
  watchDebounced(
    () => toValue(options.width),
    () => {
      applyQuality()
      scheduleNudges()
    },
    { debounce: 500 },
  )

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
    for (const id of timers) window.clearTimeout(id)
    timers.clear()
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
