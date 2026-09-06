<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useFullscreen } from '@vueuse/core'
import TopBar from '@/components/layout/TopBar.vue'
import HelpOverlay from '@/components/ui/feedback/HelpOverlay.vue'
import ToastHost from '@/components/ui/feedback/ToastHost.vue'
import ChatPanel from '@/components/wall/ChatPanel.vue'
import ReceiverIdle from '@/components/wall/ReceiverIdle.vue'
import StreamWall from '@/components/wall/StreamWall.vue'
import { useCastReceiver } from '@/composables/cast/useCastReceiver'
import { useCastSender } from '@/composables/cast/useCastSender'
import { useKeyboardShortcuts } from '@/composables/ui/useKeyboardShortcuts'
import { useWallPersistence } from '@/composables/wall/useWallPersistence'
import { isReceiverMode } from '@/domain/url-state'
import { useStreamsStore } from '@/stores/streams'

const store = useStreamsStore()
/** `?receiver=1` : la page tourne sur la TV, sans interface, pilotée par le PC. */
const receiver = isReceiverMode(new URLSearchParams(window.location.search))
const topBar = ref<InstanceType<typeof TopBar> | null>(null)
const { toggle: toggleFullscreen } = useFullscreen(document.documentElement)

if (receiver) {
  useCastReceiver()
} else {
  // Diffusion vers la TV : les streams restent affichés ici (son coupé localement, il joue sur la TV).
  useCastSender()
  useWallPersistence()
  useKeyboardShortcuts({
    toggleFullscreen: () => {
      void toggleFullscreen()
    },
    focusAddInput: () => topBar.value?.focusInput(),
  })
}

watchEffect(() => {
  if (receiver) return
  document.title =
    store.count > 0 ? `Zapette · ${store.channels.map((c) => c.name).join(' · ')}` : 'Zapette — multistream Twitch'
})
</script>

<template>
  <div class="app" :class="{ 'app--receiver': receiver }">
    <template v-if="receiver">
      <StreamWall :interactive="false" />
      <ReceiverIdle v-if="store.count === 0" />
    </template>

    <template v-else>
      <TopBar ref="topBar" />
      <main class="stage">
        <StreamWall :interactive="true" />
        <ChatPanel v-if="store.chat && store.chatChannel" :channel="store.chatChannel" />
      </main>
      <HelpOverlay />
      <ToastHost />
    </template>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}

.app--receiver {
  cursor: none;
}
</style>
