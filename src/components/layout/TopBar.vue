<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFullscreen } from '@vueuse/core'
import {
  Keyboard,
  LayoutGrid,
  Maximize,
  Maximize2,
  MessageSquare,
  Minimize,
  PanelLeft,
  PanelRight,
  Pin,
  PinOff,
} from 'lucide-vue-next'
import CastControl from '@/components/cast/CastControl.vue'
import ChannelChip from '@/components/layout/ChannelChip.vue'
import ToastHost from '@/components/ui/feedback/ToastHost.vue'
import ChannelInput from '@/components/ui/forms/ChannelInput.vue'
import IconButton from '@/components/ui/forms/IconButton.vue'
import { useAutoHideBar } from '@/composables/ui/useAutoHideBar'
import { useHelpOverlay } from '@/composables/ui/useHelpOverlay'
import { useToast } from '@/composables/ui/useToast'
import { MAX_CHANNELS } from '@/domain/channel'
import { useStreamsStore, type AddResult } from '@/stores/streams'
import type { StripMode } from '@/types/Stream'

const store = useStreamsStore()
const { visible, pinned, onEnter, onLeave, onFocusIn, onFocusOut, reveal, togglePin } = useAutoHideBar()
const { visible: helpVisible, toggle: toggleHelp } = useHelpOverlay()
const toast = useToast()
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(document.documentElement)
const input = ref<InstanceType<typeof ChannelInput> | null>(null)

const ADD_MESSAGES: Record<Exclude<AddResult, 'added'>, string> = {
  exists: 'Cette chaîne est déjà sur le mur',
  invalid: 'Nom de chaîne Twitch invalide',
  full: `Maximum ${MAX_CHANNELS} chaînes — retire-en une d'abord`,
}

const STRIP_LABELS: Record<StripMode, string> = {
  right: 'Miniatures des autres streams : à droite (puis à gauche)',
  left: 'Miniatures des autres streams : à gauche (puis masquées)',
  off: 'Miniatures des autres streams : masquées (puis à droite)',
}
const stripIcon = computed(() => (store.strip === 'left' ? PanelLeft : PanelRight))

function onSubmit(raw: string) {
  const result = store.add(raw)
  if (result === 'added') input.value?.clear()
  else toast.show(ADD_MESSAGES[result], 'warn')
}

function toggleMode() {
  if (store.focused) {
    store.unfocus()
    return
  }
  const target = store.audible[0] ?? store.channels[0]?.name
  if (target) store.focus(target)
}

function focusInput() {
  reveal()
  input.value?.focus()
}

defineExpose({ focusInput })
</script>

<template>
  <header
    class="topzone"
    :class="{ 'is-visible': visible, 'is-pinned': pinned }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <div class="bar">
      <div class="brand" aria-label="Zapette">
        <span class="brand__mark" aria-hidden="true">Z</span>
        <span class="brand__name wordmark">Zapette</span>
      </div>

      <ChannelInput ref="input" class="bar__input" @submit="onSubmit" />

      <div class="chips" role="list">
        <ChannelChip v-for="(channel, index) in store.channels" :key="channel.name" :channel="channel" :index="index" />
      </div>

      <span class="bar__count" :title="`${store.count} chaîne(s) sur ${MAX_CHANNELS}`">
        {{ store.count }}<span class="bar__count-max">/{{ MAX_CHANNELS }}</span>
      </span>

      <div class="bar__group">
        <IconButton
          :icon="store.focused ? LayoutGrid : Maximize2"
          :label="store.focused ? 'Revenir à la grille' : 'Focus sur un stream'"
          :kbd="store.focused ? 'Échap' : '1-9'"
          :disabled="store.count === 0"
          @press="toggleMode"
        />
        <IconButton
          :icon="stripIcon"
          :label="STRIP_LABELS[store.strip]"
          kbd="S"
          :active="store.strip !== 'off' && store.focused !== null"
          :disabled="!store.focused"
          @press="store.cycleStrip"
        />
        <IconButton
          :icon="MessageSquare"
          label="Chat Twitch"
          kbd="C"
          :active="store.chat"
          :disabled="store.count === 0"
          @press="store.toggleChat"
        />
      </div>

      <div class="bar__group">
        <CastControl />
        <IconButton
          :icon="isFullscreen ? Minimize : Maximize"
          label="Plein écran navigateur"
          kbd="F"
          :active="isFullscreen"
          @press="toggleFullscreen"
        />
        <IconButton :icon="pinned ? PinOff : Pin" label="Épingler la barre" kbd="H" :active="pinned" @press="togglePin" />
        <IconButton :icon="Keyboard" label="Raccourcis et aide" kbd="?" :active="helpVisible" @press="toggleHelp" />
      </div>
    </div>
    <ToastHost />
    <!-- Zone de survol sous la barre masquée : opacité 0, donc ignorée par le test d'occlusion de Twitch -->
    <div class="topzone__hot" aria-hidden="true" />
  </header>
</template>

<style scoped>
/*
 * La barre ne recouvre JAMAIS un lecteur : un bandeau par-dessus une vidéo, même une fraction de
 * seconde, la fait mettre en pause par Twitch. Masquée, elle est entièrement hors écran ; seule une
 * zone de survol de 6 px à opacité 0 (ignorée par le test d'occlusion) dépasse en dessous, avec un
 * délai d'intention avant d'ouvrir. Visible,
 * le mur glisse de sa hauteur plus 2 px vers le bas, avec la même durée et la même courbe (voir
 * .stage.is-pushed) : à aucune image la barre ne mord sur la première rangée. Épinglée, elle prend
 * sa place dans le flux.
 */
.topzone {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  opacity: 0;
  transform: translateY(-100%);
  transition:
    transform 0.28s var(--ease-panel),
    opacity 0.2s;
}

.topzone.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.topzone.is-pinned {
  position: relative;
  opacity: 1;
  transform: none;
  transition: none;
}

/* Fine (6 px) : dans un bloc de miniatures collé en haut, elle chevauche la barre des tuiles du haut. */
.topzone__hot {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  height: 6px;
  opacity: 0;
}

.topzone.is-pinned .topzone__hot {
  display: none;
}

.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--bar-h);
  padding: 0 12px;
  background: var(--color-ink-900);
  border-bottom: 1px solid var(--color-ink-700);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: var(--color-ink-50);
  color: var(--color-ink-950);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 19px;
  line-height: 1;
}

.brand__name {
  font-size: 19px;
  color: var(--color-ink-50);
}

.bar__input {
  width: 300px;
  flex: 0 0 auto;
}

.chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.chips::-webkit-scrollbar {
  display: none;
}

.bar__count {
  flex: 0 0 auto;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.06em;
  color: var(--color-ink-200);
}

.bar__count-max {
  color: var(--color-ink-400);
}

.bar__group {
  display: flex;
  gap: 4px;
  flex: 0 0 auto;
}

.bar__group + .bar__group {
  padding-left: 10px;
  border-left: 1px solid var(--color-ink-700);
}

@media (max-width: 1100px) {
  .brand__name {
    display: none;
  }

  .bar__input {
    width: 200px;
  }
}
</style>
