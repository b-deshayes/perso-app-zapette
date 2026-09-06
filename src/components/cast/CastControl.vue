<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Cast } from 'lucide-vue-next'
import IconButton from '@/components/ui/forms/IconButton.vue'
import { useCastSender } from '@/composables/cast/useCastSender'
import { useToast } from '@/composables/ui/useToast'
import { useStreamsStore } from '@/stores/streams'

const CHROME_FALLBACK = 'Alternative : dans Chrome, menu ⋮ → Caster… → source « Onglet »'

const { state, supported, start, stop, resume, probeAvailability } = useCastSender()
const toast = useToast()
const store = useStreamsStore()

onMounted(() => {
  if (!supported.value) return
  void resume()
  void probeAvailability()
})

const label = computed(() => {
  if (state.value === 'connected') return 'Arrêter la diffusion sur la TV'
  if (state.value === 'connecting') return 'Connexion à la TV…'
  return 'Caster sur la TV (Chromecast)'
})

async function onPress() {
  if (state.value !== 'idle') {
    stop()
    toast.show('Diffusion arrêtée — les lecteurs reviennent ici')
    return
  }
  if (!supported.value) {
    toast.show(`Ce navigateur ne gère pas la diffusion d'écran. ${CHROME_FALLBACK}`, 'warn', 7000)
    return
  }
  if (store.count === 0) {
    toast.show('Ajoute au moins une chaîne avant de caster', 'warn')
    return
  }
  const result = await start()
  if (result === 'unavailable') toast.show(`Aucun écran trouvé sur le réseau. ${CHROME_FALLBACK}`, 'warn', 7000)
  else if (result === 'started') toast.show('Connexion à la TV… le PC devient télécommande', 'info', 4000)
}
</script>

<template>
  <IconButton
    :icon="Cast"
    :label="label"
    :active="state !== 'idle'"
    :class="{ 'is-connecting': state === 'connecting' }"
    @press="onPress"
  />
</template>

<style scoped>
.is-connecting {
  animation: pulse-tally 1.2s ease-out infinite;
}
</style>
