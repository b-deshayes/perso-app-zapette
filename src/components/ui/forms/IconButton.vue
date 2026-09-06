<script setup lang="ts">
import type { Component } from 'vue'

interface Props {
  icon: Component
  label: string
  active?: boolean
  disabled?: boolean
  danger?: boolean
  /** Raccourci clavier, affiché dans l'infobulle. */
  kbd?: string
  /** `xs` : barre sous une tuile (20 px) · `sm` : 26 px · `md` : barre du haut (32 px). */
  size?: 'xs' | 'sm' | 'md'
}

withDefaults(defineProps<Props>(), { active: false, disabled: false, danger: false, size: 'md' })
const emit = defineEmits<{ (e: 'press'): void }>()
</script>

<template>
  <button
    type="button"
    class="ibtn"
    :class="{ 'is-active': active, 'is-danger': danger, 'ibtn--sm': size === 'sm', 'ibtn--xs': size === 'xs' }"
    :title="kbd ? `${label} (${kbd})` : label"
    :aria-label="label"
    :aria-pressed="active ? 'true' : undefined"
    :disabled="disabled"
    @click.stop="emit('press')"
  >
    <component :is="icon" class="ibtn__icon" aria-hidden="true" />
  </button>
</template>
