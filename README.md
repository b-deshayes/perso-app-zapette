# perso-app-zapette

**Zapette** — plusieurs streams Twitch sur une seule page, un chiffre pour zapper, un bouton pour caster sur la
TV. Pensé pour suivre ses streamers pendant le **ZEVENT** sans perdre un pixel : pas de barre du haut permanente,
les tuiles occupent tout l'écran, et rien n'est jamais affiché par-dessus une vidéo (Twitch mettrait le stream
en pause).

> 100 % statique (Vue 3 + Vite), hébergé sur Vercel, aucun compte ni backend. L'état du mur et l'historique des
> spectateurs vivent dans l'URL et le `localStorage` du navigateur.

## Fonctionnalités

| | |
|---|---|
| **Mur de streams** | Grille « multiviewer » : les tuiles 16/9 se répartissent pour maximiser la surface, quelle que soit la taille de la fenêtre. Jusqu'à 12 chaînes. |
| **Ajouter / retirer** | Barre du haut (nom de chaîne ou URL Twitch, `Entrée`). Croix sur une pastille ou dans la barre de la tuile pour retirer ; flèches dans la barre pour réordonner. |
| **Barre de tuile** | Au-dessus de chaque vidéo, 24 px : numéro, nom (titre du stream en infobulle), état (live, hors ligne, pause), spectateurs. Au survol : son, focus, ordre, retrait. Un stream que Twitch a mis en pause affiche **Reprendre**. |
| **Spectateurs et pics** | Le nombre de spectateurs de chaque chaîne (Twitch, toutes les 30 s) et sa variation par rapport à la médiane des 15 dernières minutes. Un **pic** (au moins +25 % et +300 spectateurs) passe la barre de la tuile et la pastille en ambre, et un message le signale une fois (10 min de répit par chaîne). L'historique (3 h) est gardé dans le navigateur : la détection repart avec sa référence après un rechargement. |
| **Focus** | Un stream en grand, les autres en **miniatures sur le côté** (toujours en direct, muettes) : un clic sur une miniature zappe. Les miniatures font au moins 300 px de large (en dessous, Twitch ne les lit pas) : quand une colonne ne suffit pas en hauteur, le bloc passe à 2 ou 3 colonnes. Bloc à droite, à gauche, ou masqué (`S`) ; sur un écran large il absorbe la largeur que le stream principal ne peut pas utiliser. Le focus **coupe le son des autres** et le restaure au retour à la grille. Bloc masqué : les autres lecteurs sont rangés derrière le stream principal ; Twitch les met en pause tant qu'ils y sont, ils repartent quand on zappe dessus. |
| **Son** | Une pastille ambre (« tally ») marque ce qu'on entend. Son par tuile, ou `M` pour tout couper / remettre. Au premier chargement les lecteurs démarrent muets, le son part au premier clic ou touche (règle d'autoplay des navigateurs). |
| **Plein écran** | `F` : plein écran navigateur. La barre du haut ne se montre qu'au survol du bord haut et **pousse le mur** vers le bas plutôt que de le recouvrir (épinglable avec `H`). Les messages (chaîne inconnue, cast…) s'affichent dans cette barre, jamais sur le mur. |
| **Chat** | `C` ouvre le chat Twitch du stream en focus dans un panneau latéral. |
| **Chromecast** | Bouton **Cast** : le mur s'affiche sur la TV et reste affiché sur le PC, qui pilote (voir ci-dessous). |
| **Partage** | L'URL contient chaînes, son et focus : `?c=sylvainlyve,zerator,amixem&a=zerator&f=zerator&strip=left`. |
| **Démarrage échelonné** | Les lecteurs démarrent l'un après l'autre (un toutes les 0,7 s) et restent en qualité auto : huit lecteurs lancés d'un coup, ou une qualité forcée, saturent la connexion et figent l'image. |

Au premier lancement le mur contient `sylvainlyve`, `zerator` et `amixem`.

### Raccourcis

