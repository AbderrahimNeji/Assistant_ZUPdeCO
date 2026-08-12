# Environment — Ednov Mobile

The app reads configuration from **environment variables** and from Expo’s **extra** config (e.g. for EAS builds). All public variables use the `EXPO_PUBLIC_` prefix so they are available in the client bundle.

## Where values are read

- **Runtime**: `config/env.ts` reads from `Constants.expoConfig?.extra` first, then falls back to `process.env`. Use this for both local dev and EAS.
- **Build / EAS**: Set secrets in EAS and expose them via `app.config.js` (or similar) into `extra` so they are available as `EXPO_PUBLIC_*` without committing them.

## Variables

### Static data (UI testing)

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_USE_STATIC_DATA` | Set to `true` to ignore API responses and use static/mock data everywhere (dashboard, sessions, CR, students, profile). Use when the DB is not seeded yet so you can test UI and flows. Set to `false` or omit when using the real backend. | Optional (defaults to `false`) |

When using static data, the app reads from **`data/staticData.ts`**, which is aligned with backend models and relations (sessions, session_reports, users, establishments, rooms). All IDs are UUIDs; session statuses and report statuses match the backend enums so that switching to real API responses or adding new APIs later does not require structural changes.

### API

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_API_URL` | Base URL for your backend API | Optional (defaults to empty string) |

### Firebase

Required for Firebase Auth (used in `lib/firebase.ts`):

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

## Local development

1. Create a `.env` (or `.env.local`) in the project root **or** set the variables in your shell.
2. Ensure your Expo/React Native setup loads them (e.g. `expo` can read `.env` when using a plugin or bundler that supports it; otherwise set in shell or use `app.config.js` to pass them into `extra`).
3. **Do not commit** `.env` if it contains secrets; add `.env` and `.env.local` to `.gitignore`.

## EAS Build and secrets

- Use **EAS Secrets** for sensitive values (e.g. Firebase keys) so they are not in the repo.
- In `app.config.js` (or `app.config.ts`), read EAS Secrets (e.g. via `process.env`) and put them under `extra` with the same `EXPO_PUBLIC_*` names that `config/env.ts` expects.
- This way the app gets the same variable names in production builds without storing secrets in source control.

## Reference in code

- **API URL**: `env.apiUrl` from `@/config/env`.
- **Firebase**: `env.firebase` (e.g. `env.firebase.apiKey`, `env.firebase.projectId`). Use these only in non-public config (e.g. Firebase client init in `lib/firebase.ts`). Remember that `EXPO_PUBLIC_*` values are visible in the client bundle, so do not put server-only secrets there.
