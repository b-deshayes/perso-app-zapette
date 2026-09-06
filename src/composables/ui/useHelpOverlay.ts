import { readonly, ref } from 'vue'

const visible = ref(false)

/** Panneau d'aide (raccourcis, cast) : état partagé entre la barre et le clavier. */
export function useHelpOverlay() {
  return {
    visible: readonly(visible),
    open: () => (visible.value = true),
    close: () => (visible.value = false),
    toggle: () => (visible.value = !visible.value),
  }
}
