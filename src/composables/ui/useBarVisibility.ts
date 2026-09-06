import { useStorage } from '@vueuse/core'

const visible = useStorage('zapette.bar.visible', true)

/**
 * Barre du haut : dans le flux, au-dessus du mur (jamais par-dessus : un élément qui recouvre un
 * lecteur Twitch le met en pause). Masquable avec H pour un mur plein cadre.
 */
export function useBarVisibility() {
  return {
    visible,
    show: () => (visible.value = true),
    toggle: () => (visible.value = !visible.value),
  }
}
