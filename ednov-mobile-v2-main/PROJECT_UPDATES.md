# Project Updates — EdNov V2

This document summarizes the recent changes made to **ednov-backend** and **ednov-mobile-v2** to integrate the mobile app with the backend APIs, add dynamic branding, fix login, and align data flows.

---

## 1. Sign-in and auth (mobile → backend)

### Goal
Connect the mobile login flow to the backend so that after Firebase sign-in, the app validates the user in the backend and only allows access if a matching user exists.

### Changes

**ednov-mobile-v2**

- **`services/auth.ts`** (new)  
  - `fetchLoginProfile()` calls `GET /api/v1/users/login` with the Firebase JWT (sent automatically by the API client).  
  - Returns the backend user profile; throws on 401/404.

- **`app/(auth)/login.tsx`**  
  - After successful `signInWithEmailAndPassword`, if `EXPO_PUBLIC_API_URL` is set, calls `fetchLoginProfile()`.  
  - If that call fails (e.g. 401/404): signs out from Firebase, shows *"Compte non reconnu. Contactez votre administrateur."*, and does not navigate.  
  - Uses `useDynamicColors()` for theming; uses React Native `Text` (not Themed) to avoid "Colors is not defined" on Expo web.

- **`hooks/useProfile.ts`**  
  - Uses `GET /users/login` (same as backend) and maps the response to `TutorProfile`.  
  - Profile type and mapping now include `id` (backend user UUID) for use as `authorId` in session reports.

- **`types/profile.ts`**  
  - Added optional `id` to `TutorProfile` for the backend user UUID.

**ednov-backend**

- No code changes. Auth already uses Firebase JWT and `GET /users/login` returns the user identified by the token.  
- **CORS:** `http://localhost:8081` was added to `CORS_ORIGINS` in `.env` so the Expo app can call the API.  
- **User creation:** A user must exist in the backend with `firebase_uid` equal to the Firebase UID of the account used to log in.  
  - **`src/scripts/add-user-by-firebase-uid.ts`** (new): script to add a user to the existing EDNOV-DEV company by Firebase UID.  
  - **`package.json`:** new script `seed:add-user`.  
  - Usage:  
    `ADD_USER_FIREBASE_UID=<uid> [ADD_USER_EMAIL=email@example.com] npm run seed:add-user`

---

## 2. Dynamic branding (theme/colors from API)

### Goal
Make primary and accent colors in the mobile app configurable via the backend branding API (`GET /api/v1/branding/complete`).

### Changes (ednov-mobile-v2)

- **`services/branding.ts`** (new)  
  - Types: `CompleteBrandingDto`, `ModeValue`, `ColorWithNuances`.  
  - `fetchCompleteBranding()` calls `GET /branding/complete`.

- **`hooks/useBranding.ts`** (new)  
  - `useCompleteBranding()`: React Query hook, 5 min stale time, disabled when `EXPO_PUBLIC_API_URL` is not set.

- **`providers/BrandingProvider.tsx`** (new)  
  - Uses `useCompleteBranding()` and builds a merged palette from API colors + static `Colors`.  
  - Mapping: `tint` / `tabIconSelected` ← `color1.nuance1[mode]`, `accent` ← `color3.nuance1[mode]`.  
  - `useDynamicColors()`: drop-in replacement for `Colors[colorScheme]` (palette type widened so dynamic strings are allowed).  
  - `useBranding()`: exposes full branding payload (logos, font, etc.).

- **`app/_layout.tsx`**  
  - `QueryClientProvider` moved to the outermost level.  
  - `BrandingProvider` wraps `RootLayoutNav` (inside `AuthProvider`).  
  - `usePaperTheme()` uses `useDynamicColors()` so react-native-paper uses the brand primary.  
  - Stack screen options: removed redundant `headerShown` from individual screens; modal options cast with `as object` to satisfy expo-router types.

- **`app/(auth)/login.tsx`** and **`app/(tabs)/profile.tsx`**  
  - Use `useDynamicColors()` instead of `Colors[colorScheme]`.

- **`.env`**  
  - `EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1` so the app targets the backend API.

When `EXPO_PUBLIC_API_URL` is not set, branding is not fetched and `useDynamicColors()` falls back to the static `Colors` values.

---

## 3. Linking backend APIs to mobile pages

### Goal
Use real backend endpoints for sessions, dashboard KPIs, comptes-rendus (session reports), and profile; keep or fix behavior where the backend has no matching endpoint (e.g. students list).

### 3.1 Sessions

**ednov-mobile-v2**

- **`types/session.ts`**  
  - `SessionStatus` extended with `in_progress`, `closed`.  
  - New `ListSessionsQuery` (dateFrom, dateTo, status, establishmentId, roomId).

- **`services/sessions.ts`**  
  - `mapRawToSession`: builds `date` from backend `sessionDate` + `startTime`; reads `establishment` and `room` from nested objects when present.  
  - `fetchSessions(query?)`: optional query params sent to `GET /sessions`.  
  - `fetchReportKpis()`: `GET /sessions/report-kpis`.  
  - `fetchTutorDashboard()`: `GET /sessions/dashboard/tutor`; maps `upcomingSessions` to `Session[]`.

### 3.2 Dashboard (home)

