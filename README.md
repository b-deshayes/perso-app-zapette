# perso-app-zapette

**Zapette** — plusieurs streams Twitch sur une seule page, un chiffre pour zapper, un bouton pour caster sur la
TV. Pensé pour suivre ses streamers pendant le **ZEVENT** sans perdre un pixel : aucune barre permanente, les
tuiles occupent tout l'écran.

> 100 % statique (Vue 3 + Vite), hébergé sur GitHub Pages, aucun compte ni backend. L'état du mur vit dans
> l'URL et le `localStorage` du navigateur.

## Fonctionnalités

| | |
|---|---|
| **Mur de streams** | Grille « multiviewer » : les tuiles 16/9 se répartissent pour maximiser la surface, quelle que soit la taille de la fenêtre. Jusqu'à 12 chaînes. |
| **Ajouter / retirer** | Barre du haut (nom de chaîne ou URL Twitch, `Entrée`). Croix sur une pastille ou sur une tuile pour retirer. Flèches sur la tuile pour réordonner. |
| **Focus** | Un stream en grand, les autres en **bandeau de miniatures** (toujours en direct, muettes) : un clic sur une miniature zappe. Le focus **coupe le son des autres** et le restaure au retour à la grille. Bandeau repliable (`S`) : les autres lecteurs sont alors mis en pause pour économiser la bande passante. |
| **Son** | Une pastille ambre (« tally ») marque ce qu'on entend. Son par tuile, ou `M` pour tout couper / remettre. |
| **Plein écran** | `F` : plein écran navigateur. La barre du haut ne se montre qu'au survol du bord haut (épinglable avec `H`). |
| **Chat** | `C` ouvre le chat Twitch du stream en focus dans un panneau latéral. |
| **Chromecast** | Bouton **Cast** : le mur s'affiche sur la TV et le PC devient télécommande (voir ci-dessous). |
| **Partage** | L'URL contient chaînes, son et focus : `?c=sylvainlyve,zerator,amixem&a=zerator&f=zerator`. |
| **Qualité adaptée** | Les miniatures demandent une qualité réduite (360p/480p) — inutile de décoder du 1080p dans 300 px, surtout pendant un cast. |

Au premier lancement le mur contient `sylvainlyve`, `zerator` et `amixem`.

### Raccourcis

| Touche | Action |
|---|---|
| `1` … `9` | Focus sur le stream n° (à nouveau : retour grille) |
| `Échap` | Retour à la grille (ou fermer l'aide) |
| `←` `→` | Stream précédent / suivant en focus |
| `M` | Couper / remettre le son |
| `F` | Plein écran navigateur |
| `S` | Bandeau des autres streams (mode focus) |
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
   Le PC coupe ses lecteurs locaux et affiche des cartes de télécommande : focus, son, ajout, retrait, ordre —
   chaque changement est poussé à la TV en temps réel. Le bouton arrête la diffusion. Après un rechargement de la
   page PC, la télécommande se reconnecte toute seule à la diffusion en cours.
2. **Menu Chrome `⋮` → Caster… → source « Onglet ».** Marche partout, sans code : passer en plein écran (`F`), la
   barre se cache toute seule.

Le mirroring est fait par le PC : il décode les streams et encode la vidéo envoyée à la TV. Plus il y a de
chaînes, plus ça pèse — le mode focus (les autres en miniatures basse qualité, ou bandeau replié) est le plus
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
donc `localhost` en dev et `<user>.github.io` en production, sans configuration.

## Déploiement

Push sur `main` → le workflow [`deploy.yml`](.github/workflows/deploy.yml) lance tests et build puis publie
`dist/` sur GitHub Pages (source « GitHub Actions »). Le chemin de base (`/perso-app-zapette/`) est injecté via
`VITE_BASE_PATH`.

## Architecture

```
src/
├── domain/          # Logique pure, testée : layout (grille / focus), parsing de chaîne, état URL,
│                    # validation d'un snapshot, choix de qualité, protocole de cast
├── services/        # Chargement de l'embed Twitch, accès à l'API Presentation, localStorage
├── stores/          # Pinia : streams (chaînes, son, focus, bandeau, chat)
├── composables/     # wall/ (layout, lecteur Twitch, persistance) · ui/ (barre auto-masquée, raccourcis,
│                    # aide, toasts) · cast/ (contrôleur PC, récepteur TV)
├── components/      # layout/ (barre, pastilles) · wall/ (mur, tuile, tuile télécommande, chat, états vides)
│                    # · cast/ · ui/ (boutons, champ, toasts, aide)
└── types/           # Modèles, typage Twitch embed et API Presentation
```

Règles : le domaine ne dépend pas de Vue ; les composants ne font pas d'appel réseau ; le store ne contient que
l'état et ses règles (solo au focus, restauration du son) ; tout ce qui vient de l'extérieur (URL, stockage,
messages de cast) passe par `sanitizeSnapshot`.
