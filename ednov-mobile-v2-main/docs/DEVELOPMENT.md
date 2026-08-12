# Development — Ednov Mobile

Conventions and practices for developing the Ednov mobile app.

## Code style and structure

- **TypeScript**: Strict mode; prefer interfaces for props and state. Avoid `any`.
- **Components**: Functional components and hooks only. Use `React.FC` with props when appropriate.
- **Organization**: Group by feature; keep related components, hooks, and styles together. Shared UI lives in `components/`.

## Naming

| Kind | Convention | Example |
|------|------------|---------|
| Variables / functions | camelCase | `isFetchingData`, `handleUserInput` |
| Components | PascalCase | `UserProfile`, `ChatScreen` |
| Directories | lowercase, hyphenated | `user-profile`, `chat-screen` |

## Styling and design tokens

- **No hardcoded colors**: Use design tokens only (Tailwind theme or `Colors` from `@/constants/Colors`). See [DESIGN-TOKENS.md](DESIGN-TOKENS.md).
- **NativeWind**: Prefer `className` with token names (`bg-background`, `text-text`, `bg-separator`, `dark:bg-dark-separator`, etc.).
- **Themed components**: Use `Themed.Text` and `Themed.View` with `lightColor` / `darkColor`, or `Colors[useColorScheme() ?? 'light'].*` in styles when not using Tailwind.
- **Adding tokens**: Update both `tailwind.config.js` and `constants/Colors.ts`, then document in `docs/DESIGN-TOKENS.md`.

## Routing and navigation

- Use **Expo Router** only for screen structure; no raw React Navigation navigators for that.
- One main screen per file under `app/`; shared UI in `components/`.
- Dynamic routes: `[id].tsx` or `[slug].tsx`; params via `useLocalSearchParams()`.
- Layouts: keep `_layout.tsx` files thin (structure and providers only).

## Data and state

- **Server**: React Query for all API data; shared Axios (or similar) with base URL from env.
- **Client global**: Zustand for UI preferences and other client-only state.
- **Local**: `useState` / `useReducer` for screen- or component-local state.
- **Secrets**: Use `EXPO_PUBLIC_*` for config; use EAS Secrets or app config for sensitive values—never commit secrets.

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Performance

- **Load time target**: Main screens (tableau de bord, liste des séances) should load in under 2 seconds to ensure a fluid experience. To verify: use React Query Devtools to see when the main queries (e.g. `sessions`, `dashboard`) reach `isSuccess`, or add a one-off `performance.now()` in dev at screen mount and when the first data is available.
- **Caching**: The app’s React Query client uses `staleTime` and `gcTime` so that revisiting a tab does not refetch unnecessarily; keep these settings when changing the client config.
- Minimize heavy work in `useEffect` / `useState` and in render.
- Use `React.memo()` for components with stable props to avoid unnecessary re-renders.
- For lists: use FlatList with `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize`; use `getItemLayout` when item size is fixed.
- Avoid anonymous functions in `renderItem` or event handlers when they cause re-renders.

## Accessibility

- Set `accessibilityLabel` on interactive and meaningful elements (buttons, links, images, form fields).
- Add `accessibilityHint` when the outcome of an action is not clear from the label.
- Use `accessibilityRole` where it helps (e.g. `button`, `link`, `header`, `image`).
- Keep focus order and touch targets logical and large enough; avoid disabling accessibility unless necessary.

## Path alias

- Use the `@/` alias for imports (e.g. `@/components/Themed`, `@/constants/Colors`, `@/lib/firebase`). It maps to the project root (`tsconfig.json` `paths`).

## Build and deployment

- Use **EAS Build** and **EAS Update** for builds and Over-The-Air (OTA) updates.
- Follow Expo and React Navigation best practices for deep linking when changing or adding schemes.
