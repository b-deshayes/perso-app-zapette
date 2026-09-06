<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, Eye, Flame, Maximize2, Minimize2, Play, Volume2, VolumeX, X } from 'lucide-vue-next'
import IconButton from '@/components/ui/forms/IconButton.vue'
import { useCastState } from '@/composables/cast/useCastSender'
import { useTwitchPlayer, type PlayerStatus } from '@/composables/wall/useTwitchPlayer'
import { useViewerCounts } from '@/composables/wall/useViewerCounts'
import { TILE_BAR, type TileRect } from '@/domain/layout'
import { formatDelta, formatViewers } from '@/domain/viewers'
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
/** Miniature cliquable : l'iframe ne reçoit plus la souris, le clic tombe sur le conteneur (sous elle). */
const zappable = computed(() => props.interactive && props.thumbnail)

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

/** Spectateurs (Twitch, toutes les 30 s), variation sur 15 min et pic en cours. */
const { trendFor, infoFor } = useViewerCounts()
const trend = computed(() => trendFor(props.channel.name))
const streamTitle = computed(() => {
  const info = infoFor(props.channel.name)
  if (!info?.title) return undefined
  return info.game ? `${info.title} — ${info.game}` : info.title
})
const viewersTitle = computed(() =>
  trend.value.viewers === null ? undefined : `${trend.value.viewers.toLocaleString('fr-FR')} spectateurs`,
)
const deltaTitle = computed(() =>
  trend.value.hot ? 'Pic de spectateurs par rapport aux 15 dernières minutes' : 'Variation sur les 15 dernières minutes',
)

function onPlayerClick() {
  if (zappable.value) store.focus(props.channel.name)
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
      'tile--hot': trend.hot,
    }"
    :style="style"
    :aria-label="`Stream ${channel.name}`"
  >
    <!-- Barre AU-DESSUS de la vidéo, jamais dessus : nom, état, spectateurs, et au survol les boutons -->
    <div class="tile__bar">
      <span class="tile__idx">{{ index + 1 }}</span>
      <span class="tile__name" :title="streamTitle">{{ channel.name }}</span>
      <span v-if="trend.viewers !== null" class="tile__viewers" :title="viewersTitle">
        <Eye class="tile__viewers-icon" aria-hidden="true" />{{ formatViewers(trend.viewers) }}
      </span>
      <span
        v-if="trend.delta !== null"
        class="tile__delta"
        :class="{ 'is-hot': trend.hot, 'is-up': trend.delta > 0.02, 'is-down': trend.delta < -0.02 }"
        :title="deltaTitle"
      >
        <Flame v-if="trend.hot" class="tile__delta-icon" aria-hidden="true" />{{ formatDelta(trend.delta) }}
      </span>
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

    <!-- Rien n'est jamais posé sur le lecteur : une miniature se zappe en cliquant ici, sous l'iframe -->
    <div
      ref="host"
      class="tile__player"
      :class="{ 'tile__player--zap': zappable }"
      :title="zappable ? `Zapper sur ${channel.name} (${index + 1})` : undefined"
      @click="onPlayerClick"
    />

    <button v-if="interactive && blocked && !channel.muted" type="button" class="tile__unblock" @click="unblock">
      <Volume2 class="tile__unblock-icon" aria-hidden="true" />
      Activer le son
    </button>
  </article>
</template>

<style scoped>
/*
 * Règle d'or : rien ne recouvre le lecteur, jamais, même une image, et aucun effet visuel sur ses
 * ancêtres. Le lecteur Twitch surveille son iframe (IntersectionObserver v2) : un élément qui la
 * chevauche — même un bandeau semi-transparent, même pendant une animation — met le stream en
 * pause, sans reprise. D'où : tout ce qui est permanent ou survolable vit dans la barre AU-DESSUS
 * de la vidéo, le liseré son est un outline (hors test d'occlusion), les miniatures se cliquent via
 * le conteneur sous l'iframe (pointer-events: none dessus), et aucune transition sur les tuiles.
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

/* Miniature : la souris ne va plus au lecteur (pas de contrôles Twitch, pas de pause par clic) */
.tile__player--zap {
  cursor: pointer;
}

.tile__player--zap :deep(iframe) {
  pointer-events: none;
}

/* Tally : liseré ambre sur ce qu'on entend — un outline ne participe pas au test d'occlusion. */
.tile--audible {
  outline: 2px solid var(--color-tally-500);
  outline-offset: -2px;
}

.tile--thumb:hover {
  outline: 2px solid var(--color-tally-500);
  outline-offset: -2px;
}

/* ---------- Barre au-dessus de la vidéo ---------- */
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

/* ---------- Spectateurs et pic ---------- */
.tile__viewers {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: 0 0 auto;
  color: var(--color-ink-200);
}

.tile__viewers-icon {
  width: 11px;
  height: 11px;
  color: var(--color-ink-400);
}

.tile__delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--color-ink-400);
}

.tile__delta.is-up {
  color: var(--color-ink-200);
}

.tile__delta.is-down {
  color: var(--color-ink-500);
}

.tile__delta.is-hot {
  color: var(--color-tally-400);
  font-weight: 700;
}

.tile__delta-icon {
  width: 12px;
  height: 12px;
  animation: hot-blink 1.2s ease-in-out infinite;
}

/* Pic en cours : la barre vire à l'ambre (fond seulement, aucun débordement sur la vidéo). */
.tile--hot .tile__bar {
  background: color-mix(in srgb, var(--color-tally-500) 26%, var(--color-ink-900));
}

.tile--hot .tile__idx {
  background: var(--color-tally-500);
  color: var(--color-ink-950);
}

@keyframes hot-blink {
  50% {
    opacity: 0.35;
  }
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

/* Au survol, l'état et la variation laissent la place aux boutons (les miniatures sont étroites). */
.tile:hover .tile__status,
.tile:hover .tile__delta {
  display: none;
}

/* ---------- Autoplay bloqué : un clic pour le son (le lecteur ne joue pas, rien à occulter) ---------- */
.tile__unblock {
  position: absolute;
  left: 50%;
  bottom: 16%;
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
