import { readonly, ref } from 'vue'
import { useAutoHideBar } from '@/composables/ui/useAutoHideBar'

export type ToastKind = 'info' | 'warn'

export interface Toast {
  id: number
  message: string
  kind: ToastKind
}

/** Un seul message à la fois : il vit dans la barre du haut, jamais sur le mur (un toast qui recouvrirait un stream le mettrait en pause). */
const toast = ref<Toast | null>(null)
let nextId = 1
let timer: number | undefined

/** Messages éphémères (erreurs de saisie, état du cast), affichés dans la barre du haut. */
export function useToast() {
  const bar = useAutoHideBar()

  function dismiss(): void {
    if (timer !== undefined) window.clearTimeout(timer)
    timer = undefined
    toast.value = null
  }

  function show(message: string, kind: ToastKind = 'info', durationMs = 2800): void {
    dismiss()
    toast.value = { id: nextId++, message, kind }
    // La barre se montre le temps du message si elle n'est pas épinglée.
    bar.reveal(durationMs + 400)
    timer = window.setTimeout(dismiss, durationMs)
  }

  return { toast: readonly(toast), show, dismiss }
}
