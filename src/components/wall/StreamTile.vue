<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Volume2, VolumeX, X } from 'lucide-vue-next'
import IconButton from '@/components/ui/forms/IconButton.vue'
import { useTwitchPlayer, type PlayerStatus } from '@/composables/wall/useTwitchPlayer'
import { meetsPlayerMinimum, TILE_CAPTION, type TileRect } from '@/domain/layout'
import { useStreamsStore } from '@/stores/streams'
import type { StreamChannel } from '@/types/Stream'

interface Props {
  channel: StreamChannel
  index: number
  rect?: TileRect
  /** Boutons de la barre. Faux sur la TV. */
  interactive: boolean
  focused: boolean
  /** Miniature de la colonne (mode focus) : un clic sur la vidéo zappe dessus. */
  thumbnail: boolean
}

const props = defineProps<Props>()
const store = useStreamsStore()
const host = ref<HTMLElement | null>(null)

const rect = computed<TileRect>(() => props.rect ?? { x: 0, y: 0, w: 0, h: 0, hidden: true })
/** Pas encore mesurée, ou rangée derrière le stream en focus. */
const hidden = computed(() => rect.value.hidden === true || rect.value.w < 1)
/** Visible et assez grande pour que Twitch accepte de lancer / relancer la lecture. */
const eligible = computed(() => !hidden.value && meetsPlayerMinimum(rect.value))
const style = computed(() => ({
  transform: `translate(${rect.value.x}px, ${rect.value.y}px)`,
  width: `${rect.value.w}px`,
  height: `${rect.value.h}px`,
}))

const { status, blocked, unblock } = useTwitchPlayer(host, {
  channel: props.channel.name,
  muted: () => props.channel.muted,
  hidden,
  eligible,
  width: () => rect.value.w,
  // Sur la TV (non interactif) le son part tout seul ; sur le PC on attend le premier geste.
  eagerAudio: !props.interactive,
})

const STATUS_LABEL: Record<PlayerStatus, string> = {
  loading: '…',
  live: 'Live',
  offline: 'Hors ligne',
  paused: 'Pause',
  error: 'Erreur',
}
const statusLabel = computed(() => (eligible.value || hidden.value ? STATUS_LABEL[status.value] : 'Trop petit'))
const soundBlocked = computed(() => blocked.value && !props.channel.muted)

function onAudio() {
  if (soundBlocked.value) unblock()
  else store.toggleMute(props.channel.name)
}
</script>

<template>
  <article
    class="tile"
    :class="{
      'tile--hidden': hidden,
      'tile--thumb': thumbnail,
      'tile--focused': focused,
      'tile--audible': !channel.muted,
    }"
    :style="style"
    :aria-label="`Stream ${channel.name}`"
  >
    <div ref="host" class="tile__player" />

    <!-- Miniature : zone de clic invisible (opacité 0 → ignorée par le test d'occlusion de Twitch) -->
    <button
      v-if="interactive && thumbnail"
      type="button"
      class="tile__hit"
      :style="{ bottom: `${TILE_CAPTION}px` }"
      :title="`Zapper sur ${channel.name} (${index + 1})`"
      @click="store.focus(channel.name)"
    />

    <!-- Barre de contrôle sous la vidéo : rien ne doit recouvrir un lecteur Twitch -->
    <div class="tile__bar" :style="{ height: `${TILE_CAPTION}px` }">
      <span class="tile__idx">{{ index + 1 }}</span>
      <span class="tile__name">{{ channel.name }}</span>
      <span class="tile__status" :class="`tile__status--${status}`">{{ statusLabel }}</span>
      <span class="tile__spacer" />
      <template v-if="interactive">
        <IconButton
          :icon="channel.muted ? VolumeX : Volume2"
          :label="soundBlocked ? 'Activer le son (bloqué par le navigateur)' : channel.muted ? 'Activer le son' : 'Couper le son'"
          :active="!channel.muted"
          :class="{ 'is-blocked': soundBlocked }"
          size="xs"
          @press="onAudio"
        />
        <IconButton
          :icon="focused ? Minimize2 : Maximize2"
          :label="focused ? 'Revenir à la grille' : 'Focus : plein cadre, les autres en sourdine'"
          :kbd="String(index + 1)"
          size="xs"
          @press="store.toggleFocus(channel.name)"
        />
        <IconButton
          v-if="!focused && !thumbnail"
          :icon="ChevronLeft"
          label="Déplacer avant"
          size="xs"
          :disabled="index === 0"
          @press="store.move(channel.name, -1)"
        />
        <IconButton
          v-if="!focused && !thumbnail"
          :icon="ChevronRight"
          label="Déplacer après"
          size="xs"
          :disabled="index === store.count - 1"
          @press="store.move(channel.name, 1)"
        />
        <IconButton :icon="X" label="Retirer du mur" size="xs" danger @press="store.remove(channel.name)" />
      </template>
    </div>
  </article>
</template>

<style scoped>
/*
 * Règle d'or : rien ne recouvre la vidéo et aucun effet visuel sur ses ancêtres. Le lecteur Twitch
 * refuse l'autoplay et met en pause dès qu'un élément — même transparent — chevauche l'iframe, ou
 * qu'un ancêtre porte opacité < 1, filtre, clip-path. Ce qui doit se superposer (zone de clic des
 * miniatures) reste à opacité 0 ; les contrôles vivent dans une barre sous la vidéo ; le liseré du
 * son est un outline. Aucune transition : une tuile en mouvement en recouvrirait une autre.
 */
.tile {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #000;
}

/* Rangée derrière le stream en focus : même rect, dessous, inerte. */
.tile--hidden {
  pointer-events: none;
  z-index: 0;
}

.tile--focused {
  z-index: 1;
}

.tile__player {
  flex: 1 1 auto;
  min-height: 0;
}

.tile__player :deep(iframe) {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

/* Tally : liseré ambre sur ce qu'on entend — un outline ne participe pas au test d'occlusion. */
.tile--audible {
  outline: 2px solid var(--color-tally-500);
  outline-offset: -2px;
}

.tile__hit {
  position: absolute;
  inset: 0;
  border: 0;
  background: transparent;
  opacity: 0;
  cursor: pointer;
}

.tile--thumb:hover {
  outline: 2px solid var(--color-tally-400);
  outline-offset: -2px;
}

/* ---------- Barre de contrôle ---------- */
.tile__bar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  padding: 0 3px 0 6px;
  background: var(--color-ink-900);
  color: var(--color-ink-100);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.tile__idx {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  color: var(--color-tally-500);
}

.tile__name {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
}

.tile__status {
  flex: 0 0 auto;
  padding-left: 4px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-ink-400);
}

.tile__status--live {
  color: var(--color-live-500);
}

.tile__spacer {
  flex: 1 1 auto;
}

.tile__bar :deep(.is-blocked) {
  border-color: var(--color-tally-500);
  color: var(--color-tally-400);
  animation: pulse-tally 1.4s ease-out infinite;
}
</style>
