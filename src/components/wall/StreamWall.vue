<script setup lang="ts">
import { computed, ref } from 'vue'
import EmptyWall from '@/components/wall/EmptyWall.vue'
import StreamTile from '@/components/wall/StreamTile.vue'
import { useWallLayout } from '@/composables/wall/useWallLayout'
import { useStreamsStore } from '@/stores/streams'
import type { StreamChannel } from '@/types/Stream'

interface Props {
  /** Interface (survol, boutons, état vide). Faux sur la TV. */
  interactive: boolean
}

interface Tile {
  channel: StreamChannel
  index: number
}

const props = defineProps<Props>()
const store = useStreamsStore()
const container = ref<HTMLElement | null>(null)

/**
 * Sur la TV, le mode focus n'affiche que le stream en focus, plein cadre : un seul lecteur au lieu
 * de douze (la page de la TV est rendue par le PC), et rien qui bouge autour. En grille, la TV
 * montre le mur tel quel.
 */
const solo = computed(() => !props.interactive && store.focused !== null)
const tiles = computed<Tile[]>(() => {
  const all = store.channels.map((channel, index) => ({ channel, index }))
  return solo.value ? all.filter((t) => t.channel.name === store.focused) : all
})
const { rects } = useWallLayout(container, { solo })
</script>

<template>
  <section ref="container" class="wall">
    <StreamTile
      v-for="(tile, slot) in tiles"
      :key="tile.channel.name"
      :channel="tile.channel"
      :index="tile.index"
      :rect="rects[slot]"
      :interactive="interactive"
      :focused="store.focused === tile.channel.name"
      :thumbnail="!solo && store.focused !== null && store.focused !== tile.channel.name"
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