| Touche | Action |
|---|---|
| `1` … `9` | Focus sur le stream n° (à nouveau : retour grille) |
| `Échap` | Retour à la grille (ou fermer l'aide) |
| `←` `→` | Stream précédent / suivant en focus |
| `M` | Couper / remettre le son |
| `F` | Plein écran navigateur |
| `S` | Colonne des autres streams : droite → gauche → masquée |
| `C` | Chat Twitch |
| `A` ou `/` | Ajouter une chaîne |
| `Suppr` | Retirer le stream en focus |
| `H` | Épingler la barre du haut |
| `?` | Aide |

Les raccourcis sont inactifs quand le focus clavier est dans un lecteur Twitch (après un clic dans la vidéo) :
cliquer à côté, ou sur une tuile, pour le reprendre.

## Caster sur la Chromecast

Deux façons, la première est intégrée à l'application :

1. **Bouton Cast (API Presentation, Chrome / Edge).** La page s'ouvre en mode *récepteur* (`?receiver=1`, sans
   interface) sur la Chromecast : Chrome la rend hors écran et la diffuse (mirroring), le son part sur la TV.
   Les streams restent affichés sur le PC (son coupé localement, il joue sur la TV) et tout se pilote depuis
   le PC : focus, son, ajout, retrait, ordre — chaque changement est poussé à la TV en temps réel. Le bouton arrête la diffusion. Après un rechargement de la
   page PC, la télécommande se reconnecte toute seule à la diffusion en cours.
2. **Menu Chrome `⋮` → Caster… → source « Onglet ».** Marche partout, sans code : passer en plein écran (`F`), la
   barre se cache toute seule.

Le mirroring est fait par le PC : il décode les streams et encode la vidéo envoyée à la TV. Plus il y a de
chaînes, plus ça pèse — le mode focus (les autres en miniatures, ou colonne masquée) est le plus
confortable pour un cast.

## Stack

Vue 3.5 (Composition API, `<script setup>`), TypeScript strict, Vite 8, Pinia, VueUse, Tailwind CSS 4 (PostCSS),
Lucide, Vitest. Lecteurs via l'[embed interactif Twitch](https://dev.twitch.tv/docs/embed/video-and-clips/)
(`player.twitch.tv/js/embed/v1.js`), cast via l'[API Presentation](https://www.w3.org/TR/presentation-api/).

Thème unique « régie » : noir profond, accent ambre pour ce qui est audible / en focus, Barlow Condensed + IBM
Plex Mono.

## Démarrer

```bash
npm install
npm run dev
```

```bash
npm test          # tests unitaires (vitest) : layout, parsing, état URL, store
npm run build     # vue-tsc + vite build
```

L'embed Twitch exige que le domaine hôte soit déclaré (`parent`) : l'application utilise `location.hostname`,
donc `localhost` en dev et le domaine de déploiement en production, sans configuration. Il exige aussi HTTPS
en production.

## Déploiement

Site statique servi à la racine. Sur Vercel : preset **Vite**, commande `npm run build`, dossier `dist` — la
détection automatique suffit, chaque push sur `main` déploie. Pour servir sous un sous-chemin, définir
`VITE_BASE_PATH` (ex. `/zapette/`) au build.

## Spectateurs : d'où vient le chiffre

L'embed ne l'expose pas et l'API officielle (Helix) exige un jeton OAuth, donc un backend. Zapette interroge
l'API GraphQL du site twitch.tv (`gql.twitch.tv/gql`, Client-Id public du site, CORS ouvert) : une requête
pour toutes les chaînes (`users(logins:) { stream { viewersCount title game } }`). Non documentée, elle peut
changer sans préavis ; en cas d'échec, les compteurs disparaissent au bout de 3 min et tout le reste fonctionne.

## Pièges Twitch (appris en route)

