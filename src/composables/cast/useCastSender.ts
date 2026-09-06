import { effectScope, readonly, ref, watch } from 'vue'
import { encodeCastMessage } from '@/domain/cast-protocol'
import { encodeWallState, URL_KEYS } from '@/domain/url-state'
import { getPresentationRequestCtor } from '@/services/presentation.service'
import { useStreamsStore } from '@/stores/streams'
import type { CastMessage, CastState } from '@/types/Cast'
import type { PresentationConnectionLike, PresentationRequestLike } from '@/types/Presentation'

export type CastStartResult = 'started' | 'cancelled' | 'unsupported' | 'unavailable'

const SESSION_KEY = 'zapette.cast.session'

const state = ref<CastState>('idle')
const supported = ref(false)
/** null = inconnu (le navigateur ne sait pas surveiller la disponibilité). */
const available = ref<boolean | null>(null)
let connection: PresentationConnectionLike | null = null
let initialized = false

/**
 * Côté PC : ouvre le mur en mode récepteur sur une Chromecast (API Presentation, rendu hors
 * écran puis mirroring par Chrome) et lui pousse chaque changement d'état. Le PC devient la
 * télécommande ; ses lecteurs locaux sont coupés pour ne pas décoder deux fois.
 */
export function useCastSender() {
  const store = useStreamsStore()
  const Ctor = getPresentationRequestCtor()
  supported.value = Ctor !== null

  if (!initialized) {
    initialized = true
    effectScope(true).run(() => {
      watch(
        () => store.snapshot(),
        (snapshot) => send({ type: 'state', payload: snapshot }),
        { deep: true },
      )
    })
  }

  function receiverUrl(): string {
    const url = new URL(window.location.href)
    const params = encodeWallState(store.snapshot())
    params.set(URL_KEYS.receiver, '1')
    url.search = params.toString()
    url.hash = ''
    return url.toString()
  }

  function buildRequest(url = receiverUrl()): PresentationRequestLike | null {
    return Ctor ? new Ctor([url]) : null
  }

  async function probeAvailability(): Promise<void> {
    const request = buildRequest()
    if (!request) return
    try {
      const availability = await request.getAvailability()
      available.value = availability.value
      availability.onchange = () => (available.value = availability.value)
    } catch {
      available.value = null
    }
  }

  function send(message: CastMessage): void {
    if (connection?.state !== 'connected') return
    try {
      connection.send(encodeCastMessage(message))
    } catch {
      // Connexion en train de se fermer : l'état sera renvoyé à la prochaine connexion.
    }
  }

  function release(): void {
    connection = null
    state.value = 'idle'
    sessionStorage.removeItem(SESSION_KEY)
  }

  function bind(next: PresentationConnectionLike): void {
    connection = next
    state.value = next.state === 'connected' ? 'connected' : 'connecting'
    next.onconnect = () => {
      state.value = 'connected'
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: next.id, url: next.url }))
      send({ type: 'state', payload: store.snapshot() })
    }
    next.onclose = release
    next.onterminate = release
    if (next.state === 'connected') send({ type: 'state', payload: store.snapshot() })
  }

  async function start(): Promise<CastStartResult> {
    const request = buildRequest()
    if (!request) return 'unsupported'
    state.value = 'connecting'
    try {
      bind(await request.start())
      return 'started'
    } catch (error) {
      state.value = 'idle'
      const name = error instanceof Error ? error.name : ''
      return name === 'NotFoundError' ? 'unavailable' : 'cancelled'
    }
  }

  function stop(): void {
    const current = connection
    if (!current) return
    try {
      current.terminate()
    } catch {
      try {
        current.close()
      } catch {
        // Déjà fermée.
      }
    }
    release()
  }

  /** Après un rechargement de la page PC : reprend la main sur la présentation en cours. */
  async function resume(): Promise<void> {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw || !Ctor) return
    try {
      const session = JSON.parse(raw) as { id: string; url: string }
      const request = buildRequest(session.url)
      if (!request) return
      bind(await request.reconnect(session.id))
    } catch {
      sessionStorage.removeItem(SESSION_KEY)
    }
  }

  return {
    state: readonly(state),
    supported: readonly(supported),
    available: readonly(available),
    start,
    stop,
    resume,
    probeAvailability,
  }
}
