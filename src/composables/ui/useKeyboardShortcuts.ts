import { useEventListener } from '@vueuse/core'
import { useAutoHideBar } from '@/composables/ui/useAutoHideBar'
import { useHelpOverlay } from '@/composables/ui/useHelpOverlay'
import { useStreamsStore } from '@/stores/streams'

export interface ShortcutActions {
  toggleFullscreen: () => void
  focusAddInput: () => void
}

function isEditable(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * Raccourcis globaux (voir l'aide « ? »). Inactifs quand on tape dans un champ ou quand le
 * focus clavier est dans un lecteur Twitch (l'iframe garde alors les touches).
 */
export function useKeyboardShortcuts(actions: ShortcutActions) {
  const store = useStreamsStore()
  const help = useHelpOverlay()
  const bar = useAutoHideBar()

  useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (isEditable(event.target)) {
      if (event.key === 'Escape') event.target.blur()
      return
    }

    const key = event.key
    if (key.length === 1 && key >= '1' && key <= '9') {
      store.focusIndex(Number(key) - 1)
      event.preventDefault()
      return
    }

    switch (key) {
      case 'Escape':
        if (help.visible.value) help.close()
        else store.unfocus()
        break
      case 'ArrowRight':
        store.cycleFocus(1)
        break
      case 'ArrowLeft':
        store.cycleFocus(-1)
        break
      case 'f':
      case 'F':
        actions.toggleFullscreen()
        break
      case 'm':
      case 'M':
        store.toggleAllAudio()
        break
      case 'c':
      case 'C':
        store.toggleChat()
        break
      case 's':
      case 'S':
        store.cycleStrip()
        break
      case 'h':
      case 'H':
        bar.togglePin()
        break
      case 'a':
      case 'A':
      case '/':
        actions.focusAddInput()
        break
      case 'Delete':
        if (store.focused) store.remove(store.focused)
        break
      case '?':
        help.toggle()
        break
      default:
        return
    }
    event.preventDefault()
  })
}
