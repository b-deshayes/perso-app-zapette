<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import IconButton from '@/components/ui/forms/IconButton.vue'
import { chatEmbedUrl } from '@/services/twitch-embed.service'
import { useStreamsStore } from '@/stores/streams'

interface Props {
  channel: string
}

const props = defineProps<Props>()
const store = useStreamsStore()
const src = computed(() => chatEmbedUrl(props.channel))
</script>

<template>
  <aside class="chat">
    <header class="chat__head">
      <span class="label-cond">Chat</span>
      <span class="chat__name">{{ channel }}</span>
      <span class="chat__spacer" />
      <IconButton :icon="X" label="Fermer le chat" kbd="C" size="sm" @press="store.toggleChat" />
    </header>
    <iframe :src="src" class="chat__frame" :title="`Chat Twitch de ${channel}`" />
  </aside>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  width: 340px;
  border-left: 1px solid var(--color-ink-700);
  background: var(--color-ink-900);
  animation: rise-in 0.3s var(--ease-panel) both;
}

.chat__head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 6px 0 12px;
  border-bottom: 1px solid var(--color-ink-700);
}

.chat__name {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-ink-50);
}

.chat__spacer {
  flex: 1;
}

.chat__frame {
  flex: 1;
  width: 100%;
  border: 0;
  background: var(--color-ink-950);
}

@media (max-width: 900px) {
  .chat {
    width: 260px;
  }
}
</style>
