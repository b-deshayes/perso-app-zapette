<script setup lang="ts">
import ChannelInput from '@/components/ui/forms/ChannelInput.vue'
import { useToast } from '@/composables/ui/useToast'
import { DEFAULT_CHANNELS, defaultSnapshot } from '@/domain/defaults'
import { useStreamsStore } from '@/stores/streams'

const store = useStreamsStore()
const toast = useToast()

function onSubmit(raw: string) {
  const result = store.add(raw)
  if (result === 'invalid') toast.show('Nom de chaîne Twitch invalide', 'warn')
}

function restoreDefaults() {
  store.hydrate(defaultSnapshot())
}
</script>

<template>
  <div class="empty">
    <div class="empty__inner">
      <span class="label-cond empty__kicker">Régie multistream · Twitch</span>
      <h1 class="wordmark empty__title">Zapette</h1>
      <p class="empty__lead">
        Plusieurs streams sur une seule page. Un chiffre pour zapper, un bouton pour caster sur la TV.
      </p>
      <ChannelInput large autofocus placeholder="Nom de chaîne ou URL Twitch, puis Entrée" @submit="onSubmit" />
      <button type="button" class="empty__defaults" @click="restoreDefaults">
        Reprendre {{ DEFAULT_CHANNELS.join(' · ') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.empty__inner {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(560px, 100%);
  animation: rise-in 0.4s var(--ease-panel) both;
}

.empty__kicker {
  color: var(--color-tally-500);
}

.empty__title {
  margin: 0;
  font-size: clamp(64px, 14vw, 150px);
  color: var(--color-ink-50);
  -webkit-text-stroke: 1px var(--color-ink-50);
}

.empty__lead {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--color-ink-300);
}

.empty__defaults {
  align-self: flex-start;
  padding: 0;
  border: 0;
  border-bottom: 1px dashed var(--color-ink-500);
  background: transparent;
  color: var(--color-ink-300);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
}

.empty__defaults:hover {
  color: var(--color-tally-400);
  border-color: var(--color-tally-500);
}
</style>
