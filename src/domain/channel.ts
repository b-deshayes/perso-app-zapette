/**
 * Noms de chaîne Twitch : 4 à 25 caractères alphanumériques ou underscore en théorie,
 * quelques comptes historiques sont plus courts — on accepte à partir de 2.
 */
const CHANNEL_NAME = /^[a-z0-9_]{2,25}$/i
const TWITCH_URL = /twitch\.tv\/(?:popout\/|embed\/)?([a-z0-9_]+)/i

/** Au-delà, la bande passante et le CPU (surtout en cast) ne suivent plus. */
export const MAX_CHANNELS = 12

/**
 * Normalise une saisie utilisateur en nom de chaîne : accepte « zerator », « @ZeratoR »,
 * « twitch.tv/zerator » ou une URL complète. Retourne null si rien d'exploitable.
 */
export function parseChannelInput(raw: string): string | null {
  let value = raw.trim()
  if (!value) return null
  const fromUrl = TWITCH_URL.exec(value)
  if (fromUrl?.[1]) value = fromUrl[1]
  value = value.replace(/^@/, '')
  if (!CHANNEL_NAME.test(value)) return null
  return value.toLowerCase()
}

export function twitchChannelUrl(name: string): string {
  return `https://www.twitch.tv/${name}`
}
