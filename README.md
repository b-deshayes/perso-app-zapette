# perso-app-zapette

**Zapette** — plusieurs streams Twitch sur une seule page, un chiffre pour zapper, un bouton pour caster sur la
TV. Pensé pour suivre ses streamers pendant le **ZEVENT** : une barre fine (masquable), et tout le reste pour
les vidéos.

> 100 % statique (Vue 3 + Vite), hébergé sur Vercel, aucun compte ni backend. L'état du mur vit dans l'URL et le
> `localStorage` du navigateur.

## Fonctionnalités

| | |
|---|---|
| **Mur de streams** | Grille « multiviewer » : les tuiles 16/9 se répartissent pour maximiser la surface, quelle que soit la taille de la fenêtre. Jusqu'à 12 chaînes. |
| **Ajouter / retirer** | Barre du haut (nom de chaîne ou URL Twitch, `Entrée`). Croix sur une pastille ou dans la barre d'une tuile pour retirer. Flèches pour réordonner. |
| **Focus** | Un stream en grand ; dans une **colonne latérale**, autant de miniatures live que la hauteur le permet (à la taille minimale acceptée par Twitch), puis des cartes « en attente » pour les autres. Un clic sur une miniature ou une carte zappe. Colonne à droite, à gauche, ou masquée (`S`) ; sur un écran large elle absorbe la largeur que le stream principal ne peut pas utiliser. Le focus **coupe le son des autres** et le restaure au retour à la grille. |
| **Barre de contrôle** | Sous chaque vidéo : numéro, nom, statut live, son, focus, ordre, retrait. Jamais par-dessus la vidéo (voir les règles Twitch plus bas). |
| **Son** | Un liseré ambre (« tally ») marque ce qu'on entend. Son par tuile, ou `M` pour tout couper / remettre. Au premier chargement les lecteurs démarrent muets, le son part au premier clic ou touche (règle d'autoplay des navigateurs). |
| **Plein écran** | `F` : plein écran navigateur. `H` masque la barre du haut pour un mur plein cadre. |
| **Chat** | `C` ouvre le chat Twitch du stream en focus dans un panneau latéral. |
| **Chromecast** | Bouton **Cast** : le mur s'affiche sur la TV et le PC devient télécommande (voir ci-dessous). |
| **Partage** | L'URL contient chaînes, son et focus : `?c=sylvainlyve,zerator,amixem&a=zerator&f=zerator&strip=left`. |
| **Qualité adaptée** | Les miniatures demandent une qualité réduite (360p/480p) — inutile de décoder du 1080p dans une miniature, surtout pendant un cast. |

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
| `H` | Masquer / afficher la barre du haut |
| `?` | Aide |

Les raccourcis sont inactifs quand le focus clavier est dans un lecteur Twitch (après un clic dans la vidéo) :
cliquer à côté, ou sur une barre de tuile, pour le reprendre.

## Caster sur la Chromecast

Deux façons, la première est intégrée à l'application :

1. **Bouton Cast (API Presentation, Chrome / Edge).** La page s'ouvre en mode *récepteur* (`?receiver=1`, sans
   interface) sur la Chromecast : Chrome la rend hors écran et la diffuse (mirroring), le son part sur la TV.
   Le PC coupe ses lecteurs locaux et affiche des cartes de télécommande : focus, son, ajout, retrait, ordre —
   chaque changement est poussé à la TV en temps réel. Le bouton arrête la diffusion. Après un rechargement de la
   page PC, la télécommande se reconnecte toute seule à la diffusion en cours.
2. **Menu Chrome `⋮` → Caster… → source « Onglet ».** Marche partout, sans code : passer en plein écran (`F`) et
   masquer la barre (`H`) avant.

Le mirroring est fait par le PC : il décode les streams et encode la vidéo envoyée à la TV. Plus il y a de
chaînes, plus ça pèse — le mode focus (les autres en miniatures basse qualité, ou colonne masquée) est le plus
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

## Règles du lecteur Twitch (lues dans son code, elles dictent l'interface)

Sur les domaines publics (pas sur `localhost`, d'où des tests locaux trompeurs), le lecteur embarqué observe
son propre document avec un IntersectionObserver v2 (`trackVisibility`, délai 1 s) et applique trois règles,
au démarrage **et en cours de lecture** — une violation met le lecteur en pause, et il ne reprend jamais seul :

| Violation | Ce que ça veut dire | Réponse de Zapette |
|---|---|---|
| `style visibility` | un élément de la page **chevauche l'iframe** (même transparent, même `pointer-events: none` ; seule l'opacité 0 est ignorée), ou un ancêtre porte opacité < 1, filtre, `clip-path`, transformation autre qu'une translation 2D | contrôles dans une **barre sous la vidéo**, barre du haut **dans le flux** (jamais par-dessus), toasts sur la barre, liseré du son en `outline`, zone de clic des miniatures à opacité 0, aucune transition ni animation sur les tuiles |
| `size` | vidéo plus petite que **400×300 px** | miniatures live à 534×300 en mode focus, cartes « en attente » pour les chaînes qui ne tiennent pas (leur lecteur est rangé derrière le stream en focus), compteur ambre quand la grille est trop serrée |
| `viewport visibility` | vidéo en partie hors de la fenêtre | tout tient toujours dans la fenêtre |

Autres règles vérifiées :

- Un `play()` ou `setMuted(false)` programmatique au `READY` court-circuite l'autoplay : son et qualité sont
  appliqués au `PLAYING`. Un `setMuted(false)` sans geste utilisateur met la lecture en pause : le lecteur
  reste muet jusqu'au premier clic / touche sur la page, sauf sur la TV (récepteur Presentation).
- Un changement de qualité relance la lecture, donc repasse par ces contrôles : jamais sur une tuile rangée.
- Comme Twitch ne reprend pas seul, chaque tuile relance son lecteur (`play()`) après un changement de
  disposition et toutes les 4 s si elle le trouve en pause alors qu'elle est visible et assez grande.
- Le bruit console (`amazon-adsystem` bloqué par un bloqueur de pub, `attribution-reporting`, `accelerometer`,
  `MaxListenersExceededWarning`, `Failed to load playlist` pour une chaîne hors ligne) vient du lecteur Twitch et
  n'a pas d'effet.

## Architecture

```
src/
├── domain/          # Logique pure, testée : layout (grille / focus, colonne, cartes, minimum Twitch), parsing
│                    # de chaîne, état URL, validation d'un snapshot, choix de qualité, protocole de cast
├── services/        # Chargement de l'embed Twitch, accès à l'API Presentation, localStorage
├── stores/          # Pinia : streams (chaînes, son, focus, colonne, chat)
├── composables/     # wall/ (layout, lecteur Twitch, persistance) · ui/ (barre, raccourcis, aide, toasts)
│                    # · cast/ (contrôleur PC, récepteur TV)
├── components/      # layout/ (barre, pastilles) · wall/ (mur, tuile, carte, tuile télécommande, chat, états
│                    # vides) · cast/ · ui/ (boutons, champ, toasts, aide)
└── types/           # Modèles, typage Twitch embed et API Presentation
```

Règles : le domaine ne dépend pas de Vue ; les composants ne font pas d'appel réseau ; le store ne contient que
l'état et ses règles (solo au focus, restauration du son) ; tout ce qui vient de l'extérieur (URL, stockage,
messages de cast) passe par `sanitizeSnapshot`.
