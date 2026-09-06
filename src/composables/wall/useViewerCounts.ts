import { computed, readonly, ref } from 'vue'
import { useIntervalFn, watchDebounced } from '@vueuse/core'
import { useToast } from '@/composables/ui/useToast'
import { appendSample, computeTrend, EMPTY_TREND, formatDelta, formatViewers, pruneHistory } from '@/domain/viewers'
import { loadViewerHistory, saveViewerHistory } from '@/services/storage.service'
import { fetchStreamInfos } from '@/services/twitch-gql.service'
import { useStreamsStore } from '@/stores/streams'
import type { StreamInfo, ViewerHistory, ViewerTrend } from '@/types/Viewers'

/** Twitch rafraîchit ses compteurs toutes les 30 s environ : inutile de sonder plus souvent. */
const POLL_MS = 30_000
/** Un pic n'est annoncé qu'une fois par chaîne toutes les 10 min. */
const ALERT_COOLDOWN_MS = 10 * 60_000

function createViewerCounts() {
  const store = useStreamsStore()
  const toast = useToast()
  const history = ref<ViewerHistory>(loadViewerHistory())
  const infos = ref<Record<string, StreamInfo>>({})
  /** Instant du dernier sondage : les tendances sont recalculées à chaque relevé. */
  const now = ref(Date.now())
  const lastAlert: Record<string, number> = {}
  let inflight: AbortController | null = null

  const trends = computed<Record<string, ViewerTrend>>(() => {
    const out: Record<string, ViewerTrend> = {}
    for (const channel of store.channels) out[channel.name] = computeTrend(history.value[channel.name] ?? [], now.value)
    return out
  })

  function announceSpikes(t: number): void {
    for (const [login, trend] of Object.entries(trends.value)) {
      if (!trend.hot || trend.viewers === null || trend.delta === null) continue
      if (t - (lastAlert[login] ?? 0) < ALERT_COOLDOWN_MS) continue
      lastAlert[login] = t
      const name = infos.value[login]?.displayName ?? login
      toast.show(`Pic de spectateurs sur ${name} : ${formatViewers(trend.viewers)} (${formatDelta(trend.delta)})`, 'info', 6000)
    }
  }

  async function poll(): Promise<void> {
    const logins = store.channels.map((c) => c.name)
    if (logins.length === 0) return
    inflight?.abort()
    const controller = new AbortController()
    inflight = controller
    let result: StreamInfo[]
    try {
      result = await fetchStreamInfos(logins, controller.signal)
    } catch {
      // Réseau ou API indisponible : on garde les derniers relevés, qui expireront d'eux-mêmes.
      if (!controller.signal.aborted) now.value = Date.now()
      return
    }
    if (controller.signal.aborted) return
    const t = Date.now()
    let next = pruneHistory(history.value, logins, t)
    const nextInfos: Record<string, StreamInfo> = {}
    for (const info of result) {
      nextInfos[info.login] = info
      if (info.viewers !== null) next = appendSample(next, info.login, { t, v: info.viewers })
    }
    history.value = next
    infos.value = nextInfos
    now.value = t
    saveViewerHistory(next)
    announceSpikes(t)
  }

  useIntervalFn(() => void poll(), POLL_MS)
  // Premier relevé tout de suite, puis à chaque changement de la liste (ajout, retrait).
  watchDebounced(() => store.channels.map((c) => c.name).join(','), () => void poll(), {
    debounce: 800,
    immediate: true,
  })

  function trendFor(login: string): ViewerTrend {
    return trends.value[login] ?? EMPTY_TREND
  }

  function infoFor(login: string): StreamInfo | undefined {
    return infos.value[login]
  }

  return { trends, infos: readonly(infos), trendFor, infoFor, refresh: poll }
}

let instance: ReturnType<typeof createViewerCounts> | null = null

/**
 * Spectateurs de chaque chaîne du mur (sondage Twitch toutes les 30 s), historique en localStorage
 * (3 h) et détection de pic : +25 % et +300 spectateurs par rapport aux 15 dernières minutes.
 * Singleton : le premier appel (App) lance le sondage, les tuiles et pastilles lisent l'état.
 */
export function useViewerCounts() {
  if (!instance) instance = createViewerCounts()
  return instance
}
