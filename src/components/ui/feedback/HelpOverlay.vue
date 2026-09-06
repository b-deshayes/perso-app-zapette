<script setup lang="ts">
import { X } from 'lucide-vue-next'
import IconButton from '@/components/ui/forms/IconButton.vue'
import { useHelpOverlay } from '@/composables/ui/useHelpOverlay'

const { visible, close } = useHelpOverlay()

const SHORTCUTS: Array<[string, string]> = [
  ['1 … 9', 'Focus sur le stream n° — à nouveau : retour à la grille'],
  ['Échap', 'Retour à la grille'],
  ['← →', 'Stream précédent / suivant en focus'],
  ['M', 'Couper / remettre le son'],
  ['F', 'Plein écran navigateur'],
  ['S', 'Colonne des autres streams : droite → gauche → masquée (mode focus)'],
  ['C', 'Chat Twitch du stream en focus'],
  ['A ou /', 'Ajouter une chaîne'],
  ['Suppr', 'Retirer le stream en focus'],
  ['H', 'Épingler la barre du haut'],
  ['?', 'Cette aide'],
]
</script>

<template>
  <Transition name="help">
    <div v-if="visible" class="help" role="dialog" aria-modal="true" aria-labelledby="help-title" @click.self="close">
      <div class="help__panel">
        <header class="help__head">
          <span id="help-title" class="wordmark help__title">Zapette</span>
          <span class="label-cond">Régie multistream</span>
          <span class="help__spacer" />
          <IconButton :icon="X" label="Fermer" kbd="Échap" @press="close" />
        </header>

        <div class="help__cols">
          <section>
            <h2 class="label-cond help__h">Clavier</h2>
            <dl class="help__list">
              <template v-for="[key, text] in SHORTCUTS" :key="key">
                <dt><span class="kbd">{{ key }}</span></dt>
                <dd>{{ text }}</dd>
              </template>
            </dl>
          </section>

          <section>
            <h2 class="label-cond help__h">Sur la TV · Chromecast</h2>
            <ol class="help__steps">
              <li>
                <strong>Bouton Cast</strong> dans la barre → choisir la Chromecast. Le mur s'affiche sur la TV et reste
                affiché ici, son coupé localement : focus, son, ajout et retrait de chaînes se pilotent depuis le PC.
              </li>
              <li>
                Sinon, dans Chrome : menu <span class="kbd">⋮</span> → <strong>Caster…</strong> → source
                « Onglet ». Passe en plein écran (<span class="kbd">F</span>) avant, la barre se cache toute seule.
              </li>
            </ol>

            <h2 class="label-cond help__h">Souris</h2>
            <p class="help__p">
              La barre apparaît en approchant du bord haut. Survole une tuile pour le son, le focus, l'ordre et le
              retrait. En focus, les autres streams s'empilent dans une colonne sur le côté : un clic sur une
              miniature zappe dessus.
            </p>

            <h2 class="label-cond help__h">Partager</h2>
            <p class="help__p">
              L'adresse de la page contient la liste des chaînes, le son et le focus : copie-la pour retrouver le même
              mur ailleurs.
            </p>
          </section>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.help {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(8, 8, 10, 0.72);
  backdrop-filter: blur(6px);
}

.help__panel {
  width: min(880px, 100%);
  max-height: 100%;
  overflow: auto;
  border: 1px solid var(--color-ink-600);
  background: var(--color-ink-900);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  animation: rise-in 0.25s var(--ease-panel) both;
}

.help__head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-ink-700);
}

.help__title {
  font-size: 26px;
  color: var(--color-ink-50);
}

.help__spacer {
  flex: 1;
}

.help__cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 32px;
  padding: 18px;
}

.help__h {
  margin: 14px 0 8px;
}

.help__h:first-child {
  margin-top: 0;
}

.help__list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 7px 14px;
  margin: 0;
  align-items: center;
}

.help__list dt,
.help__list dd {
  margin: 0;
}

.help__list dd {
  color: var(--color-ink-200);
}

.help__steps {
  margin: 0;
  padding-left: 18px;
  color: var(--color-ink-200);
}

.help__steps li + li {
  margin-top: 8px;
}

.help__steps strong {
  color: var(--color-ink-50);
  font-weight: 500;
}

.help__p {
  margin: 0;
  color: var(--color-ink-200);
}

.help-enter-active,
.help-leave-active {
  transition: opacity 0.2s;
}

.help-enter-from,
.help-leave-to {
  opacity: 0;
}

@media (max-width: 760px) {
  .help__cols {
    grid-template-columns: 1fr;
  }
}
</style>
