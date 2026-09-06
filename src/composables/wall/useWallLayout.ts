import { computed, onMounted, readonly, ref, watch, type Ref } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
import {
  computeFocusLayout,
  computeGridLayout,
  meetsPlayerMinimum,
  type CardRect,
  type Size,
  type TileRect,
} from '@/domain/layout'
import { useStreamsStore } from '@/stores/streams'

/** Vrai quand au moins une tuile visible est trop petite pour l'autoplay Twitch (partagé avec la barre). */
const undersized = ref(false)

export function useWallWarnings() {
  return { undersized: readonly(undersized) }
}

/** Rectangles des tuiles et cartes, recalculés à chaque redimensionnement du conteneur ou changement d'état. */
export function useWallLayout(container: Ref<HTMLElement | null>) {
  const store = useStreamsStore()
  const size = ref<Size>({ width: 0, height: 0 })

  /**
   * Mesure synchrone au montage et sur `resize` : le ResizeObserver seul ne livre rien tant que la
   * page n'est pas rendue (onglet en arrière-plan, aperçu masqué), et le mur resterait vide.
   */
  function measure() {
    const el = container.value
    if (!el) return
    const next = { width: el.clientWidth, height: el.clientHeight }
    if (next.width !== size.value.width || next.height !== size.value.height) size.value = next
  }

  onMounted(measure)
  useEventListener(window, 'resize', measure, { passive: true })
  useResizeObserver(container, ([entry]) => {
    if (!entry) return
    const { width, height } = entry.contentRect
    if (width !== size.value.width || height !== size.value.height) size.value = { width, height }
  })

  const layout = computed<{ rects: TileRect[]; cards: CardRect[] }>(() => {
    if (store.focusedIndex >= 0) {
      return computeFocusLayout(size.value, store.count, store.focusedIndex, { strip: store.strip })
    }
    return { rects: computeGridLayout(size.value, store.count), cards: [] }
  })

  const rects = computed(() => layout.value.rects)
  const cards = computed(() => layout.value.cards)

  watch(
    rects,
    (list) => {
      undersized.value = list.some((r) => !r.hidden && r.w > 0 && !meetsPlayerMinimum(r))
    },
    { immediate: true },
  )

  return { rects, cards, size }
}
