<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import IconButton from '@/components/ui/forms/IconButton.vue'
import type { CardRect } from '@/domain/layout'
import { useStreamsStore } from '@/stores/streams'
import type { StreamChannel } from '@/types/Stream'

interface Props {
  channel: StreamChannel
  rect: CardRect
  interactive: boolean
}

const props = defineProps<Props>()
const store = useStreamsStore()

const style = computed(() => ({
  transform: `translate(${props.rect.x}px, ${props.rect.y}px)`,
  width: `${props.rect.w}px`,
  height: `${props.rect.h}px`,
}))
</script>

<template>
  <div class="card" :class="{ 'card--audible': !channel.muted }" :style="style">
    <button
      type="button"
      class="card__main"
      :disabled="!interactive"
      :title="`Zapper sur ${channel.name} (${rect.index + 1})`"
      @click="store.focus(channel.name)"
    >
      <span class="card__idx">{{ rect.index + 1 }}</span>
      <span class="card__name">{{ channel.name }}</span>
      <span class="label-cond card__hint">En attente</span>
    </button>
    <IconButton
      v-if="interactive"
      :icon="X"
      label="Retirer du mur"
      size="xs"
      danger
      @press="store.remove(channel.name)"
    />
  </div>
</template>

<style scoped>
/* Chaîne sans place live dans la colonne : son lecteur est rangé derrière le stream en focus. */
.card {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 3px 0 0;
  border: 1px solid var(--color-ink-700);
  background: var(--color-ink-900);
}

.card--audible {
  border-color: var(--color-tally-500);
}

.card__main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--color-ink-100);
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.card__main:disabled {
  cursor: default;
}

.card__main:hover:not(:disabled) {
  background: var(--color-ink-800);
}

.card__idx {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  color: var(--color-tally-500);
}

.card__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__hint {
  margin-left: auto;
  font-size: 10px;
}
</style>
