<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus } from 'lucide-vue-next'

interface Props {
  placeholder?: string
  large?: boolean
  autofocus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Ajouter une chaîne — nom ou URL Twitch',
  large: false,
  autofocus: false,
})
const emit = defineEmits<{ (e: 'submit', value: string): void }>()

const value = ref('')
const field = ref<HTMLInputElement | null>(null)

function submit() {
  const raw = value.value.trim()
  if (raw) emit('submit', raw)
}

function clear() {
  value.value = ''
}

function focus() {
  field.value?.focus()
  field.value?.select()
}

onMounted(() => {
  if (props.autofocus) focus()
})

defineExpose({ clear, focus })
</script>

<template>
  <form class="cinput" :class="{ 'cinput--large': large }" @submit.prevent="submit">
    <input
      ref="field"
      v-model="value"
      type="text"
      class="cinput__field"
      :placeholder="placeholder"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      enterkeyhint="done"
      aria-label="Chaîne Twitch à ajouter"
    />
    <button type="submit" class="cinput__btn" aria-label="Ajouter la chaîne" title="Ajouter (Entrée)">
      <Plus class="cinput__icon" aria-hidden="true" />
    </button>
  </form>
</template>

<style scoped>
.cinput {
  display: flex;
  align-items: stretch;
  height: 32px;
  border: 1px solid var(--color-ink-700);
  background: var(--color-ink-900);
  transition: border-color 0.15s;
}

.cinput:focus-within {
  border-color: var(--color-tally-500);
}

.cinput__field {
  flex: 1;
  min-width: 0;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: var(--color-ink-50);
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;
}

.cinput__field::placeholder {
  color: var(--color-ink-400);
}

.cinput__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  border: 0;
  border-left: 1px solid var(--color-ink-700);
  background: var(--color-ink-800);
  color: var(--color-ink-200);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.cinput__btn:hover {
  background: var(--color-tally-500);
  color: var(--color-ink-950);
}

.cinput__icon {
  width: 16px;
  height: 16px;
}

.cinput--large {
  height: 50px;
}

.cinput--large .cinput__field {
  padding: 0 16px;
  font-size: 15px;
}

.cinput--large .cinput__btn {
  width: 50px;
}

.cinput--large .cinput__icon {
  width: 20px;
  height: 20px;
}
</style>
