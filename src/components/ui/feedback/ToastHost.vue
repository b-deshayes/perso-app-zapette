<script setup lang="ts">
import { useToast } from '@/composables/ui/useToast'

const { toast, dismiss } = useToast()
</script>

<template>
  <!-- Dans la barre du haut, par-dessus les pastilles : jamais sur le mur de streams. -->
  <div class="toasts" aria-live="polite">
    <Transition name="toast">
      <button v-if="toast" :key="toast.id" type="button" class="toast" :class="`toast--${toast.kind}`" @click="dismiss">
        {{ toast.message }}
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.toasts {
  position: absolute;
  inset: 0 0 auto 0;
  height: var(--bar-h);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  max-width: min(70vw, 640px);
  padding: 6px 14px;
  border: 1px solid var(--color-ink-500);
  background: var(--color-ink-800);
  color: var(--color-ink-50);
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
}

.toast--warn {
  border-color: var(--color-tally-600);
  border-left: 3px solid var(--color-tally-500);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s,
    translate 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  translate: 0 -6px;
}
</style>
