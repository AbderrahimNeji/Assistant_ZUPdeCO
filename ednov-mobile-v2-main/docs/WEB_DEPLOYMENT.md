# Web Deployment Notes

## Sites Firebase (prod vs dev)

| Cible | Site Firebase Hosting | URL typique | API (bundle) |
|--------|------------------------|-------------|----------------|
| **prod** | `zupdeco-mobile-v2` | [zupdeco-mobile-v2.web.app](https://zupdeco-mobile-v2.web.app) | Définie dans `.env.web.prod` (`monkfish-app-f5d5m` — ajuster si l’API de prod change). |
| **dev** | `zupdeco-mobile-dev-v2` | `https://zupdeco-mobile-dev-v2.web.app` | `.env.web.dev` → `ednov-poc-dev-4dvoe.ondigitalocean.app/api/v1`. |
| **testing** | `zupdeco-mobile-testing-v2` | `https://zupdeco-mobile-testing-v2.web.app` | `.env.web.testing` → `ednov-poc-testing-jbdlc.ondigitalocean.app/api/v1`. |

Scripts (depuis `mobile/`) :

- `npm run deploy:web:prod` — export avec `.env.web.prod`, déploie **hosting:prod**.
- `npm run deploy:web:dev` — export avec `.env.web.dev`, déploie **hosting:dev**.
- `npm run deploy:web:testing` — export avec `.env.web.testing`, déploie **hosting:testing**.
- `npm run deploy:web` — alias de `deploy:web:prod`.

Windows sans bash : `npm run deploy:web:win` (prod), `deploy:web:win:dev` (dev) et `deploy:web:win:testing` (testing).

L’URL d’API est **figée au moment du `expo export`** : pour éviter les conflits, ne pas réutiliser le même `dist/` entre les deux environnements ; les scripts effacent `dist` avant export (sauf variantes `*:win*` — vider `dist` à la main si besoin).

## Font 404s (fixed)

Fonts from `@expo/vector-icons` are bundled under `dist/assets/node_modules/...`. The `firebase.json` ignore rule `**/node_modules/**` was excluding these files. This has been removed so fonts deploy correctly.

## CORS (backend required)

Each **origine** hébergée doit être autorisée sur l’**API** que le bundle appelle :

- **Prod** : `https://zupdeco-mobile-v2.web.app` → API `https://monkfish-app-f5d5m.ondigitalocean.app/api/v1` (voir `.env.web.prod`).
- **Dev** : `https://zupdeco-mobile-dev-v2.web.app` → API `https://ednov-poc-dev-4dvoe.ondigitalocean.app/api/v1` — ajouter cette origine dans `CORS_ORIGINS` **sur l’app DigitalOcean « dev »** (`ednov-poc-dev-4dvoe`), pas seulement sur la prod.
- **Testing** : `https://zupdeco-mobile-testing-v2.web.app` → API `https://ednov-poc-testing-jbdlc.ondigitalocean.app/api/v1` — ajouter cette origine dans `CORS_ORIGINS` **sur l’app DigitalOcean « testing »** (`ednov-poc-testing-jbdlc`).

Exemple (à adapter, liste séparée par des virgules) :

```bash
CORS_ORIGINS=http://localhost:5173,http://localhost:8081,https://zupdeco-mobile-v2.web.app,https://zupdeco-mobile-dev-v2.web.app,https://zupdeco-mobile-testing-v2.web.app,https://plateforme.zupdeco.org
```

Variations par environnement : l’instance **dev** doit inclure `https://zupdeco-mobile-dev-v2.web.app` ; l’instance **testing** doit inclure `https://zupdeco-mobile-testing-v2.web.app` ; l’instance **prod** doit inclure `https://zupdeco-mobile-v2.web.app`.

## Backend testing (DigitalOcean `ednov-poc-testing-jbdlc`)

Variables clés sur l’app DigitalOcean testing (même Firebase que dev) :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | Même URL Supabase que dev (pooler `:6543`) |
| `DATABASE_SCHEMA` | `ednov_testing` |
| `DATABASE_SSL` | `true` |
| `FIREBASE_*` | Identiques à dev |
| `CORS_ORIGINS` | Inclure `https://zupdeco-mobile-testing-v2.web.app` |

Après configuration, exécuter les migrations sur le schéma `ednov_testing` :

```bash
DATABASE_URL='...' DATABASE_SCHEMA=ednov_testing DATABASE_SSL=true npm run migration:run
```

- **NestJS (ednov-backend)** : `CORS_ORIGINS` dans `.env` ou variables d’environnement de l’app déployée.
- **DigitalOcean App Platform** : App-level (ou composant API) → Environment Variables.

### Other warnings (informational)

- **expo-av deprecation**: Use `expo-audio` and `expo-video` in SDK 54+.
- **useNativeDriver on web**: Expected; React Native Web uses JS animation.
- **expo-notifications on web**: Push token listening not supported; no action needed.
- **content.js TypeError**: Likely from a browser extension, not the app.
