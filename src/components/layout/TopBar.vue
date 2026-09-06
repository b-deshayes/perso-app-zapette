<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
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
} from 'lucide-vue-next'
import CastControl from '@/components/cast/CastControl.vue'
import ChannelChip from '@/components/layout/ChannelChip.vue'
import ChannelInput from '@/components/ui/forms/ChannelInput.vue'
import IconButton from '@/components/ui/forms/IconButton.vue'
import { useBarVisibility } from '@/composables/ui/useBarVisibility'
import { useHelpOverlay } from '@/composables/ui/useHelpOverlay'
import { useToast } from '@/composables/ui/useToast'
import { useWallWarnings } from '@/composables/wall/useWallLayout'
import { MAX_CHANNELS } from '@/domain/channel'
import { MIN_PLAYER_H, MIN_PLAYER_W } from '@/domain/layout'
import { useStreamsStore, type AddResult } from '@/stores/streams'
import type { StripMode } from '@/types/Stream'

const store = useStreamsStore()
const { visible, show } = useBarVisibility()
const { visible: helpVisible, toggle: toggleHelp } = useHelpOverlay()
const { undersized } = useWallWarnings()
const toast = useToast()
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(document.documentElement)
const input = ref<InstanceType<typeof ChannelInput> | null>(null)

const ADD_MESSAGES: Record<Exclude<AddResult, 'added'>, string> = {
  exists: 'Cette chaîne est déjà sur le mur',
  invalid: 'Nom de chaîne Twitch invalide',
  full: `Maximum ${MAX_CHANNELS} chaînes — retire-en une d'abord`,
}

const STRIP_LABELS: Record<StripMode, string> = {
  right: 'Colonne des autres streams : à droite (puis à gauche)',
  left: 'Colonne des autres streams : à gauche (puis masquée)',
  off: 'Colonne des autres streams : masquée (puis à droite)',
}
const stripIcon = computed(() => (store.strip === 'left' ? PanelLeft : PanelRight))

const countTitle = computed(() =>
  undersized.value
    ? `Trop de chaînes pour la fenêtre : Twitch ne lance pas un lecteur plus petit que ${MIN_PLAYER_W}×${MIN_PLAYER_H} px. Retire des chaînes, agrandis la fenêtre ou passe en focus.`
    : `${store.count} chaîne(s) sur ${MAX_CHANNELS}`,
)

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

async function focusInput() {
  show()
  await nextTick()
  input.value?.focus()
}

defineExpose({ focusInput })
</script>

<template>
  <!-- Dans le flux, jamais par-dessus le mur : un élément qui recouvre un lecteur Twitch le met en pause. -->
  <header v-show="visible" class="bar">
    <div class="brand" aria-label="Zapette">
      <span class="brand__mark" aria-hidden="true">Z</span>
      <span class="brand__name wordmark">Zapette</span>
    </div>

    <ChannelInput ref="input" class="bar__input" @submit="onSubmit" />

    <div class="chips" role="list">
      <ChannelChip v-for="(channel, index) in store.channels" :key="channel.name" :channel="channel" :index="index" />
    </div>

    <span class="bar__count" :class="{ 'is-warn': undersized }" :title="countTitle">
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
      <IconButton :icon="Keyboard" label="Raccourcis et aide (H masque cette barre)" kbd="?" :active="helpVisible" @press="toggleHelp" />
    </div>
  </header>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  height: 40px;
  padding: 0 10px;
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
  width: 24px;
  height: 24px;
  background: var(--color-ink-50);
  color: var(--color-ink-950);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  line-height: 1;
}

.brand__name {
  font-size: 18px;
  color: var(--color-ink-50);
}

.bar__input {
  width: 280px;
  flex: 0 0 auto;
  height: 30px;
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

.bar__count.is-warn {
  padding: 0 6px;
  background: var(--color-tally-500);
  color: var(--color-ink-950);
}

.bar__count-max {
  color: var(--color-ink-400);
}

.bar__count.is-warn .bar__count-max {
  color: var(--color-ink-800);
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
    width: 190px;
  }
}
</style>
