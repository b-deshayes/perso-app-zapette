/** Chargement (une seule fois) du script d'embed interactif Twitch et helpers d'URL. */
const EMBED_SCRIPT_URL = 'https://player.twitch.tv/js/embed/v1.js'

let loading: Promise<void> | null = null

export function loadTwitchEmbed(): Promise<void> {
  if ('Twitch' in window) return Promise.resolve()
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = EMBED_SCRIPT_URL
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        loading = null
        script.remove()
        reject(new Error('Impossible de charger le lecteur Twitch'))
      }
      document.head.appendChild(script)
    })
  }
  return loading
}

/** Twitch exige le domaine hôte de la page : localhost en dev, <user>.github.io en prod. */
export function embedParents(): string[] {
  return [window.location.hostname]
}

export function chatEmbedUrl(channel: string): string {
  const params = new URLSearchParams({ parent: window.location.hostname, darkpopout: '' })
  return `https://www.twitch.tv/embed/${encodeURIComponent(channel)}/chat?${params.toString()}`
}
