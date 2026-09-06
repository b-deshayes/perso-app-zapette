import { readonly, ref } from 'vue'

export type ToastKind = 'info' | 'warn'

export interface Toast {
  id: number
  message: string
  kind: ToastKind
}

const toasts = ref<Toast[]>([])
let nextId = 1

/** Messages éphémères en bas de l'écran (erreurs de saisie, état du cast). */
export function useToast() {
  function show(message: string, kind: ToastKind = 'info', durationMs = 2800): void {
    const id = nextId++
    toasts.value = [...toasts.value.slice(-2), { id, message, kind }]
    window.setTimeout(() => dismiss(id), durationMs)
  }

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts: readonly(toasts), show, dismiss }
}
