<script setup lang="ts">
import { useToast } from '@/composables/ui/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <button
        v-for="toast in toasts"
        :key="toast.id"
        type="button"
        class="toast"
        :class="`toast--${toast.kind}`"
        @click="dismiss(toast.id)"
      >
        {{ toast.message }}
      </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* En haut à droite, sur la barre : un toast posé sur une vidéo mettrait le lecteur Twitch en pause. */
.toasts {
  position: fixed;
  top: 5px;
  right: 12px;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  max-width: min(70vw, 560px);
  padding: 6px 12px;
  border: 1px solid var(--color-ink-600);
  background: color-mix(in srgb, var(--color-ink-900) 92%, transparent);
  color: var(--color-ink-50);
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
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
  translate: 0 8px;
}
</style>
