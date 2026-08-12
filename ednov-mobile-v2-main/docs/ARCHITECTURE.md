# Architecture — Ednov Mobile

This document describes the app’s high-level architecture: routing, auth, data, and providers.

## Routing (Expo Router)

The app uses **Expo Router** for file-based routing. Do not add raw React Navigation navigators for screen structure; use the file system and layouts.

### Route structure

| Path / group | Purpose |
|--------------|---------|
| `app/` | Root; `_layout.tsx` wraps the app and defines the Stack. |
| `app/(auth)/` | Auth group: `login.tsx`, etc. Shown when user is not signed in. |
| `app/(tabs)/` | Main app: tab navigator (`index`, `two`, …). Shown when user is signed in. |
| `app/modal.tsx` | Modal screen (e.g. presented as modal). |
| `app/+not-found.tsx` | 404 screen. |

### Layouts

- **Root** (`app/_layout.tsx`): Fonts, splash, `AuthProvider`, `ThemeProvider`, `PaperProvider`, `QueryClientProvider`, and a Stack with `(auth)`, `(tabs)`, and `modal`. Root `View` has `className="flex-1 bg-background"` and the `dark` class when `useColorScheme() === 'dark'` so NativeWind `dark:` works.
- **Auth** (`app/(auth)/_layout.tsx`): Stack with no header; currently only `login`.
- **Tabs** (`app/(tabs)/_layout.tsx`): Tab bar; tab tint uses `Colors[colorScheme].tint`.

### Navigation

- Use `<Link href="...">` for declarative navigation.
- Use `router.push()`, `router.replace()`, `router.back()` from `expo-router` for imperative navigation.
- Use `useLocalSearchParams()` for dynamic segments (e.g. `[id].tsx`).
- Keep `href` paths aligned with the file structure (e.g. `/(tabs)/two`, `/modal`).

---

## Authentication

### AuthProvider

- **Location**: `providers/AuthProvider.tsx`
- **Hook**: `useAuth()` returns `{ user, loading, error, signOut }`.
- **Backend**: Firebase Auth via `lib/firebase.ts` (initialized with `config/env.ts` Firebase config).

### Auth flow

1. Root layout is wrapped in `AuthProvider`.
2. `RootLayoutNav` reads `user` and `loading` from `useAuth()` and current `segments`.
3. While `loading === true`, a `LoadingScreen` is shown.
4. When not loading:
   - If there is **no** user and the current segment is **not** `(auth)`, redirect to `/(auth)/login`.
   - If there **is** a user and the current segment **is** `(auth)`, redirect to `(tabs)`.
5. Login screen is a placeholder; implement Firebase email/password or other sign-in in `app/(auth)/login.tsx`.

### Firebase

- **Config**: `lib/firebase.ts` initializes the Firebase app and Auth using `env.firebase` from `config/env.ts`.
- **Secrets**: All Firebase keys come from `EXPO_PUBLIC_*` env (see [ENVIRONMENT.md](ENVIRONMENT.md)); use EAS Secrets or app config for builds, never commit secrets.

### Réinitialisation mot de passe (A4, A5)

- **A4 — E-mail** : Mot de passe oublié via e-mail : écran `app/(auth)/forgot-password.tsx` (mode e-mail), Firebase `sendPasswordResetEmail` ; l’utilisateur reçoit un lien par e-mail.
- **A5 — SMS OTP** : Récupération par téléphone : même écran (mode « Par téléphone »), `services/auth.ts` → `sendPhoneOTP` (Firebase Phone Auth), puis `app/(auth)/reset-password-otp.tsx` (saisie du code à 6 chiffres), `confirmPhoneOTPForPasswordReset`, puis `app/(auth)/set-new-password.tsx` (nouveau mot de passe). La récupération par téléphone est disponible uniquement sur native (iOS/Android) ; le rate limiting est géré par Firebase.

---

## Data and state

### Server data (API)

- Use **React Query** (`@tanstack/react-query`) for all server data: `useQuery` for reads, `useMutation` for writes.
- Do not keep server data in Zustand or ad-hoc global state; keep it in the React Query cache.
- Use a shared API client (e.g. Axios) with base URL from `env.apiUrl`; do not hardcode API URLs or keys.
- Use consistent query keys (e.g. by feature or resource) and handle loading and error states in the UI.

### Client-only state

- Use **Zustand** for client-only global state (e.g. UI preferences, offline flags).
- Use local `useState` (or `useReducer`) for state that is only needed in one screen or component.

### React Query setup

- `QueryClient` is created in `app/_layout.tsx` with defaults (e.g. `staleTime: 60 * 1000`, `retry: 1`).
- The app is wrapped in `PersistQueryClientProvider` (from `@tanstack/react-query-persist-client`) with an AsyncStorage persister so that a subset of the cache survives restarts and is available offline.

### Séances

- **Mode séance (SE4)** : Le type de séance (visio, présentiel, hybride) est affiché sur la liste des séances (`app/(tabs)/sessions/index.tsx`), sur la fiche détail (`app/(tabs)/sessions/[id].tsx`) et dans l’historique des présences (`app/(tabs)/sessions/attendance-history.tsx`).

### Mode hors ligne

- **Cache lecture** : Les queries dont la clé commence par `profile`, `sessions`, `comptes-rendus`, `gamification`, `activity-feed`, `session` (et `sessions` + `report-kpis`) sont persistées dans AsyncStorage (maxAge 24 h). En hors ligne, React Query sert ces données en cache.
- **File d’écriture** : Un store Zustand persisté (`store/offlineQueueStore.ts`) conserve une file d’actions (soumission de CR, mise à jour de présence). En cas d’erreur réseau sur une mutation, l’action est enregistrée dans la file au lieu d’afficher uniquement une erreur.
- **Synchro** : Au retour en ligne (détection via `@react-native-community/netinfo`), la file est rejouée dans l’ordre (appels API), les queries concernées sont invalidées, et un message « Synchronisation terminée » ou « Erreur de synchronisation » est affiché.
- **UI** : Un bandeau « Hors ligne — Données en cache » est affiché en haut des onglets lorsque le réseau est indisponible.

### Notifications

- **N1 — Rappel CR** : Rappel en app (tableau de bord) lorsque des comptes rendus sont à saisir ; pas de notification push.
- **N2 — Rappel séance** : Notification locale planifiée (expo-notifications) 15 min avant le début d’une séance ; préférence utilisateur « Rappel séance » (P5, `rappelSeance`). Logique dans `services/sessionReminders.ts` ; hook `useSessionReminders()` appelé dans le layout des onglets ; permission demandée lors de l’activation du rappel dans `app/(tabs)/profile/notifications.tsx`.

---

## Providers (order in root layout)

1. `AuthProvider` (outermost)
2. `View` with `className="flex-1 bg-background"` and `dark` when applicable
3. `ThemeProvider` (React Navigation theme)
4. `PaperProvider` (React Native Paper; theme built from `Colors` and `useColorScheme()`)
5. `PersistQueryClientProvider` (React Query + cache persisté)
6. `Stack` (Expo Router screens)

---

## Theming and styling

- **Design tokens**: Single source of truth is `tailwind.config.js`; `constants/Colors.ts` mirrors it for `Themed` and non-Tailwind code. See [DESIGN-TOKENS.md](DESIGN-TOKENS.md).
- **Root layout**: App background and `dark` class are set in the root `View` so that `dark:` Tailwind classes work everywhere.
