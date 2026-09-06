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
import { useIntervalFn, watchDebounced } from '@vueuse/core'
import { pickQuality } from '@/domain/quality'
import { embedParents, loadTwitchEmbed } from '@/services/twitch-embed.service'

export type PlayerStatus = 'loading' | 'live' | 'offline' | 'paused' | 'error'

export interface UseTwitchPlayerOptions {
  channel: string
  muted: MaybeRefOrGetter<boolean>
  /** Tuile rangée derrière le stream en focus : Twitch la met en pause (occluse), on n'y touche pas. */
  hidden: MaybeRefOrGetter<boolean>
  /** Visible et assez grande pour que Twitch accepte de (re)lancer la lecture. */
  eligible: MaybeRefOrGetter<boolean>
  /** Largeur affichée, pour adapter la qualité demandée. */
  width: MaybeRefOrGetter<number>
  /**
   * Activer le son sans attendre un geste utilisateur. Vrai sur la TV (récepteur Presentation,
   * autoplay sonore autorisé par Chrome), faux sur le PC où l'on attend le premier clic.
   */
  eagerAudio?: boolean
}

const ACTIVATION_EVENTS = ['pointerdown', 'keydown'] as const
/** Relances après un changement de disposition, puis veille lente : Twitch ne reprend jamais seul. */
const NUDGE_DELAYS_MS = [400, 1500]
const WATCHDOG_MS = 4000
/** Laisser sa chance à l'autoplay initial avant la première relance. */
const READY_GRACE_MS = 2500

/** Le navigateur a-t-il déjà vu un geste utilisateur sur cette page ? */
function hasUserActivation(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  return activation ? activation.hasBeenActive : true
}

/**
 * Pilote un lecteur Twitch dans `host` : création, son, qualité, statut live/hors ligne, relance.
 *
 * Règles apprises en lisant le lecteur (voir README, « Pièges Twitch ») :
 * - créer le lecteur seulement quand la tuile est visible ;
 * - ne rien appeler au READY (ni play(), ni setMuted(false)) : son et qualité au PLAYING ;
 * - Twitch met en pause dès qu'une règle est violée et ne reprend jamais seul → on relance
 *   nous-mêmes, uniquement quand la tuile est éligible (visible, assez grande).
 */
export function useTwitchPlayer(host: Ref<HTMLElement | null>, options: UseTwitchPlayerOptions) {
  const status = ref<PlayerStatus>('loading')
  /** Le navigateur a refusé la lecture avec son (autoplay) : il faut un clic. */
  const blocked = ref(false)
  const player = shallowRef<Twitch.Player | null>(null)
  let readyAt = 0
  let creating = false
  let disposed = false
  let activationHandler: (() => void) | null = null
  const timers = new Set<number>()

  function withPlayer(action: (p: Twitch.Player) => void): void {
    const p = player.value
    if (!p || !readyAt) return
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

  /** Un changement de qualité relance la lecture (donc repasse par les contrôles Twitch) : jamais sur une tuile rangée. */
  const applyQuality = () =>
    withPlayer((p) => {
      if (!toValue(options.eligible)) return
      const wanted = pickQuality(p.getQualities(), toValue(options.width))
      if (wanted !== p.getQuality()) p.setQuality(wanted)
    })

  /** Relance un lecteur que Twitch a mis en pause, si la tuile remplit à nouveau ses conditions. */
  const nudge = () =>
    withPlayer((p) => {
      if (!toValue(options.eligible) || status.value === 'offline') return
      if (Date.now() - readyAt < READY_GRACE_MS) return
      if (p.isPaused()) p.play()
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
      readyAt = Date.now()
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
    }
    player.value = p
  }

  onMounted(() => {
    // Création différée : la tuile doit être visible au moment où Twitch évalue ses conditions.
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
    () => toValue(options.eligible),
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
  useIntervalFn(nudge, WATCHDOG_MS)

  /** À appeler depuis un clic : lève le blocage d'autoplay sonore et redonne le son. */
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
