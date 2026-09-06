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
import { embedParents, loadTwitchEmbed } from '@/services/twitch-embed.service'

export type PlayerStatus = 'loading' | 'live' | 'offline' | 'paused' | 'error'

export interface UseTwitchPlayerOptions {
  channel: string
  muted: MaybeRefOrGetter<boolean>
  /** Tuile rangée derrière le stream en focus (colonne masquée) : le lecteur continue, jamais en pause. */
  hidden: MaybeRefOrGetter<boolean>
  /** Largeur affichée : un changement de disposition déclenche une relance si le lecteur est en pause. */
  width: MaybeRefOrGetter<number>
  /**
   * Activer le son sans attendre un geste utilisateur. Vrai sur la TV (récepteur Presentation,
   * autoplay sonore autorisé par Chrome), faux sur le PC où l'on attend le premier clic.
   */
  eagerAudio?: boolean
}

const ACTIVATION_EVENTS = ['pointerdown', 'keydown'] as const
/**
 * Délais des relances quand un lecteur est trouvé en pause. Le lecteur Twitch réévalue sa
 * visibilité au plus une fois par seconde : la 2e et la 3e relance tombent après ce délai.
 */
const NUDGE_DELAYS_MS = [400, 1500, 3200]
/**
 * Démarrage échelonné : un lecteur toutes les 700 ms. Huit lecteurs lancés au même instant
 * (script, playlists, pubs, décodeurs) saturent le réseau et le CPU et se figent tous.
 */
const BOOT_INTERVAL_MS = 700

let nextBootSlot = 0

/** Réserve le prochain créneau de démarrage ; retourne une fonction d'annulation. */
function scheduleBoot(run: () => void): () => void {
  const now = Date.now()
  const at = Math.max(now, nextBootSlot)
  nextBootSlot = at + BOOT_INTERVAL_MS
  const id = window.setTimeout(run, at - now)
  return () => window.clearTimeout(id)
}

/**
 * Demande de relance ciblée : après qu'un panneau (aide) a recouvert le mur, seuls les lecteurs
 * que Twitch a mis en pause pendant ce temps sont relancés — jamais un stream que l'utilisateur
 * avait lui-même mis en pause avant.
 */
const nudgeRequest = ref<{ since: number; serial: number }>({ since: 0, serial: 0 })

/** Relance les lecteurs passés en pause depuis l'horodatage `since` (ms, `Date.now()`). */
export function nudgePausedSince(since: number): void {
  nudgeRequest.value = { since, serial: nudgeRequest.value.serial + 1 }
}

/** Le navigateur a-t-il déjà vu un geste utilisateur sur cette page ? */
function hasUserActivation(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  return activation ? activation.hasBeenActive : true
}

/**
 * Pilote un lecteur Twitch dans `host` : création échelonnée, son, statut live/hors ligne, relance.
 *
 * Règles apprises à la dure (Twitch coupe l'autoplay pour de bon si elles sont violées) :
 * - ne créer le lecteur qu'une fois la tuile réellement visible (jamais dans un élément masqué,
 *   ni pendant une animation d'opacité) ;
 * - ne rien appeler au READY (ni play(), ni setMuted(false)) : le son est appliqué au PLAYING ;
 * - ne jamais mettre en pause nous-mêmes : une reprise par play() est trop souvent refusée ;
 * - laisser la qualité en « auto » : une qualité forcée empêche le lecteur de descendre quand la
 *   connexion sature, et l'image se fige ;
 * - rien ne doit recouvrir l'iframe (voir StreamTile) : en cours de lecture, une occlusion d'une
 *   seconde met le stream en pause, sans reprise automatique.
 */
export function useTwitchPlayer(host: Ref<HTMLElement | null>, options: UseTwitchPlayerOptions) {
  const status = ref<PlayerStatus>('loading')
  /** Le navigateur a refusé la lecture avec son (autoplay) : il faut un clic. */
  const blocked = ref(false)
  const player = shallowRef<Twitch.Player | null>(null)
  let ready = false
  let creating = false
  let disposed = false
  /** Dernière mise en pause signalée par le lecteur (0 : jamais). */
  let pausedAt = 0
  let cancelBoot: (() => void) | null = null
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

  /** Un lecteur trouvé en pause est relancé (miniatures toujours en direct). */
  const nudge = () =>
    withPlayer((p) => {
      if (toValue(options.hidden)) return
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
    })
    p.addEventListener(Twitch.Player.ONLINE, () => {
      if (status.value === 'offline') status.value = 'loading'
    })
    p.addEventListener(Twitch.Player.OFFLINE, () => (status.value = 'offline'))
    p.addEventListener(Twitch.Player.ENDED, () => (status.value = 'offline'))
    p.addEventListener(Twitch.Player.PAUSE, () => {
      pausedAt = Date.now()
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
    }
    player.value = p
  }

  onMounted(() => {
    // Création différée : la tuile doit être visible (mesurée, non rognée) au moment où Twitch
    // évalue ses conditions d'autoplay, et les lecteurs démarrent l'un après l'autre.
    watch(
      () => toValue(options.hidden),
      (hidden) => {
        if (hidden || creating || disposed) return
        creating = true
        cancelBoot = scheduleBoot(() => {
          cancelBoot = null
          if (!disposed) void createPlayer()
        })
      },
      { immediate: true, flush: 'post' },
    )
  })

  watch(() => toValue(options.muted), applyMuted)
  watch(() => toValue(options.hidden), scheduleNudges, { flush: 'post' })
  watchDebounced(() => toValue(options.width), scheduleNudges, { debounce: 500 })
  watch(nudgeRequest, ({ since }) => {
    if (pausedAt > 0 && pausedAt >= since) scheduleNudges()
  })

  /** À appeler depuis un clic : lève le blocage d'autoplay et redonne le son. */
  function unblock(): void {
    withPlayer((p) => {
      p.setMuted(false)
      p.play()
    })
    blocked.value = false
  }

  /** Reprise demandée depuis la barre de la tuile (stream mis en pause par Twitch). */
  function resume(): void {
    withPlayer((p) => p.play())
  }

  onBeforeUnmount(() => {
    disposed = true
    cancelBoot?.()
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

  return { status: readonly(status), blocked: readonly(blocked), unblock, resume }
}
