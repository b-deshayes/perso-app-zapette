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
const { rects } = useWallLayout(container)
</script>

<template>
  <section ref="container" class="wall">
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
/*
 * Les tuiles changent de place d'un coup, sans glissement : pendant une transition elles se
 * chevaucheraient quelques images, et le lecteur Twitch met en pause tout stream qu'une autre
 * tuile recouvre, même un instant.
 */
.wall {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
