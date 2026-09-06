import type { ViewerHistory, ViewerSample, ViewerTrend } from '@/types/Viewers'

/** Historique conservé par chaîne (localStorage) : 3 h. */
export const HISTORY_MAX_AGE_MS = 3 * 60 * 60 * 1000
/** Référence = médiane des relevés entre 15 min et 3 min avant l'instant courant. */
export const BASELINE_FROM_MS = 15 * 60 * 1000
export const BASELINE_TO_MS = 3 * 60 * 1000
export const MIN_BASELINE_SAMPLES = 3
/** Un relevé plus vieux que ça n'est plus « actuel » (sondages en échec). */
export const CURRENT_MAX_AGE_MS = 3 * 60 * 1000
/** Pic : au moins +25 % ET +300 spectateurs par rapport à la référence. */
export const HOT_RATIO = 0.25
export const HOT_MIN_GAIN = 300

export const EMPTY_TREND: ViewerTrend = { viewers: null, delta: null, hot: false }

/** Valide un historique venu du stockage : tout ce qui n'a pas la forme attendue est ignoré. */
export function parseViewerHistory(raw: unknown): ViewerHistory {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const history: ViewerHistory = {}
  for (const [login, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue
    const samples: ViewerSample[] = []
    for (const item of value) {
      if (!item || typeof item !== 'object') continue
      const { t, v } = item as Record<string, unknown>
      if (typeof t !== 'number' || typeof v !== 'number' || !Number.isFinite(t) || !Number.isFinite(v)) continue
      if (v < 0) continue
      samples.push({ t, v })
    }
    samples.sort((a, b) => a.t - b.t)
    if (samples.length) history[login] = samples
  }
  return history
}

/** Ajoute un relevé (les plus vieux que `maxAgeMs` et ceux postérieurs au relevé sont écartés). */
export function appendSample(
  history: ViewerHistory,
  login: string,
  sample: ViewerSample,
  maxAgeMs: number = HISTORY_MAX_AGE_MS,
): ViewerHistory {
  const cutoff = sample.t - maxAgeMs
  const kept = (history[login] ?? []).filter((s) => s.t >= cutoff && s.t < sample.t)
  return { ...history, [login]: [...kept, sample] }
}

/** Ne garde que les chaînes listées et les relevés récents. */
export function pruneHistory(
  history: ViewerHistory,
  logins: readonly string[],
  now: number,
  maxAgeMs: number = HISTORY_MAX_AGE_MS,
): ViewerHistory {
  const cutoff = now - maxAgeMs
  const next: ViewerHistory = {}
  for (const login of logins) {
    const samples = (history[login] ?? []).filter((s) => s.t >= cutoff)
    if (samples.length) next[login] = samples
  }
  return next
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/**
 * Tendance d'une chaîne à l'instant `now` : dernier relevé (s'il est récent), variation par rapport
 * à la médiane de la fenêtre de référence, et pic si la hausse est nette en proportion ET en volume
 * (une petite chaîne qui passe de 80 à 110 spectateurs n'est pas un pic).
 */
export function computeTrend(samples: readonly ViewerSample[], now: number): ViewerTrend {
  const last = samples[samples.length - 1]
  if (!last || now - last.t > CURRENT_MAX_AGE_MS) return EMPTY_TREND
  const baseline = samples
    .filter((s) => s.t >= now - BASELINE_FROM_MS && s.t <= now - BASELINE_TO_MS)
    .map((s) => s.v)
  if (baseline.length < MIN_BASELINE_SAMPLES) return { viewers: last.v, delta: null, hot: false }
  const reference = median(baseline)
  if (reference <= 0) return { viewers: last.v, delta: null, hot: false }
  const delta = last.v / reference - 1
  const hot = delta >= HOT_RATIO && last.v - reference >= HOT_MIN_GAIN
  return { viewers: last.v, delta, hot }
}

/** 845 → « 845 », 1750 → « 1,8 k », 56445 → « 56,4 k », 123456 → « 123 k » (espace fine insécable avant le k). */
export function formatViewers(viewers: number): string {
  if (viewers < 1000) return String(viewers)
  const thousands = viewers / 1000
  const digits = thousands < 100 ? 1 : 0
  return `${thousands.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: digits })} k`
}

/** 0,31 → « +31 % », −0,05 → « -5 % », 0 → « 0 % ». */
export function formatDelta(delta: number): string {
  const pct = Math.round(delta * 100)
  const sign = pct > 0 ? '+' : pct < 0 ? '-' : ''
  return `${sign}${Math.abs(pct)} %`
}
