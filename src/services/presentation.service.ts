import type { PresentationLike, PresentationRequestCtor } from '@/types/Presentation'

/** Accès défensif à l'API Presentation (Chrome/Edge desktop ; absente ailleurs). */
export function getPresentationRequestCtor(): PresentationRequestCtor | null {
  const w = window as unknown as { PresentationRequest?: PresentationRequestCtor }
  return typeof w.PresentationRequest === 'function' ? w.PresentationRequest : null
}

export function getPresentation(): PresentationLike | null {
  const n = navigator as unknown as { presentation?: PresentationLike }
  return n.presentation ?? null
}
