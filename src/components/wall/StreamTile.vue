<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Play, Volume2, VolumeX, X } from 'lucide-vue-next'
import IconButton from '@/components/ui/forms/IconButton.vue'
import { useCastState } from '@/composables/cast/useCastSender'
import { useTwitchPlayer, type PlayerStatus } from '@/composables/wall/useTwitchPlayer'
import { TILE_BAR, type TileRect } from '@/domain/layout'
import { useStreamsStore } from '@/stores/streams'
import type { StreamChannel } from '@/types/Stream'

interface Props {
  channel: StreamChannel
  index: number
  rect?: TileRect
  /** Boutons de la barre. Faux sur la TV. */
  interactive: boolean
  focused: boolean
  /** Miniature du bloc latéral (mode focus) : un clic sur la vidéo zappe dessus. */
  thumbnail: boolean
}

const props = defineProps<Props>()
const store = useStreamsStore()
const host = ref<HTMLElement | null>(null)

const rect = computed<TileRect>(() => props.rect ?? { x: 0, y: 0, w: 0, h: 0, hidden: true })
/** Pas encore mesurée, ou rangée derrière le stream en focus (colonne repliée). */
const hidden = computed(() => rect.value.hidden === true || rect.value.w < 1)
const style = computed(() => ({
  transform: `translate(${rect.value.x}px, ${rect.value.y}px)`,
  width: `${rect.value.w}px`,
  height: `${rect.value.h}px`,
  '--tile-bar': `${TILE_BAR}px`,
}))

/** Pendant une diffusion vers la TV, le son joue là-bas : les lecteurs locaux restent affichés mais muets. */
const castState = useCastState()

const { status, blocked, unblock, resume } = useTwitchPlayer(host, {
  channel: props.channel.name,
  muted: () => props.channel.muted || castState.value === 'connected',
  hidden,
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
const statusLabel = computed(() => STATUS_LABEL[status.value])
const focusLabel = computed(() => {
  if (props.focused) return 'Revenir à la grille'
  return props.thumbnail ? 'Zapper sur ce stream' : 'Focus : plein cadre, les autres en sourdine'
})
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

    <!-- Miniature : zone de clic invisible sur la vidéo (opacité 0, donc ignorée par le test d'occlusion de Twitch) -->
    <button
      v-if="interactive && thumbnail"
      type="button"
      class="tile__hit"
      :title="`Zapper sur ${channel.name} (${index + 1})`"
      @click="store.focus(channel.name)"
    />

    <!-- Barre sous la vidéo, jamais dessus : nom, état, et au survol les boutons -->
    <div class="tile__bar">
      <span class="tile__idx">{{ index + 1 }}</span>
      <span class="tile__name">{{ channel.name }}</span>
      <button
        v-if="interactive && status === 'paused'"
        type="button"
        class="tile__resume"
        title="Twitch a mis ce stream en pause : reprendre la lecture"
        @click="resume"
      >
        <Play class="tile__resume-icon" aria-hidden="true" />
        Reprendre
      </button>
      <span v-else class="tile__status" :class="`is-${status}`">{{ statusLabel }}</span>
      <span class="tile__spacer" />
      <div v-if="interactive" class="tile__actions">
        <IconButton
          :icon="channel.muted ? VolumeX : Volume2"
          :label="channel.muted ? 'Activer le son' : 'Couper le son'"
          :active="!channel.muted"
          size="xs"
          @press="store.toggleMute(channel.name)"
        />
        <IconButton
          :icon="focused ? Minimize2 : Maximize2"
          :label="focusLabel"
          :kbd="String(index + 1)"
          size="xs"
          @press="store.toggleFocus(channel.name)"
        />
        <IconButton
          v-if="!thumbnail && !focused"
          :icon="ChevronLeft"
          label="Déplacer avant"
          size="xs"
          :disabled="index === 0"
          @press="store.move(channel.name, -1)"
        />
        <IconButton
          v-if="!thumbnail && !focused"
          :icon="ChevronRight"
          label="Déplacer après"
          size="xs"
          :disabled="index === store.count - 1"
          @press="store.move(channel.name, 1)"
        />
        <IconButton :icon="X" label="Retirer du mur" size="xs" danger @press="store.remove(channel.name)" />
      </div>
    </div>

    <button v-if="interactive && blocked && !channel.muted" type="button" class="tile__unblock" @click="unblock">
      <Volume2 class="tile__unblock-icon" aria-hidden="true" />
      Activer le son
    </button>
  </article>
</template>

<style scoped>
/*
 * Règle d'or : rien ne recouvre le lecteur, jamais, et aucun effet visuel sur ses ancêtres. Le
 * lecteur Twitch surveille son iframe (IntersectionObserver v2) : un élément qui la chevauche —
 * même un bandeau semi-transparent révélé au survol — met le stream en pause au bout d'une
 * seconde, sans reprise. Seule l'opacité 0 est ignorée. D'où : tout ce qui est permanent ou
 * survolable vit dans la barre SOUS la vidéo, le liseré son est un outline (hors test d'occlusion),
 * et la zone de clic des miniatures reste à opacité 0.
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

/* ---------- Miniature : zone de clic ---------- */
.tile__hit {
  position: absolute;
  inset: 0 0 var(--tile-bar) 0;
  border: 0;
  background: transparent;
  opacity: 0;
  cursor: pointer;
}

.tile--thumb:hover {
  outline: 2px solid var(--color-tally-500);
  outline-offset: -2px;
}

/* ---------- Barre sous la vidéo ---------- */
.tile__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 var(--tile-bar);
  height: var(--tile-bar);
  padding: 0 3px 0 6px;
  background: var(--color-ink-900);
  color: var(--color-ink-100);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
}

.tile__idx {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  background: var(--color-ink-700);
  color: var(--color-ink-50);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 12px;
}

.tile--audible .tile__idx {
  background: var(--color-tally-500);
  color: var(--color-ink-950);
}

.tile__name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile__status {
  flex: 0 0 auto;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-ink-400);
}

.tile__status.is-live {
  color: var(--color-live-500);
}

.tile__status.is-live::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-right: 4px;
  border-radius: 50%;
  background: currentColor;
  vertical-align: 1px;
}

.tile__resume {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  height: 18px;
  padding: 0 7px 0 5px;
  border: 1px solid var(--color-tally-600);
  background: transparent;
  color: var(--color-tally-400);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

.tile__resume:hover {
  background: var(--color-tally-500);
  color: var(--color-ink-950);
}

.tile__resume-icon {
  width: 11px;
  height: 11px;
}

.tile__spacer {
  flex: 1 1 auto;
}

/* Boutons discrets au repos, nets au survol de la tuile ou à la navigation clavier. */
.tile__actions {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 0 0 auto;
  opacity: 0;
  transition: opacity 0.15s;
}

.tile:hover .tile__actions,
.tile:has(:focus-visible) .tile__actions {
  opacity: 1;
}

/* ---------- Autoplay bloqué : un clic pour le son ---------- */
.tile__unblock {
  position: absolute;
  left: 50%;
  bottom: calc(var(--tile-bar) + 16%);
  translate: -50% 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid var(--color-tally-500);
  background: rgba(8, 8, 10, 0.86);
  color: var(--color-tally-400);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  animation: pulse-tally 1.6s ease-out infinite;
}

.tile__unblock:hover {
  background: var(--color-tally-500);
  color: var(--color-ink-950);
}

.tile__unblock-icon {
  width: 18px;
  height: 18px;
}
</style>
