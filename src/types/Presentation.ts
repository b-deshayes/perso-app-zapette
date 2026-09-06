/**
 * Typage minimal de l'API Presentation (https://www.w3.org/TR/presentation-api/).
 * Déclaré localement pour ne pas dépendre de sa présence dans lib.dom.
 */
export type PresentationConnectionState = 'connecting' | 'connected' | 'closed' | 'terminated'

export interface PresentationConnectionLike {
  readonly id: string
  readonly url: string
  readonly state: PresentationConnectionState
  send(data: string): void
  close(): void
  terminate(): void
  onconnect: ((event: Event) => void) | null
  onclose: ((event: Event) => void) | null
  onterminate: ((event: Event) => void) | null
  onmessage: ((event: MessageEvent<string>) => void) | null
}

export interface PresentationAvailabilityLike {
  readonly value: boolean
  onchange: ((event: Event) => void) | null
}

export interface PresentationRequestLike {
  start(): Promise<PresentationConnectionLike>
  reconnect(id: string): Promise<PresentationConnectionLike>
  getAvailability(): Promise<PresentationAvailabilityLike>
}

export interface PresentationRequestCtor {
  new (urls: string | string[]): PresentationRequestLike
}

export interface PresentationConnectionListLike {
  readonly connections: PresentationConnectionLike[]
  onconnectionavailable: ((event: { connection: PresentationConnectionLike }) => void) | null
}

export interface PresentationReceiverLike {
  readonly connectionList: Promise<PresentationConnectionListLike>
}

export interface PresentationLike {
  readonly receiver: PresentationReceiverLike | null
  defaultRequest: PresentationRequestLike | null
}
