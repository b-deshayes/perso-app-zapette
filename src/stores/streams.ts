import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { MAX_CHANNELS, parseChannelInput } from '@/domain/channel'
import { DEFAULT_STRIP, nextStripMode } from '@/domain/strip'
import type { StreamChannel, StripMode, WallMode, WallSnapshot } from '@/types/Stream'

export type AddResult = 'added' | 'exists' | 'invalid' | 'full'

/**
 * État du mur : la liste ordonnée des chaînes, qui a le son, qui est en focus.
 * Toute la logique de son (solo au focus, restauration à la sortie) vit ici.
 */
export const useStreamsStore = defineStore('streams', () => {
  const channels = ref<StreamChannel[]>([])
  const focused = ref<string | null>(null)
  const strip = ref<StripMode>(DEFAULT_STRIP)
  const chat = ref(false)

  /** Sons tels qu'ils étaient avant le passage en focus, restaurés au retour à la grille. */
  let savedMutes: Map<string, boolean> | null = null

  const count = computed(() => channels.value.length)
  const mode = computed<WallMode>(() => (focused.value ? 'focus' : 'grid'))
  const focusedIndex = computed(() => channels.value.findIndex((c) => c.name === focused.value))
  const audible = computed(() => channels.value.filter((c) => !c.muted).map((c) => c.name))
  /** Chaîne dont on affiche le chat : le focus, sinon celle qu'on entend, sinon la première. */
  const chatChannel = computed(() => focused.value ?? audible.value[0] ?? channels.value[0]?.name ?? null)

  function find(name: string): StreamChannel | undefined {
    return channels.value.find((c) => c.name === name)
  }

  function has(name: string): boolean {
    return find(name) !== undefined
  }

  function add(raw: string): AddResult {
    const name = parseChannelInput(raw)
    if (!name) return 'invalid'
    if (has(name)) return 'exists'
    if (channels.value.length >= MAX_CHANNELS) return 'full'
    // Première chaîne (ou aucune audible) : elle prend le son ; sinon elle arrive muette.
    const muted = focused.value !== null || audible.value.length > 0
    channels.value.push({ name, muted })
    return 'added'
  }

  function remove(name: string): void {
    const index = channels.value.findIndex((c) => c.name === name)
    if (index === -1) return
    channels.value.splice(index, 1)
    savedMutes?.delete(name)
    if (focused.value === name) {
      const next = channels.value[index] ?? channels.value[index - 1]
      if (next) focus(next.name)
      else unfocus()
    }
  }

  function setMuted(name: string, muted: boolean): void {
    const channel = find(name)
    if (channel) channel.muted = muted
  }

  function toggleMute(name: string): void {
    const channel = find(name)
    if (channel) channel.muted = !channel.muted
  }

  /** Une seule chaîne audible. */
  function solo(name: string): void {
    channels.value.forEach((c) => {
      c.muted = c.name !== name
    })
  }

  function muteAll(): void {
    channels.value.forEach((c) => {
      c.muted = true
    })
  }

  /** Touche « M » : tout couper, ou redonner le son au focus / à la première chaîne. */
  function toggleAllAudio(): void {
    if (audible.value.length > 0) {
      muteAll()
      return
    }
    const target = focused.value ?? channels.value[0]?.name
    if (target) solo(target)
  }

  function focus(name: string): void {
    if (!has(name)) return
    if (focused.value === null) savedMutes = new Map(channels.value.map((c) => [c.name, c.muted]))
    focused.value = name
    solo(name)
  }

  function unfocus(): void {
    if (focused.value === null) return
    focused.value = null
    const saved = savedMutes
    savedMutes = null
    if (saved) {
      channels.value.forEach((c) => {
        c.muted = saved.get(c.name) ?? true
      })
    }
  }

  function toggleFocus(name: string): void {
    if (focused.value === name) unfocus()
    else focus(name)
  }

  function focusIndex(index: number): void {
    const channel = channels.value[index]
    if (channel) toggleFocus(channel.name)
  }

  function cycleFocus(direction: 1 | -1): void {
    if (count.value === 0) return
    const current = focusedIndex.value
    const next = current === -1 ? 0 : (current + direction + count.value) % count.value
    const channel = channels.value[next]
    if (channel) focus(channel.name)
  }

  function move(name: string, direction: 1 | -1): void {
    const from = channels.value.findIndex((c) => c.name === name)
    const to = from + direction
    if (from === -1 || to < 0 || to >= count.value) return
    const list = channels.value.slice()
    const [item] = list.splice(from, 1)
    if (!item) return
    list.splice(to, 0, item)
    channels.value = list
  }

  /** Colonne des autres streams : droite → gauche → masquée. */
  function cycleStrip(): void {
    strip.value = nextStripMode(strip.value)
  }

  function setStrip(mode: StripMode): void {
    strip.value = mode
  }

  function toggleChat(): void {
    chat.value = !chat.value
  }

  function hydrate(snapshot: WallSnapshot): void {
    channels.value = snapshot.channels.map((c) => ({ name: c.name, muted: c.muted }))
    focused.value = snapshot.focused && has(snapshot.focused) ? snapshot.focused : null
    strip.value = snapshot.strip
    chat.value = snapshot.chat
    savedMutes = null
  }

  function snapshot(): WallSnapshot {
    return {
      channels: channels.value.map((c) => ({ ...c })),
      focused: focused.value,
      strip: strip.value,
      chat: chat.value,
    }
  }

  return {
    channels,
    focused,
    strip,
    chat,
    count,
    mode,
    focusedIndex,
    audible,
    chatChannel,
    has,
    add,
    remove,
    setMuted,
    toggleMute,
    solo,
    muteAll,
    toggleAllAudio,
    focus,
    unfocus,
    toggleFocus,
    focusIndex,
    cycleFocus,
    move,
    cycleStrip,
    setStrip,
    toggleChat,
    hydrate,
    snapshot,
  }
})
