# Endpoint audit – per screen (browser test)

Tested on **Browser** (Expo web at http://localhost:8081) with backend at http://localhost:3000/api/v1.  
Auth: Firebase JWT; user had `companyId` and was logged in.

**Backend fix applied (2025-03):** `GET /users/students` – route reordered (`Get('students')` immediately after `Get('login')`), defensive guards added in controller (require `company_id`) and service (require `companyId`). **Restart backend** to pick up changes; then expect either 200 (user has company) or 400 with message "User has no company".

---

## Summary

| Screen                                           | Expected API calls                                                                                              | Observed                                                                                   | Status                                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| App load / branding                              | `GET /branding/complete?companyId=...`                                                                          | ✅ 200                                                                                      | **Working**                                      |
| Dashboard (Tableau de bord)                      | `GET /sessions`, `GET /sessions/report-kpis`, `GET /sessions/dashboard/tutor`, optionally `GET /users/students` | GET /sessions 200, GET /user-preferences 200; report-kpis not in captured batch            | **Verified (sessions)**                          |
| Séances (sessions list)                          | `GET /sessions`                                                                                                 | ✅ GET /sessions 200                                                                        | **Working**                                      |
| Session detail                                   | `GET /sessions/:id`, `GET /sessions/:id/participants`, optional `GET /sessions/:id/assignment-candidates`       | ✅ GET /sessions/:id 200, GET /sessions/:id/participants 200                                | **Verified**                                     |
| Comptes rendus                                   | `GET /sessions/dashboard/tutor` (reports to submit), sessions from `GET /sessions`                              | ✅ GET /sessions/dashboard/tutor 200                                                        | **Working**                                      |
| Élèves (students)                                | `GET /users/students`                                                                                           | Fix in place; was 400 before backend restart                                               | **Fix applied; restart backend to verify**       |
| Profil                                           | `GET /users/login`, `GET /gamification/me`                                                                      | ✅ both 200                                                                                 | **Working**                                      |
| Profile sub (Ressources, Classement, Historique) | `GET /resources`, `GET /gamification/leaderboard`, `GET /activity-feed/me`                                      | ✅ GET /resources 200, ✅ GET /gamification/leaderboard 200, ❌ GET /activity-feed/me **500** | **Ressources/Classement OK; Historique failing** |

---

## 1. App load / shared

- **Called and working**
  - `GET /api/v1/branding/complete?companyId=...` → **200**  
    Used for theme and branding (e.g. companyId from login profile). Called on app load when user has company.

---

## 2. Dashboard (Tableau de bord) – `/` or `/` (tabs)

**Expected (from code):**

- `GET /sessions` – list sessions (useSessions)
- `GET /sessions/report-kpis` – KPIs for dashboard (useDashboardKpis → fetchReportKpis)
- `GET /sessions/dashboard/tutor` – tutor dashboard (used by useDashboardKpis / CR to submit; may be used for KPIs)
- `GET /users/students` – when `env.apiUrl` and not `useStaticData`, for “Élèves suivis” count (useDashboardKpis → fetchStudents)

**Observed:**  
Initial load: `GET /branding/complete` 200, `GET /user-preferences` 200, `GET /users/students` (400 before fix; see §6). On another load (e.g. profile/classement): `GET /sessions` 200. `GET /sessions/report-kpis` was not in captured batches (may be called on first load or cached).

**Verdict:** **Verified** – GET /sessions 200. Branding, user-preferences, and tutor dashboard working. If dashboard KPIs are wrong, confirm GET /sessions/report-kpis is called and returns 200.

---

## 3. Séances (sessions list) – `/sessions`

**Expected:**

- `GET /sessions` (optional query: dateFrom, dateTo, status, establishmentId, roomId)

**Observed:**  
- `GET /api/v1/sessions` → **200**

**Verdict:** **Working.**

---

## 4. Session detail – `/sessions/:id`

**Expected:**

- `GET /sessions/:id` – session detail (useSessionDetail)
- `GET /sessions/:id/participants` – participants (useSessionParticipants)
- `GET /sessions/:id/assignment-candidates` – only if `env.showAssignmentCandidates` and API + not static (useAssignmentCandidates)

**Observed:**  
- `GET /api/v1/sessions/:id` → **200**  
- `GET /api/v1/sessions/:id/participants` → **200**  
- `GET /sessions/:id/assignment-candidates` – not in batch (may be disabled via `env.showAssignmentCandidates`).

**Verdict:** **Verified** – session detail and participants return 200.

---

## 5. Comptes rendus (CR list) – `/comptes-rendus`

**Expected:**

- `GET /sessions` – sessions list (useSessions)
- `GET /sessions/dashboard/tutor` – “reports to submit” (useComptesRendus → fetchComptesRendus → fetchTutorDashboard)

**Observed:**  
- `GET /api/v1/sessions/dashboard/tutor` → **200**

**Verdict:** **Working.** Sessions list is shared with dashboard/sessions.

---

## 6. Élèves (students list) – `/students`

**Expected:**

- `GET /users/students` – list students in company (fetchStudents)

**Fix applied (backend):**
- `Get('students')` moved to immediately after `Get('login')` so it is registered before `Get(':id')` (avoids route matching `:id = 'students'` and ParseUUIDPipe 400).
- In `getStudents`: if `!req.user?.company_id`, throw `BadRequestException('User has no company')`.
- In `findStudentsByCompany`: if `!companyId`, throw `BadRequestException('companyId is required')`.

**Observed (before backend restart):**  
- `GET /api/v1/users/students` → **400**. After **restarting the backend**, expect either 200 (when user has company) or 400 with body message "User has no company" or "companyId is required".

**Verdict:** **Fix applied.** Restart backend and re-test Élèves tab; document result in this section if needed.

---

## 7. Profil (profile) – `/profile`

**Expected:**

- `GET /users/login` – current user profile (useProfile)
- `GET /gamification/me` – gamification state (useGamification)

**Observed:**  
- `GET /api/v1/users/login` → **200**  
- `GET /api/v1/gamification/me` → **200**

**Verdict:** **Working.**

---

## 8. Profile sub-screens (verified)

- **Ressources pédagogiques** – `GET /resources?page=1&pageSize=50` → **200** (verified). `GET /resources/:id` when opening a resource (not exercised in this run).
- **Voir le classement** – `GET /gamification/leaderboard?limit=20` → **200** (verified).
- **Historique d’activité** – `GET /activity-feed/me?limit=50` → **500** (verified; **failing** – backend error). `GET /gamification/me/history` not in batch (Historique uses activity-feed).
- **User preferences** – `GET /user-preferences` → **200** (seen on load). `PUT /user-preferences` on save not exercised.

---

## 9. Other endpoints (from codebase, not necessarily hit in this test)

- **Calendar** – `GET /calendar/events` (if used on dashboard or calendar screen).
- **Attendance history** – `GET /sessions/attendance-history` (query params).
- **Session reports (CR)** – `GET /sessions/:id/reports`, `GET /sessions/:id/reports/:reportId`, `POST /sessions/:id/reports`, `PATCH` for update.
- **AI / recording** – `POST /sessions/:id/ai/generate-from-recording` (when using AI CR from recording).

---

## What’s working correctly

- `GET /branding/complete?companyId=...` – **200**
- `GET /sessions` – **200**
- `GET /sessions/dashboard/tutor` – **200**
- `GET /users/login` – **200**
- `GET /gamification/me` – **200**

---

## What’s not called / not verified in this run

- `GET /sessions/report-kpis` – expected on dashboard; not in captured requests (may be called on first load).
- `GET /calendar/events` – if the dashboard or calendar tab calls it.
- `GET /sessions/:id/assignment-candidates` – only when `env.showAssignmentCandidates`; not in batch.
- `GET /resources/:id` – when opening a single resource (not exercised).

---

## What’s missing / broken

- **`GET /users/students`** – Backend fix applied (route order + company_id guards). Restart backend and re-test; expect 200 when user has company or 400 with clear message when not.
- **`GET /activity-feed/me`** – returns **500** on Historique d'activité screen. Backend investigation needed (logs + response body).

## How to re-run and extend this audit

1. Open app in browser (e.g. http://localhost:8081), open DevTools → Network, filter by “Fetch/XHR” or “api/v1”.
2. Reload and note all `/api/v1` requests on initial load.
3. Navigate to each main tab (Tableau de bord, Séances, Comptes rendus, Élèves, Profil) and note new requests.
4. Open a session detail and a CR detail; note session/reports/participants calls.
5. Open Profile sub-screens (Ressources, Classement, Historique) and note resources, gamification, activity-feed and user-preferences calls.
6. For any 4xx/5xx, check response body and backend logs to fix (e.g. 400 on `GET /users/students`).
