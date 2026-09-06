<script setup lang="ts">
import { ref } from 'vue'
import EmptyWall from '@/components/wall/EmptyWall.vue'
import StreamTile from '@/components/wall/StreamTile.vue'
import { useWallLayout } from '@/composables/wall/useWallLayout'
import { useStreamsStore } from '@/stores/streams'

interface Props {
  /** Interface (survol, boutons, état vide). Faux sur la TV. */
  interactive: boolean
}

defineProps<Props>()
const store = useStreamsStore()
const container = ref<HTMLElement | null>(null)
const { rects, ready } = useWallLayout(container)
</script>

<template>
  <section ref="container" class="wall" :class="{ 'is-ready': ready }">
    <StreamTile
      v-for="(channel, index) in store.channels"
      :key="channel.name"
      :channel="channel"
      :index="index"
      :rect="rects[index]"
      :interactive="interactive"
      :focused="store.focused === channel.name"
      :thumbnail="store.focused !== null && store.focused !== channel.name"
    />
    <EmptyWall v-if="interactive && store.count === 0" />
  </section>
</template>

<style scoped>
.wall {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* Les tuiles ne glissent qu'une fois la première mesure faite (sinon elles partiraient de 0×0). */
.wall.is-ready :deep(.tile) {
  transition:
    transform 0.32s var(--ease-panel),
    width 0.32s var(--ease-panel),
    height 0.32s var(--ease-panel);
}
</style>
