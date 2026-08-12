# Mobile app – test scenarios

End-to-end test scenarios for the EdNov mobile app, using seed data from the backend. Run these after seeding the database with `npm run seed:dashboard` (see [Seed data](#seed-data) below).

---

## Prerequisites

1. **Backend** running at `http://localhost:3000` (or your `API_URL`).
2. **Database seeded** with dashboard + test data:
   - From `ednov-backend`: `npm run seed:dashboard`
   - This creates: company EDNOV-TEST, tutor user, STUDENT role, 6 students, sessions (past/planned), session participants, session reports (draft + submitted), gamification (niveaux, badges, XP, leaderboard), pedagogical resources, user preferences.
3. **Firebase** – log in with the same Firebase UID as the seeded tutor:
   - Set `SEED_FIREBASE_UID` in `ednov-backend/.env` to your Firebase user's UID before running the seed, **or**
   - Use the default test UID (`evwlub60lDVVXClJxAhM2k7QCwj1`) and ensure that Firebase user exists and is linked to your app.
4. **App** running (Expo web or device) and logged in as that tutor.

**If you are redirected back to login** after signing in with `tutor.test@ednov.fr`: the backend looks up users by Firebase UID; the seeded tutor has a different UID than your Firebase account. Fix: in Firebase Console → Authentication → Users, copy the **User UID** of `tutor.test@ednov.fr`. In `ednov-backend/.env` set `SYNC_FIREBASE_UID=<that UID>`, then run `npm run seed:sync-firebase-uid`. Sign in again.

---

## Seed data (what you get)

| Data | Purpose |
|------|--------|
| Company `EDNOV-TEST` (fixed id) | All screens use this company. |
| Tutor user (fixed id), volunteer role | Matches `managedById` on sessions; used for login. |
| 6 student users (STUDENT role) | **Élèves** tab shows a list. |
| ~14 sessions (past + planned, various statuses) | **Dashboard**, **Séances**, **Comptes rendus**, session detail. |
| Session participants (tutor + students per session) | **Session detail** shows participants. |
| Session reports (2 draft, 3 submitted) | **Comptes rendus** list and KPIs; **Historique** (activity feed) uses submitted CRs. |
| Gamification (3 niveaux, 2 badges, tutor XP + 1 badge) | **Profil** (level/XP), **Classement** (leaderboard), **Historique** (badge events). |
| 5 pedagogical resources (subjects/levels linked) | **Profil → Ressources**. |
| User preferences | **Profil** / theme (dark mode, etc.). |

---

## Test scenarios by screen

### 1. App load and branding

- **Steps:** Open app; wait for initial load (and login if needed).
- **Expected:**
  - Branding/theme loads (colors, logo if configured).
  - No crash; bottom tab or main navigation visible.
- **API:** `GET /branding/complete?companyId=...`, `GET /user-preferences` → 200.

---

### 2. Dashboard (Tableau de bord)

- **Steps:** From home, open Dashboard / Tableau de bord tab.
- **Expected:**
  - Sessions (past and upcoming) appear.
  - Report KPIs (e.g. to submit, submitted) if the app displays them.
  - Optional: “Élèves suivis” or similar count (from students list).
- **API:** `GET /sessions`, `GET /sessions/report-kpis`, `GET /sessions/dashboard/tutor`, optionally `GET /users/students` → 200.

---

### 3. Séances (sessions list)

- **Steps:** Open Séances tab.
- **Expected:**
  - List of sessions with dates, times, status (e.g. PLANNED, COMPLETED, IN_PROGRESS).
  - Tapping a session opens session detail.
- **API:** `GET /sessions` → 200.

---

### 4. Session detail

- **Steps:** From Séances (or Dashboard), open one session (e.g. a COMPLETED one).
- **Expected:**
  - Session info: date, time, establishment, type, status.
  - Participants section shows tutor and students (from seed).
- **API:** `GET /sessions/:id`, `GET /sessions/:id/participants` → 200.

---

### 5. Comptes rendus

- **Steps:** Open Comptes rendus tab.
- **Expected:**
  - List of sessions with report status (to submit, draft, submitted).
  - At least some “to submit” and some with reports (draft/submitted) from seed.
- **API:** `GET /sessions/dashboard/tutor`, `GET /sessions` → 200.

---

### 6. Élèves (students)

- **Steps:** Open Élèves tab.
- **Expected:**
  - List of 6 students (Léa Martin, Thomas Bernard, Emma Petit, etc.).
  - No 400/500; list may be empty only if backend not restarted after route fix or company mismatch.
- **API:** `GET /users/students` → 200.

---

### 7. Profil (profile)

- **Steps:** Open Profil tab.
- **Expected:**
  - User info (name, email) from `GET /users/login`.
  - Gamification: level, XP (e.g. 45 XP, first level) from `GET /gamification/me`.
- **API:** `GET /users/login`, `GET /gamification/me` → 200.

---

### 8. Profil → Ressources

- **Steps:** From Profil, open Ressources (or equivalent sub-screen).
- **Expected:**
  - List of 5 pedagogical resources (e.g. “Fiche équations”, “Conjugaison présent”, “Vidéos Khan Academy”).
  - Tapping a resource opens detail or link.
- **API:** `GET /resources` (paginated) → 200.

---

### 9. Profil → Classement (leaderboard)

- **Steps:** From Profil, open Classement.
- **Expected:**
  - Leaderboard with at least the seeded tutor (e.g. 45 XP, rank).
- **API:** `GET /gamification/leaderboard` → 200.

---

### 10. Profil → Historique (activity feed)

- **Steps:** From Profil, open Historique.
- **Expected:**
  - Activity feed with “session completed” and “CR submitted” and “badge awarded” events (from seed).
  - If the endpoint returns 500, check backend logs; feed is built from sessions (completed), session reports (submitted), and user badges.
- **API:** `GET /activity-feed/me` → 200 (fix 500 if it occurs).

---

### 11. Auth and errors

- **Steps:**
  - Log out, then log in again with the same Firebase user.
  - (Optional) Use an invalid or expired token and confirm app handles 401.
- **Expected:**
  - After login, `GET /users/login` returns user + companyId; app shows correct company data.
  - On 401, app redirects to login or shows an appropriate message.

---

## Quick checklist

| # | Scenario | Pass |
|---|----------|------|
| 1 | App load / branding | ☐ |
| 2 | Dashboard (sessions, KPIs) | ☐ |
| 3 | Séances list | ☐ |
| 4 | Session detail + participants | ☐ |
| 5 | Comptes rendus list | ☐ |
| 6 | Élèves list (6 students) | ☐ |
| 7 | Profil (user + gamification) | ☐ |
| 8 | Ressources (5 resources) | ☐ |
| 9 | Classement (leaderboard) | ☐ |
| 10 | Historique (activity feed) | ☐ |
| 11 | Auth (login / 401 handling) | ☐ |

---

## See also

- [Endpoint audit (browser)](./endpoint-audit-browser.md) – API calls per screen and status.
- Backend seed: `ednov-backend` → `npm run seed:dashboard`; bootstrap + test data are part of the dashboard demo seed.
