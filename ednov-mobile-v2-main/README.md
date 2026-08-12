# Ednov Mobile v2

React Native mobile app for **Ednov**, built with **Expo** and **TypeScript**. Supports iOS, Android, and web with file-based routing, Firebase Auth, design tokens, and dark mode.

## Tech stack

| Area | Technology |
|------|------------|
| Framework | React Native 0.81, Expo SDK 54 |
| Language | TypeScript (strict) |
| Routing | Expo Router (file-based) |
| Styling | NativeWind (Tailwind CSS) + design tokens |
| UI | React Native Paper (Material Design 3) |
| Data | React Query (TanStack Query), Axios |
| State | Zustand (client-only), React Query (server) |
| Auth | Firebase Authentication |
| Animations | React Native Reanimated |

## Getting started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go (for device testing) or iOS Simulator / Android Emulator

### Install and run

```bash
cd ednov-mobile-v2
npm install
npm start
```

Then:

- **iOS**: press `i` in the terminal or scan QR with Camera (Expo Go).
- **Android**: press `a` or scan QR with Expo Go.
- **Web**: press `w` for web bundle.

### Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Start with Android |
| `npm run ios` | Start with iOS |
| `npm run web` | Start with web |

## Project structure

```
ednov-mobile-v2/
├── app/                    # Expo Router screens and layouts
│   ├── (auth)/             # Auth group: login, etc.
│   ├── (tabs)/             # Tab navigator: main app screens
│   ├── _layout.tsx         # Root layout, providers, auth redirect
│   ├── modal.tsx           # Modal screen
│   └── +not-found.tsx      # 404
├── components/             # Reusable UI (Themed, LoadingScreen, etc.)
├── constants/              # Colors (design tokens), other constants
├── config/                 # Environment (env.ts)
├── lib/                    # Firebase and other shared libs
├── providers/              # React context (AuthProvider)
├── assets/                 # Images, fonts
├── docs/                   # Documentation
│   ├── DESIGN-TOKENS.md    # Colors and styling tokens
│   ├── ARCHITECTURE.md     # App architecture and routing
│   ├── DEVELOPMENT.md      # Conventions and practices
│   └── ENVIRONMENT.md      # Env vars and secrets
├── tailwind.config.js      # Tailwind / design token source of truth
├── global.css              # Tailwind directives
└── app.json                # Expo config
```

## Environment variables

The app uses `EXPO_PUBLIC_*` for config. See **[docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)** for the full list and how to set them (e.g. `.env`, EAS Secrets).

Required for Firebase Auth:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

Optional: `EXPO_PUBLIC_API_URL` for your backend API.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/DESIGN-TOKENS.md](docs/DESIGN-TOKENS.md) | Design tokens, NativeWind usage, light/dark colors |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Routing, auth flow, data and state |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Code style, conventions, accessibility |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Environment variables and secrets |

## License

Private project.
