<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useStreamsStore } from '@/stores/streams'
import type { StreamChannel } from '@/types/Stream'

interface Props {
  channel: StreamChannel
  index: number
}

defineProps<Props>()
const store = useStreamsStore()
</script>

<template>
  <div
    class="chip"
    :class="{ 'is-focused': store.focused === channel.name, 'is-audible': !channel.muted }"
    role="listitem"
  >
    <button
      type="button"
      class="chip__main"
      :title="`${store.focused === channel.name ? 'Retour à la grille' : `Focus ${channel.name}`} (${index + 1})`"
      @click="store.toggleFocus(channel.name)"
    >
      <span class="chip__idx">{{ index + 1 }}</span>
      <span class="chip__name">{{ channel.name }}</span>
      <span class="chip__dot" aria-hidden="true" />
    </button>
    <button
      type="button"
      class="chip__remove"
      :aria-label="`Retirer ${channel.name}`"
      :title="`Retirer ${channel.name}`"
      @click.stop="store.remove(channel.name)"
    >
      <X class="chip__x" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: stretch;
  height: 28px;
  border: 1px solid var(--color-ink-700);
  background: var(--color-ink-800);
  color: var(--color-ink-200);
  white-space: nowrap;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.chip:hover {
  border-color: var(--color-ink-500);
  color: var(--color-ink-50);
}

.chip.is-focused {
  border-color: var(--color-tally-500);
  color: var(--color-ink-50);
}

.chip__main {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 8px 0 6px;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.chip__idx {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  color: var(--color-ink-400);
}

.chip.is-focused .chip__idx {
  color: var(--color-tally-500);
}

.chip__name {
  font-family: var(--font-mono);
  font-size: 12px;
}

.chip__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-ink-600);
  transition:
    background 0.15s,
    box-shadow 0.15s;
}

.chip.is-audible .chip__dot {
  background: var(--color-tally-500);
  box-shadow: 0 0 8px var(--color-tally-500);
}

.chip__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  border: 0;
  border-left: 1px solid var(--color-ink-700);
  background: transparent;
  color: var(--color-ink-400);
  cursor: pointer;
}

.chip__remove:hover {
  background: var(--color-live-600);
  color: var(--color-ink-50);
}

.chip__x {
  width: 12px;
  height: 12px;
}
</style>
