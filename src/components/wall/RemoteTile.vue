<script setup lang="ts">
import { computed } from 'vue'
import { Maximize2, Minimize2, Volume2, VolumeX, X } from 'lucide-vue-next'
import IconButton from '@/components/ui/forms/IconButton.vue'
import { HIDDEN_RECT, type TileRect } from '@/domain/layout'
import { useStreamsStore } from '@/stores/streams'
import type { StreamChannel } from '@/types/Stream'

interface Props {
  channel: StreamChannel
  index: number
  rect?: TileRect
  focused: boolean
}

const props = defineProps<Props>()
const store = useStreamsStore()

const rect = computed(() => props.rect ?? HIDDEN_RECT)
const hidden = computed(() => rect.value.w < 1)
const small = computed(() => rect.value.w < 420)
const style = computed(() => ({
  transform: `translate(${rect.value.x}px, ${rect.value.y}px)`,
  width: `${rect.value.w}px`,
  height: `${rect.value.h}px`,
  '--i': String(props.index),
}))

const hint = computed(() => {
  if (props.focused) return 'En focus sur la TV'
  if (!props.channel.muted) return 'Son sur la TV'
  return 'Sur la TV'
})
</script>

<template>
  <article
    class="tile rtile"
    :class="{
      'tile--hidden': hidden,
      'rtile--small': small,
      'rtile--focused': focused,
      'rtile--audible': !channel.muted,
    }"
    :style="style"
  >
    <button
      type="button"
      class="rtile__main"
      :title="focused ? 'Revenir à la grille sur la TV' : `Focus ${channel.name} sur la TV`"
      @click="store.toggleFocus(channel.name)"
    >
      <span class="rtile__idx">{{ index + 1 }}</span>
      <span class="rtile__name">{{ channel.name }}</span>
      <span class="label-cond rtile__hint">{{ hint }}</span>
    </button>
    <div class="rtile__actions">
      <IconButton
        :icon="channel.muted ? VolumeX : Volume2"
        :label="channel.muted ? 'Activer le son sur la TV' : 'Couper le son sur la TV'"
        :active="!channel.muted"
        size="sm"
        @press="store.toggleMute(channel.name)"
      />
      <IconButton
        :icon="focused ? Minimize2 : Maximize2"
        :label="focused ? 'Revenir à la grille' : 'Focus sur la TV'"
        size="sm"
        @press="store.toggleFocus(channel.name)"
      />
      <IconButton :icon="X" label="Retirer du mur" size="sm" danger @press="store.remove(channel.name)" />
    </div>
  </article>
</template>

<style scoped>
.tile {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  will-change: transform;
}

.tile:not(.tile--hidden) {
  animation: tile-in 0.45s var(--ease-panel) both;
  animation-delay: calc(var(--i, 0) * 45ms);
}

.tile--hidden {
  visibility: hidden;
}

.rtile {
  border: 1px solid var(--color-ink-700);
  background:
    repeating-linear-gradient(-45deg, transparent 0 14px, rgba(255, 255, 255, 0.025) 14px 16px),
    var(--color-ink-900);
  transition: border-color 0.15s;
}

.rtile--focused {
  border-color: var(--color-tally-500);
}

.rtile--audible::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 0 2px var(--color-tally-500);
}

.rtile__main {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: var(--color-ink-50);
  cursor: pointer;
}

.rtile__main:hover {
  background: rgba(255, 176, 32, 0.06);
}

.rtile__idx {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(28px, 12cqw, 72px);
  line-height: 1;
  color: var(--color-ink-500);
}

.rtile--focused .rtile__idx,
.rtile--audible .rtile__idx {
  color: var(--color-tally-500);
}

.rtile__name {
  font-family: var(--font-mono);
  font-size: clamp(13px, 4cqw, 22px);
}

.rtile--small .rtile__hint {
  display: none;
}

.rtile__actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
}
</style>
