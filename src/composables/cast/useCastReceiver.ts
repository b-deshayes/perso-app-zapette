import { onMounted, readonly, ref } from 'vue'
import { decodeCastMessage, encodeCastMessage } from '@/domain/cast-protocol'
import { decodeWallState } from '@/domain/url-state'
import { getPresentation } from '@/services/presentation.service'
import { useStreamsStore } from '@/stores/streams'
import type { PresentationConnectionLike } from '@/types/Presentation'

/**
 * Côté TV (`?receiver=1`) : état initial lu dans l'URL, puis mis à jour par les messages du PC.
 * Aucune interface, aucune persistance : la page est un pur écran.
 */
export function useCastReceiver() {
  const store = useStreamsStore()
  const connected = ref(false)

  const initial = decodeWallState(new URLSearchParams(window.location.search))
  if (initial) store.hydrate(initial)

  function bind(connection: PresentationConnectionLike): void {
    connected.value = true
    connection.onmessage = (event) => {
      const message = decodeCastMessage(event.data)
      if (message?.type === 'state') store.hydrate(message.payload)
    }
    connection.onclose = () => (connected.value = false)
    connection.onterminate = () => (connected.value = false)
    try {
      connection.send(encodeCastMessage({ type: 'hello' }))
    } catch {
      // Le contrôleur n'est peut-être pas encore à l'écoute.
    }
  }

  onMounted(async () => {
    const receiver = getPresentation()?.receiver
    if (!receiver) return
    try {
      const list = await receiver.connectionList
      list.connections.forEach(bind)
      list.onconnectionavailable = (event) => bind(event.connection)
    } catch {
      // Pas de contrôleur : la page reste pilotée par son URL.
    }
  })

  return { connected: readonly(connected) }
}
