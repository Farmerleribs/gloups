# Gloups

Le carnet de bébé de toute la famille : repas, sommeil, couches, pleurs et santé, partagés en temps réel entre parents, grands-parents et nounou.

- App web installable (iPhone et Android), sans App Store : https://farmerleribs.github.io/gloups/
- Données : Supabase (projet `gloups`, région UE), protégées par des règles d'accès au niveau des lignes.
- Aucune compilation : HTML, CSS et JavaScript simples. `supabase-js` 2.119.0 et la police Google Sans Flex sont récupérées au déploiement (versions figées, empreintes vérifiées) et servies depuis le site : aucun appel à un service tiers en dehors de Supabase.

## Organisation

| Dossier | Contenu |
|---|---|
| `index.html` | page unique de l'app, politique de sécurité du contenu (CSP) stricte |
| `js/app.js` | toute l'app : connexion, familles, saisies, minuteurs partagés, journal, invitations, installation |
| `js/config.js` | adresse Supabase et clé publique (faite pour être publique) |
| `css/app.css` | styles, thème clair |
| `sw.js` | service worker : l'app s'ouvre hors connexion, les données passent toujours par le réseau |
| `db/` | schéma de la base (migrations SQL) |
| `icons/` | logo D3 « ciel de nuit » en SVG ; les PNG sont générés au déploiement |
| `.github/workflows/pages.yml` | déploiement automatique sur GitHub Pages à chaque modification |

## Sécurité

- La clé `sb_publishable_…` est publique par conception. Aucune clé secrète dans ce dépôt.
- Chaque table a ses règles d'accès ; les droits passent par `private.can(famille, action)`.
- Les textes saisis sont affichés avec `textContent` (pas d'injection HTML possible).

## Mettre à jour la base

Les migrations sont dans `db/`. Toujours ajouter un nouveau fichier daté plutôt que modifier un ancien, en suivant la méthode « élargir puis restreindre ».
