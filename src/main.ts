import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { inject } from '@vercel/analytics'
import App from './App.vue'
import '@/assets/main.css'

createApp(App).use(createPinia()).mount('#app')

// Vercel Web Analytics : un script, aucun élément visible. L'API générique plutôt que le composant
// `@vercel/analytics/vue`, qui importe vue-router (absent ici) et casse le build.
inject()