- **`hooks/useDashboardKpis.ts`**  
  - When `env.apiUrl` is set, uses `fetchReportKpis()` and maps `validatedReports` → `crCompleted`, `overdueReports` → `crLate`.  
  - `sessionsCount` still derived from sessions in the selected period.  
  - Refetch invalidates both sessions and report-kpis.

### 3.3 Comptes-rendus (session reports)

Backend has no `/reporting/cr`; it uses session reports: `GET/POST /sessions/:sessionId/reports`, `GET/PATCH /sessions/:sessionId/reports/:reportId`.

- **`services/comptesRendus.ts`**  
  - List: `fetchComptesRendus()` uses `fetchTutorDashboard()` and maps `reportsToSubmit` to `CompteRendu[]` (rating→note, subject→matiere, comment→commentaire, status, updatedAt→submittedAt).  
  - `fetchSessionReports(sessionId)`, `getSessionReport(sessionId, reportId)`, `createSessionReport(sessionId, payload)`, `updateSessionReport(sessionId, reportId, payload)`.  
  - `submitCompteRendu(payload)`: when API is configured and `authorId` is provided, calls create or update session report; maps note to rating 1–5; mock behavior when API is not used.

- **`hooks/useCompteRenduDetail.ts`** (new)  
  - Resolves a single CR by id: when `sessionId` and apiUrl are set, fetches via `getSessionReport`; otherwise uses the list from `useComptesRendus`.

- **`app/(tabs)/comptes-rendus/index.tsx`**  
  - Detail navigation includes `?sessionId=...` in the URL.

- **`app/(tabs)/comptes-rendus/[id].tsx`**  
  - Reads `sessionId` from params; uses `useCompteRenduDetail(id, sessionId)` and resolves session from the sessions list.

- **`app/(tabs)/comptes-rendus/new.tsx`**  
  - Passes `authorId: profile?.id` in the submit payload (backend user UUID from `GET /users/login`).

- **`hooks/useSubmitCompteRendu.ts`**  
  - On success, invalidates `['comptes-rendus']`, `['sessions']`, and `['sessions', 'report-kpis']`.

### 3.4 Students

- **`services/students.ts`**  
  - Backend has no `GET /students` (only `GET /sessions/analytics/students` for KPIs).  
  - `fetchStudents()` always returns the mock list so that with `EXPO_PUBLIC_API_URL` set the app does not call a non-existent endpoint and get 404.

### 3.5 Profile

- **`app/(tabs)/profile.tsx`**  
  - Uses `useDynamicColors()` for colors.

---

## 4. Fixes and small adjustments

- **Login screen (Expo web):** "Colors is not defined" was caused by the Themed component (which uses `Colors`) being used on the login screen. Login now uses React Native `Text` directly and `useDynamicColors()` for all colors.  
- **Stack screen options (expo-router):** Per-screen `options={{ headerShown: false }}` and `options={{ presentation: 'modal' }}` were not accepted by the typed options. Redundant per-screen `headerShown` was removed; modal options were cast with `as object`.  
- **BrandingProvider ColorPalette:** Return type was too narrow (`as const` on `Colors` made values literal types). `ColorPalette` was changed to a mapped type so all palette values are `string`, allowing API-driven colors.

---

## 5. File summary

| Area | Files created | Files modified |
|------|----------------|----------------|
| Auth / login | `ednov-mobile-v2/services/auth.ts` | `ednov-mobile-v2/app/(auth)/login.tsx`, `hooks/useProfile.ts`, `types/profile.ts` |
| Branding | `ednov-mobile-v2/services/branding.ts`, `hooks/useBranding.ts`, `providers/BrandingProvider.tsx` | `ednov-mobile-v2/app/_layout.tsx`, `app/(auth)/login.tsx`, `app/(tabs)/profile.tsx`, `.env` |
| Sessions / dashboard | — | `ednov-mobile-v2/services/sessions.ts`, `types/session.ts`, `hooks/useDashboardKpis.ts` |
| Comptes-rendus | `ednov-mobile-v2/hooks/useCompteRenduDetail.ts` | `ednov-mobile-v2/services/comptesRendus.ts`, `hooks/useComptesRendus.ts`, `hooks/useSubmitCompteRendu.ts`, `app/(tabs)/comptes-rendus/index.tsx`, `[id].tsx`, `new.tsx` |
| Students | — | `ednov-mobile-v2/services/students.ts` |
| Backend | `ednov-backend/src/scripts/add-user-by-firebase-uid.ts` | `ednov-backend/.env`, `package.json` |

---

## 6. How to run and test

1. **Backend**  
   - From `ednov-backend`: `npm run dev`.  
   - Ensure `.env` has CORS (e.g. `CORS_ORIGINS=...,http://localhost:8081`) and Firebase Admin config.  
   - If needed, run `npm run seed` then `ADD_USER_FIREBASE_UID=<your-firebase-uid> ADD_USER_EMAIL=your@email.com npm run seed:add-user` so the account you use to log in exists in the DB.

2. **Mobile**  
   - From `ednov-mobile-v2`: set `EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1` (e.g. in `.env`), then `npm start` and open the app (e.g. web at `http://localhost:8081`).  
   - Log in with a Firebase account that has a matching user in the backend.  
   - After login, branding is loaded from `GET /branding/complete`, dashboard KPIs from report-kpis, sessions from `GET /sessions`, and comptes-rendus from the tutor dashboard and session reports APIs.

---

*Document generated to reflect recent project updates (sign-in, branding, API linking, and related fixes).*
