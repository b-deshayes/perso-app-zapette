import { computed, onMounted, ref, watch, type Ref } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
import { computeFocusLayout, computeGridLayout, type Size, type TileRect } from '@/domain/layout'
import { useStreamsStore } from '@/stores/streams'

/** Rectangles des tuiles, recalculés à chaque redimensionnement du conteneur ou changement d'état. */
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

  const rects = computed<TileRect[]>(() => {
    if (store.focusedIndex >= 0) {
      return computeFocusLayout(size.value, store.count, store.focusedIndex, { strip: store.strip })
    }
    return computeGridLayout(size.value, store.count)
  })

  /** Vrai une frame après la première mesure : évite d'animer les tuiles depuis un rect nul. */
  const ready = ref(false)
  const stop = watch(
    () => size.value.width,
    (w) => {
      if (w <= 0) return
      requestAnimationFrame(() => requestAnimationFrame(() => (ready.value = true)))
      stop()
    },
  )

  return { rects, ready, size }
}
