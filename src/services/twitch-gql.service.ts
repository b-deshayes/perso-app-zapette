import type { StreamInfo } from '@/types/Viewers'

/**
 * API GraphQL du site twitch.tv (non documentée mais ouverte : CORS `*`, pas de jeton), avec le
 * Client-Id public du site. L'API officielle (Helix) exigerait un jeton OAuth, donc un backend.
 */
const GQL_URL = 'https://gql.twitch.tv/gql'
const WEB_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'
const QUERY =
  'query ZapetteStreams($logins: [String!]!) { users(logins: $logins) { login displayName stream { viewersCount title game { displayName } } } }'

interface GqlUser {
  login: string
  displayName: string
  stream: { viewersCount: number; title: string | null; game: { displayName: string } | null } | null
}

interface GqlResponse {
  data?: { users?: Array<GqlUser | null> }
  errors?: Array<{ message: string }>
}

/** Spectateurs, titre et jeu de chaque chaîne en une requête ; les chaînes inconnues sont omises. */
export async function fetchStreamInfos(logins: readonly string[], signal?: AbortSignal): Promise<StreamInfo[]> {
  if (logins.length === 0) return []
  const response = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Client-Id': WEB_CLIENT_ID, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { logins } }),
    signal,
  })
  if (!response.ok) throw new Error(`Twitch GQL : HTTP ${response.status}`)
  const json = (await response.json()) as GqlResponse
  const users = json.data?.users
  if (!users) throw new Error(json.errors?.[0]?.message ?? 'Twitch GQL : réponse invalide')
  return users.flatMap((user) =>
    user
      ? [
          {
            login: user.login.toLowerCase(),
            displayName: user.displayName,
            live: user.stream !== null,
            viewers: user.stream?.viewersCount ?? null,
            title: user.stream?.title ?? null,
            game: user.stream?.game?.displayName ?? null,
          },
        ]
      : [],
  )
}
