<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Volume2, VolumeX, X } from 'lucide-vue-next'
import IconButton from '@/components/ui/forms/IconButton.vue'
import { useTwitchPlayer, type PlayerStatus } from '@/composables/wall/useTwitchPlayer'
import type { TileRect } from '@/domain/layout'
import { useStreamsStore } from '@/stores/streams'
import type { StreamChannel } from '@/types/Stream'

interface Props {
  channel: StreamChannel
  index: number
  rect?: TileRect
  /** Survol, boutons. Faux sur la TV. */
  interactive: boolean
  focused: boolean
  /** Miniature du bandeau (mode focus) : toute la surface sert à zapper. */
  thumbnail: boolean
}

const props = defineProps<Props>()
const store = useStreamsStore()
const host = ref<HTMLElement | null>(null)

const rect = computed<TileRect>(() => props.rect ?? { x: 0, y: 0, w: 0, h: 0, hidden: true })
/** Pas encore mesurée, ou rognée (colonne repliée) : le lecteur n'est pas créé / est en pause. */
const hidden = computed(() => rect.value.hidden === true || rect.value.w < 1)
const style = computed(() => ({
  transform: `translate(${rect.value.x}px, ${rect.value.y}px)`,
  width: `${rect.value.w}px`,
  height: `${rect.value.h}px`,
}))

const { status, blocked, unblock } = useTwitchPlayer(host, {
  channel: props.channel.name,
  muted: () => props.channel.muted,
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
</script>

<template>
  <article
    class="tile"
    :class="{
      'tile--hidden': hidden,
      'tile--thumb': thumbnail,
      'tile--focused': focused,
      'tile--audible': !channel.muted,
      'tile--offline': status === 'offline',
    }"
    :style="style"
    :aria-label="`Stream ${channel.name}`"
  >
    <div ref="host" class="tile__player" />

    <!-- Miniature du bandeau : toute la surface zappe vers ce stream -->
    <button
      v-if="interactive && thumbnail"
      type="button"
      class="tile__hit"
      :title="`Zapper sur ${channel.name} (${index + 1})`"
      @click="store.focus(channel.name)"
    >
      <span class="tile__hit-idx">{{ index + 1 }}</span>
      <span class="tile__hit-name">{{ channel.name }}</span>
    </button>

    <!-- Tuile normale : bandeau de contrôle révélé au survol -->
    <div v-else-if="interactive" class="tile__overlay">
      <div class="tile__head">
        <span class="tile__idx">{{ index + 1 }}</span>
        <span class="tile__name">{{ channel.name }}</span>
        <span class="tile__status" :class="`tile__status--${status}`">{{ statusLabel }}</span>
        <span class="tile__spacer" />
        <IconButton
          :icon="channel.muted ? VolumeX : Volume2"
          :label="channel.muted ? 'Activer le son' : 'Couper le son'"
          :active="!channel.muted"
          size="sm"
          @press="store.toggleMute(channel.name)"
        />
        <IconButton
          :icon="focused ? Minimize2 : Maximize2"
          :label="focused ? 'Revenir à la grille' : 'Focus : plein cadre, les autres en sourdine'"
          :kbd="String(index + 1)"
          size="sm"
          @press="store.toggleFocus(channel.name)"
        />
        <IconButton
          v-if="!focused"
          :icon="ChevronLeft"
          label="Déplacer avant"
          size="sm"
          :disabled="index === 0"
          @press="store.move(channel.name, -1)"
        />
        <IconButton
          v-if="!focused"
          :icon="ChevronRight"
          label="Déplacer après"
          size="sm"
          :disabled="index === store.count - 1"
          @press="store.move(channel.name, 1)"
        />
        <IconButton :icon="X" label="Retirer du mur" size="sm" danger @press="store.remove(channel.name)" />
      </div>
    </div>

    <button v-if="interactive && blocked && !channel.muted" type="button" class="tile__unblock" @click="unblock">
      <Volume2 class="tile__unblock-icon" aria-hidden="true" />
      Activer le son
    </button>

    <span v-if="!channel.muted" class="tile__audio" aria-hidden="true" />
  </article>
</template>

<style scoped>
/*
 * Aucune animation d'opacité ni filtre sur la tuile : Twitch évalue la « style visibility » du
 * lecteur à des moments imprévisibles et coupe l'autoplay pour de bon s'il le trouve à opacité 0.
 * Seuls transform / taille / clip-path bougent (transitions dans StreamWall).
 */
.tile {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  background: #000;
  will-change: transform;
}

/* Masquage par rognage, jamais par visibility/display, et la tuile passe sous les autres. */
.tile--hidden {
  clip-path: inset(50%);
  pointer-events: none;
  z-index: 0;
}

.tile--focused {
  z-index: 1;
}

.tile__player,
.tile__player :deep(iframe) {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

/* Tally : liseré ambre sur ce qu'on entend */
.tile--audible::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 0 2px var(--color-tally-500);
}

.tile__audio {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-tally-500);
  box-shadow: 0 0 10px var(--color-tally-500);
  pointer-events: none;
}

.tile--thumb .tile__audio {
  right: 5px;
  bottom: 5px;
  width: 6px;
  height: 6px;
}

/* ---------- Bandeau de contrôle (survol) ---------- */
.tile__overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  background: linear-gradient(to bottom, rgba(8, 8, 10, 0.88) 0, rgba(8, 8, 10, 0.5) 40px, transparent 80px);
}

/* Survol souris, ou navigation clavier (un clic souris ne doit pas figer le bandeau). */
.tile:hover .tile__overlay,
.tile:has(:focus-visible) .tile__overlay {
  opacity: 1;
}

.tile__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  pointer-events: auto;
}

.tile__idx,
.tile__hit-idx {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  background: var(--color-ink-50);
  color: var(--color-ink-950);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  line-height: 1;
}

.tile__name {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-ink-50);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.tile__status {
  padding-left: 8px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-ink-300);
}

.tile__status--live {
  color: var(--color-live-500);
}

.tile__status--live::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 5px;
  border-radius: 50%;
  background: currentColor;
  vertical-align: 1px;
}

.tile__status--offline {
  color: var(--color-ink-400);
}

.tile__spacer {
  flex: 1;
}

/* ---------- Miniature : zone cliquable pleine surface ---------- */
.tile__hit {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 6px;
  border: 0;
  background: linear-gradient(to top, rgba(8, 8, 10, 0.82), transparent 55%);
  color: var(--color-ink-50);
  cursor: pointer;
  opacity: 0.9;
  transition:
    opacity 0.15s,
    box-shadow 0.15s;
}

.tile__hit:hover {
  opacity: 1;
  box-shadow: inset 0 0 0 2px var(--color-tally-500);
}

.tile__hit-idx {
  min-width: 18px;
  height: 18px;
  font-size: 12px;
}

.tile__hit-name {
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- Autoplay bloqué : un clic pour le son ---------- */
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
