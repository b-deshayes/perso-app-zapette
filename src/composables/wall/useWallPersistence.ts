import { watch } from 'vue'
import { defaultSnapshot } from '@/domain/defaults'
import { decodeWallState, encodeWallState } from '@/domain/url-state'
import { loadWallSnapshot, saveWallSnapshot } from '@/services/storage.service'
import { useStreamsStore } from '@/stores/streams'
import type { WallSnapshot } from '@/types/Stream'

/**
 * Hydrate le mur (URL > localStorage > mur vide) puis maintient l'URL et le stockage
 * à jour : l'adresse courante est toujours partageable. Aucune chaîne n'est imposée.
 */
export function useWallPersistence() {
  const store = useStreamsStore()
  const fromUrl = decodeWallState(new URLSearchParams(window.location.search))
  store.hydrate(fromUrl ?? loadWallSnapshot() ?? defaultSnapshot())

  watch(
    () => store.snapshot(),
    (snapshot) => {
      saveWallSnapshot(snapshot)
      writeUrl(snapshot)
    },
    { deep: true, immediate: true },
  )
}

function writeUrl(snapshot: WallSnapshot): void {
  // Les virgules entre chaînes restent lisibles dans la barre d'adresse (pas de %2C).
  const query = encodeWallState(snapshot).toString().replace(/%2C/gi, ',')
  const next = `${window.location.pathname}${query ? `?${query}` : ''}`
  if (`${window.location.pathname}${window.location.search}` !== next) {
    window.history.replaceState(null, '', next)
  }
}