- Le lecteur observe son iframe avec un IntersectionObserver v2 (`trackVisibility`, délai 1 s). Au démarrage,
  il **refuse l'autoplay** (« minimum requirements for autoplay were not met: style visibility ») si `isVisible`
  est faux ; **en cours de lecture, il met le stream en pause** au bout d'une seconde dans le même cas, sans
  reprise automatique. `isVisible` est faux dès qu'un élément de la page **chevauche l'iframe** (même
  transparent, même en `pointer-events: none` ; seule l'opacité 0 est ignorée) ou qu'un ancêtre porte une
  opacité < 1, un filtre, un `clip-path`, une transformation autre qu'une translation 2D. Seule une lecture
  lancée depuis les contrôles internes du lecteur y échappe (drapeau `userTriggeredPlay`, inaccessible depuis
  la page : la commande `play` de l'API arrive sans paramètre). Autres seuils lus dans les settings du lecteur :
  taille minimale **300 × 150 px**, au moins 50 % de l'iframe dans le viewport. Donc : la barre de contrôle
  est **sous** la vidéo (jamais de bandeau au survol), la barre du haut pousse le mur au lieu de le
  recouvrir (bord contre bord, même durée, même courbe, 2 px de marge), les toasts vivent dans cette barre,
  le liseré ambre est un `outline`, une miniature se clique via son conteneur (l'iframe est en
  `pointer-events: none`, rien n'est posé dessus), les tuiles masquées sont rangées derrière le stream en focus,
  et **aucune transition sur les tuiles** : pendant un glissement elles se chevaucheraient quelques images, et
  l'observateur du lecteur échantillonne immédiatement le premier changement après une période calme. Le panneau d'aide recouvre tout : à sa fermeture, les lecteurs mis
  en pause pendant qu'il était ouvert sont relancés ; même chose au retour sur l'onglet. L'enforcement vaut pour tout domaine parent que Twitch
  n'a pas marqué « safe » (`localhost` compris) ; un onglet non rendu compte comme invisible, d'où des tests
  locaux trompeurs dans un aperçu masqué.
- Ne jamais mettre un lecteur en pause soi-même : la reprise par `play()` est souvent refusée. Les miniatures
  restent en direct. Si un lecteur est quand même trouvé en pause après un changement de
  disposition ou après la fermeture de l'aide, il est relancé (0,4 s, 1,5 s, 3,2 s : le lecteur ne réévalue sa
  visibilité qu'une fois par seconde).
- Un `play()` ou `setMuted(false)` programmatique au `READY` court-circuite l'autoplay : le son est
  appliqué au `PLAYING`.
- Un `setMuted(false)` sans geste utilisateur met la lecture en pause : le lecteur reste muet jusqu'au premier
  clic / touche sur la page, sauf sur la TV (récepteur Presentation) où Chrome autorise l'autoplay sonore.
- Le bruit console (`amazon-adsystem` bloqué par un bloqueur de pub, `attribution-reporting`, `accelerometer`,
  `MaxListenersExceededWarning`, `Failed to load playlist` pour une chaîne hors ligne) vient du lecteur Twitch et
  n'a pas d'effet.

## Architecture

```
src/
├── domain/          # Logique pure, testée : layout (grille / focus + bloc de miniatures), parsing de chaîne, état URL,
│                    # validation d'un snapshot, protocole de cast, modes de colonne, spectateurs (historique, pics)
├── services/        # Chargement de l'embed Twitch, GraphQL Twitch (spectateurs), API Presentation, localStorage
├── stores/          # Pinia : streams (chaînes, son, focus, colonne, chat)
├── composables/     # wall/ (layout, lecteur Twitch, persistance, spectateurs) · ui/ (barre auto-masquée, raccourcis,
│                    # aide, toasts) · cast/ (contrôleur PC, récepteur TV)
├── components/      # layout/ (barre, pastilles) · wall/ (mur, tuile, chat, états vides)
│                    # · cast/ · ui/ (boutons, champ, toasts, aide)
└── types/           # Modèles, typage Twitch embed et API Presentation
```

Règles : le domaine ne dépend pas de Vue ; les composants ne font pas d'appel réseau ; le store ne contient que
l'état et ses règles (solo au focus, restauration du son) ; tout ce qui vient de l'extérieur (URL, stockage,
messages de cast) passe par `sanitizeSnapshot`.
