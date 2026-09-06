<script setup lang="ts">
import { ref } from 'vue'
import EmptyWall from '@/components/wall/EmptyWall.vue'
import RemoteTile from '@/components/wall/RemoteTile.vue'
import StreamCard from '@/components/wall/StreamCard.vue'
import StreamTile from '@/components/wall/StreamTile.vue'
import { useWallLayout } from '@/composables/wall/useWallLayout'
import { useStreamsStore } from '@/stores/streams'

interface Props {
  /** Interface (boutons, état vide). Faux sur la TV. */
  interactive: boolean
  /** Le mur est diffusé sur la TV : cartes de télécommande à la place des lecteurs. */
  remote: boolean
}

defineProps<Props>()
const store = useStreamsStore()
const container = ref<HTMLElement | null>(null)
const { rects, cards } = useWallLayout(container)
</script>

<template>
  <section ref="container" class="wall" :class="{ 'wall--remote': remote }">
    <template v-for="(channel, index) in store.channels" :key="channel.name">
      <RemoteTile
        v-if="remote"
        :channel="channel"
        :index="index"
        :rect="rects[index]"
        :focused="store.focused === channel.name"
      />
      <StreamTile
        v-else
        :channel="channel"
        :index="index"
        :rect="rects[index]"
        :interactive="interactive"
        :focused="store.focused === channel.name"
        :thumbnail="store.focused !== null && store.focused !== channel.name"
      />
    </template>
    <template v-for="card in cards" :key="`card-${card.index}`">
      <StreamCard
        v-if="store.channels[card.index]"
        :channel="store.channels[card.index]!"
        :rect="card"
        :interactive="interactive || remote"
      />
    </template>
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
</style>
