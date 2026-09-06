import { computed, ref } from 'vue'
import { useStorage } from '@vueuse/core'

const HIDE_DELAY_MS = 700
const REVEAL_MS = 2500
/** Délai d'intention : traverser le bord haut d'un trait ne doit pas faire surgir la barre (et pousser le mur). */
const REVEAL_INTENT_MS = 180

function createAutoHideBar() {
  const pinned = useStorage('zapette.bar.pinned', false)
  const hovered = ref(false)
  const focused = ref(false)
  let timer: number | undefined

  const visible = computed(() => pinned.value || hovered.value || focused.value)

  function clear() {
    if (timer !== undefined) window.clearTimeout(timer)
    timer = undefined
  }

  function onEnter() {
    clear()
    if (visible.value) {
      hovered.value = true
      return
    }
    timer = window.setTimeout(() => (hovered.value = true), REVEAL_INTENT_MS)
  }

  function onLeave() {
    clear()
    timer = window.setTimeout(() => (hovered.value = false), HIDE_DELAY_MS)
  }

  function onFocusIn() {
    focused.value = true
  }

  function onFocusOut(event: FocusEvent) {
    const zone = event.currentTarget as HTMLElement | null
    const next = event.relatedTarget as Node | null
    if (!zone || !next || !zone.contains(next)) focused.value = false
  }

  /** Montre la barre quelques secondes (raccourci clavier, toast) sans l'épingler. */
  function reveal(durationMs: number = REVEAL_MS) {
    clear()
    hovered.value = true
    timer = window.setTimeout(() => (hovered.value = false), durationMs)
  }

  function togglePin() {
    pinned.value = !pinned.value
  }

  return { visible, pinned, onEnter, onLeave, onFocusIn, onFocusOut, reveal, togglePin }
}

let instance: ReturnType<typeof createAutoHideBar> | null = null

/** Barre du haut : masquée par défaut (aucune place perdue), révélée au survol du bord, épinglable. */
export function useAutoHideBar() {
  if (!instance) instance = createAutoHideBar()
  return instance
}
