# E2E Endpoints Audit — Mobile App

This document maps **every screen and user action** in the mobile app to the **API endpoints** (and background logic) required so that when you switch from static data to the real API, the app is fully functional.

**Legend:**

- **On load** = API calls when the screen mounts or data is first needed
- **On action** = API calls triggered by a user click/post/update
- **Background** = Calls that run outside a specific screen (e.g. after login, sync, reminders)

---

## 1. App bootstrap & auth gate

**Flow:** After Firebase auth, the app must have **companyId** and **branding** before showing the main tabs. If `EXPO_PUBLIC_API_URL` is set, the app blocks on these.


| Step                      | Endpoint / logic                         | Purpose                                                                   |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| User logged in (Firebase) | **GET /users/login**                     | Get profile + `companyId`; store `companyId` in `companyStore`            |
| companyId available       | **GET /branding/complete?companyId=xxx** | Load theme, logos, colors; `BrandingProvider` exposes them                |
| Both done                 | —                                        | Navigate to `(tabs)`; splash / “Connexion et chargement du thème…” hidden |


**Backend:**  

- `GET /users/login` (Bearer Firebase JWT) → must return `id`, `companyId`, `firstName`, `lastName`, `phone`, `photoUrl`, etc.  
- `GET /branding/complete?companyId=...` (JWT) → theme + logos (see `CompleteBrandingDto` in mobile).

**Failure handling:**  

- 401/404 on `/users/login` → sign out.  
- Network error → fallback theme, set `profileFetchNetworkError`, still allow navigation.

---

## 2. Auth screens (before tabs)

### 2.1 Login — `(auth)/login`


| Trigger                   | Endpoint / logic                         | Purpose                                          |
| ------------------------- | ---------------------------------------- | ------------------------------------------------ |
| Submit email/password     | Firebase `signInWithEmailAndPassword`    | Authenticate                                     |
| After Firebase success    | **GET /users/login**                     | Verify user in backend; get `companyId` (see §1) |
| Phone login (native only) | Firebase Phone Auth (send OTP → confirm) | Then same **GET /users/login** when `apiUrl` set |


**Backend:** `GET /users/login` (see §1).

### 2.2 Forgot password — `(auth)/forgot-password` → `reset-password-otp` → `phone-otp` or email


| Trigger             | Endpoint / logic                  | Purpose                                     |
| ------------------- | --------------------------------- | ------------------------------------------- |
| Send reset (email)  | Firebase `sendPasswordResetEmail` | No backend call                             |
| Send reset (phone)  | Firebase Phone Auth (OTP)         | No backend call                             |
| Confirm OTP (phone) | Firebase `confirmPhoneOTP`        | Sign in; then user goes to set-new-password |
| Set new password    | Firebase `updatePassword`         | No backend call documented                  |


**Backend:** No session endpoints required for password reset; Firebase only.

### 2.3 Set new password — `(auth)/set-new-password`


| Trigger             | Endpoint / logic          | Purpose         |
| ------------------- | ------------------------- | --------------- |
| Submit new password | Firebase `updatePassword` | No backend call |


---

## 3. Tab: Dashboard — `(tabs)/index`

### On load


| Data                     | Endpoint / source                             | Used for                                                              |
| ------------------------ | --------------------------------------------- | --------------------------------------------------------------------- |
| Sessions list            | **GET /sessions** (or static)                 | Next session, calendar widget, “Séances cette semaine”, period filter |
| Report KPIs              | **GET /sessions/report-kpis**                 | missingReports, overdueReports, validatedReports, etc.                |
| User preferences         | **GET /user-preferences**                     | e.g. `rappelCR` for “Rappel CR” visibility                            |
| Dashboard KPIs (derived) | From sessions + report-kpis + static students | Cards: Séances, Élèves suivis, CR complétés, CR en retard             |


**Backend:**  

- `GET /sessions` — query: `dateFrom`, `dateTo`, `status`, etc. Response: array or `{ data, total, page, pageSize }` (mobile accepts both `data` and `items`).  
- `GET /sessions/report-kpis` — `{ missingReports, overdueReports, submittedPendingValidation, validatedReports }`.  
- `GET /user-preferences` — `{ isDarkMode?, interfaceConfigs? }`.

**Note:** “Élèves suivis” count: today mobile uses **static students** when not static data; backend has **GET /sessions/analytics/students** (KPIs), not a simple “list of students”. For E2E with API only, either backend exposes a “tutor’s students count” (e.g. in dashboard or report-kpis) or mobile keeps a static count.

### On action


| User action                        | Endpoint / logic                                          | Purpose                   |
| ---------------------------------- | --------------------------------------------------------- | ------------------------- |
| Pull to refresh                    | Refetch **GET /sessions** + **GET /sessions/report-kpis** | Update dashboard          |
| Tap period (Semaine / Mois)        | Local store only                                          | Filter sessions in period |
| Tap “Rejoindre” (next session)     | `Linking.openURL(session.joinLink)`                       | No API                    |
| Tap “Rédiger un CR” (next session) | Navigate to `/(tabs)/comptes-rendus/new?sessionId=...`    | No API                    |
| Tap event in calendar widget       | Navigate to `/(tabs)/sessions/[id]`                       | No API                    |
| Tap “Voir toutes les séances”      | Navigate to `/(tabs)/sessions`                            | No API                    |


---

## 4. Tab: Séances — `(tabs)/sessions`

### 4.1 List — `(tabs)/sessions/index`

**On load**


| Data     | Endpoint / source | Used for                                           |
| -------- | ----------------- | -------------------------------------------------- |
| Sessions | **GET /sessions** | List; filter by status/date; prefetch on row press |


**On action**


| User action                    | Endpoint / logic                                                    | Purpose              |
| ------------------------------ | ------------------------------------------------------------------- | -------------------- |
| Pull to refresh                | **GET /sessions**                                                   | Refresh list         |
| Tap a session row              | Navigate to `/(tabs)/sessions/[id]`; prefetch **GET /sessions/:id** | Detail screen        |
| Tap “Historique des présences” | Navigate to `/(tabs)/sessions/attendance-history`                   | No API on navigation |


### 4.2 Session detail — `(tabs)/sessions/[id]`

**On load**


| Data         | Endpoint / source                  | Used for                                                       |
| ------------ | ---------------------------------- | -------------------------------------------------------------- |
| Session      | **GET /sessions/:id**              | Header, format, join link, status, reportId (for “Voir le CR”) |
| Participants | **GET /sessions/:id/participants** | Presence list (names, attendanceStatus)                        |


**On action**


| User action                  | Endpoint / logic                                                                                                                                   | Purpose                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Tap “Rejoindre la séance”    | `Linking.openURL(session.joinLink)`                                                                                                                | No API                                                     |
| Tap “Voir le CR”             | Navigate to `/(tabs)/comptes-rendus/:reportId` (uses `session.reportId`)                                                                           | No API                                                     |
| Tap “Rédiger un CR”          | Navigate to `/(tabs)/comptes-rendus/new?sessionId=...`                                                                                             | No API                                                     |
| Tap a presence row (student) | If session `in_progress`: open modal (web) or Alert (native); then **PATCH /sessions/:id/participants/:participantId** with `{ attendanceStatus }` | Update presence; 403 if session closed/completed/cancelled |


**Backend (alignment):**  

- GET session: should return `establishment`, `room` (with `name`), `reportId` (or `crId`) for full UX (see `backend-api-alignment.md`).  
- PATCH participant: must return updated participant **with `user`** (firstName, lastName) so UI/cache stays correct.

### 4.3 Attendance history — `(tabs)/sessions/attendance-history`

**On load**


| Data    | Endpoint / source                                                      | Used for                                 |
| ------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| History | **GET /sessions/attendance-history?dateFrom=&dateTo=&page=&pageSize=** | Past sessions + participants (paginated) |


**On action**


| User action                    | Endpoint / logic                                  | Purpose |
| ------------------------------ | ------------------------------------------------- | ------- |
| Change date range / pagination | **GET /sessions/attendance-history** (new params) | Refetch |
| Tap a session row              | Navigate to `/(tabs)/sessions/[id]`               | No API  |


**Backend:** Response `{ items: [{ session, participants }], total, page, pageSize }`; participants with `user` (firstName, lastName).

---

## 5. Tab: Comptes rendus — `(tabs)/comptes-rendus`

### 5.1 List — `(tabs)/comptes-rendus/index`

**On load**


| Data              | Endpoint / source                                                      | Used for                            |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| Reports to submit | **GET /sessions/dashboard/tutor** → `reportsToSubmit` (or static list) | List of draft CRs; filter by status |


**Backend:** `GET /sessions/dashboard/tutor` returns `{ upcomingSessions, reportsToSubmit }`. Mobile maps `reportsToSubmit` to `CompteRendu[]`.

**On action**


| User action         | Endpoint / logic                                                   | Purpose      |
| ------------------- | ------------------------------------------------------------------ | ------------ |
| Pull to refresh     | Refetch **GET /sessions/dashboard/tutor** (via useComptesRendus)   | Refresh list |
| Tap “Rédiger un CR” | Navigate to `/(tabs)/comptes-rendus/new`                           | No API       |
| Tap a CR row        | Navigate to `/(tabs)/comptes-rendus/[id]` (with sessionId from CR) | No API       |


### 5.2 New CR — `(tabs)/comptes-rendus/new`

**On load**


| Data     | Endpoint / source                       | Used for                      |
| -------- | --------------------------------------- | ----------------------------- |
| Sessions | **GET /sessions**                       | Dropdown “Choisir une séance” |
| Profile  | **GET /users/login** (or profile query) | `authorId` for submit         |


**On action**


| User action | Endpoint / logic                                                                                               | Purpose                              |
| ----------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Submit form | **POST /sessions/:sessionId/reports** with `{ authorId, rating, comment, subject, status: 'submitted' }`       | Create report; then navigate to list |
| Offline     | Queue `cr_submit`; **useOfflineSync** later calls **POST /sessions/:sessionId/reports** (or submitCompteRendu) | Same                                 |


**Backend:** POST body: `authorId` (required), `rating`, `comment`, `subject`, `status`.

### 5.3 CR detail / edit — `(tabs)/comptes-rendus/[id]`

**On load**


| Data                | Endpoint / source                                                                             | Used for                   |
| ------------------- | --------------------------------------------------------------------------------------------- | -------------------------- |
| CR                  | **GET /sessions/:sessionId/reports/:reportId** (when apiUrl and sessionId known) or from list | Display; edit form prefill |
| Session (for label) | From useSessions or sessionId in route                                                        | Session date/label         |


**On action**


| User action | Endpoint / logic                                                                                          | Purpose                           |
| ----------- | --------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Submit edit | **PATCH /sessions/:sessionId/reports/:reportId** with `{ rating, comment, subject, status: 'submitted' }` | Update report; invalidate CR list |
| Offline     | Queue then **PATCH** on sync                                                                              | Same                              |


**Backend:** PATCH same shape; return updated report.

---

## 6. Tab: Élèves — `(tabs)/students`

### 6.1 List — `(tabs)/students/index`

**On load**


| Data     | Endpoint / source                       | Used for                     |
| -------- | --------------------------------------- | ---------------------------- |
| Students | **Static only** — `getStaticStudents()` | List; search by name/program |


**Backend:** There is **no GET /students** in the mobile app. Backend has `GET /sessions/analytics/students` (KPIs). So today the “Élèves” tab is **static-data only**. For full E2E with API:

- Either backend adds **GET /students** (or equivalent) scoped to the tutor/company, and mobile switches to it when `apiUrl` is set.
- Or mobile keeps static list and documents that “Élèves” is not backed by API yet.

### 6.2 Student detail — `(tabs)/students/[id]`

**On load**


| Data    | Endpoint / source              | Used for |
| ------- | ------------------------------ | -------- |
| Student | From list (same static source) | Detail   |


**On action**


| User action         | Endpoint / logic | Purpose                    |
| ------------------- | ---------------- | -------------------------- |
| (Any future action) | —                | Same as list: no API today |


---

## 7. Tab: Profil — `(tabs)/profile`

### 7.1 Profile home — `(tabs)/profile/index`

**On load**


| Data         | Endpoint / source                     | Used for                          |
| ------------ | ------------------------------------- | --------------------------------- |
| Profile      | **GET /users/login** (via useProfile) | Name, avatar, establishment, etc. |
| Gamification | **GET /gamification/me**              | XP, niveau, badges                |


**On action**


| User action              | Endpoint / logic                            | Purpose         |
| ------------------------ | ------------------------------------------- | --------------- |
| Tap “Modifier le profil” | Navigate to `/(tabs)/profile/edit`          | No API          |
| Tap “Historique”         | Navigate to `/(tabs)/profile/historique`    | No API          |
| Tap “Classement”         | Navigate to `/(tabs)/profile/classement`    | No API          |
| Tap “Ressources”         | Navigate to `/(tabs)/profile/ressources`    | No API          |
| Tap “Notifications”      | Navigate to `/(tabs)/profile/notifications` | No API          |
| Logout                   | Firebase signOut + clear companyId          | No backend call |


### 7.2 Edit profile — `(tabs)/profile/edit`

**On load**


| Data    | Endpoint / source                     | Used for                           |
| ------- | ------------------------------------- | ---------------------------------- |
| Profile | **GET /users/login** (via useProfile) | Prefill firstName, lastName, phone |


**On action**


| User action | Endpoint / logic                                           | Purpose                                  |
| ----------- | ---------------------------------------------------------- | ---------------------------------------- |
| Save        | **PATCH /users/me** with `{ firstName, lastName, phone? }` | Update profile; invalidate profile query |


**Backend:** `PATCH /users/me` — accept at least firstName, lastName, phone (and optionally photoUrl).

### 7.3 Historique (activity feed) — `(tabs)/profile/historique`

**On load**


| Data          | Endpoint / source                  | Used for                                           |
| ------------- | ---------------------------------- | -------------------------------------------------- |
| Activity feed | **GET /activity-feed/me?limit=50** | List of activities; tap can navigate to session/CR |


**On action**


| User action                       | Endpoint / logic                         | Purpose |
| --------------------------------- | ---------------------------------------- | ------- |
| Tap item (e.g. session completed) | Navigate to session or CR (from payload) | No API  |


**Backend:** `GET /activity-feed/me` — return array of activity items (shape expected by mobile types).

### 7.4 Classement (leaderboard) — `(tabs)/profile/classement`

**On load**


| Data        | Endpoint / source                          | Used for                       |
| ----------- | ------------------------------------------ | ------------------------------ |
| Leaderboard | **GET /gamification/leaderboard?limit=20** | `entries`, `myRank`, `myEntry` |


**Backend:** Response shape per mobile `LeaderboardResponse`.

### 7.5 Ressources — `(tabs)/profile/ressources` and `[id]`

**On load (list)**


| Data      | Endpoint / source                          | Used for |
| --------- | ------------------------------------------ | -------- |
| Resources | **GET /resources** (optional query params) | List     |


**On load (detail)**


| Data     | Endpoint / source      | Used for       |
| -------- | ---------------------- | -------------- |
| Resource | **GET /resources/:id** | Detail content |


**Backend:** `GET /resources`, `GET /resources/:id` — shapes per mobile types.

### 7.6 Notifications (preferences) — `(tabs)/profile/notifications`

**On load**


| Data        | Endpoint / source         | Used for                       |
| ----------- | ------------------------- | ------------------------------ |
| Preferences | **GET /user-preferences** | rappelCR, rappelSeance toggles |


**On action**


| User action                      | Endpoint / logic                                                             | Purpose                                 |
| -------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| Toggle rappel CR / rappel séance | **PUT /user-preferences** with full `interfaceConfigs.notifications`         | Save; invalidate user-preferences query |
| (Rappel séance)                  | Local notifications (expo-notifications) + **useSessions** for session times | No backend for scheduling               |


**Backend:** `PUT /user-preferences` — body includes `interfaceConfigs.notifications`.

---

## 8. Background / global

### 8.1 After login (see §1)

- **GET /users/login** → companyId + profile  
- **GET /branding/complete?companyId=** → theme

### 8.2 Session reminders

- **useSessionReminders** (in tab layout): uses **useSessions** (GET /sessions) + **useUserPreferences** (GET /user-preferences).  
- Schedules local notifications (expo-notifications) for “rappel séance”.  
- No backend call to “schedule” reminders; backend only provides session list and user prefs.

### 8.3 Offline sync — **useOfflineSync**

When app comes back online:


| Queue type          | Endpoint / logic                                                                     | Purpose              |
| ------------------- | ------------------------------------------------------------------------------------ | -------------------- |
| `cr_submit`         | **submitCompteRendu** → **POST /sessions/:sessionId/reports** (or PATCH if reportId) | Sync CR submit       |
| `attendance_update` | **PATCH /sessions/:sessionId/participants/:participantId** `{ attendanceStatus }`    | Sync presence update |


After each success: invalidate relevant queries (comptes-rendus, sessions, report-kpis, session participants).

### 8.4 Query persistence (React Query)

Persisted keys: `profile`, `sessions`, `sessions.report-kpis`, `comptes-rendus`, `gamification`, `activity-feed`, `session` (detail + participants).  
No extra endpoints; just cache rehydration from AsyncStorage.

---

## 9. Endpoint checklist (backend)


| Endpoint                              | Used by (screen / flow)                                | Backend exists | Notes                                                     |
| ------------------------------------- | ------------------------------------------------------ | -------------- | --------------------------------------------------------- |
| GET /users/login                      | Bootstrap, login, profile, CR new                      | ✅              | Must return companyId, profile fields                     |
| PATCH /users/me                       | Profile edit                                           | ✅              | firstName, lastName, phone                                |
| GET /branding/complete                | Bootstrap (theme)                                      | ✅              | companyId query param                                     |
| GET /sessions                         | Dashboard, sessions list, CR new, calendar, reminders  | ✅              | Response: data or items; status query lowercase           |
| GET /sessions/:id                     | Session detail, prefetch                               | ✅              | Include establishment, room, reportId (see alignment doc) |
| GET /sessions/:id/participants        | Session detail (presence)                              | ✅              | With user (firstName, lastName)                           |
| PATCH /sessions/:id/participants/:id  | Session detail (presence), offline sync                | ✅              | 403 when closed; return participant with user             |
| GET /sessions/report-kpis             | Dashboard KPIs                                         | ✅              |                                                           |
| GET /sessions/dashboard/tutor         | Comptes-rendus list, dashboard (indirect)              | ✅              | reportsToSubmit                                           |
| GET /sessions/attendance-history      | Attendance history screen                              | ✅              | items[], total, page, pageSize                            |
| GET /sessions/:id/reports             | (Optional; mobile uses dashboard + getReport)          | ✅              |                                                           |
| GET /sessions/:id/reports/:reportId   | CR detail                                              | ✅              |                                                           |
| POST /sessions/:id/reports            | CR new, offline sync                                   | ✅              | authorId required                                         |
| PATCH /sessions/:id/reports/:reportId | CR edit, offline sync                                  | ✅              |                                                           |
| GET /activity-feed/me                 | Profile → Historique                                   | ✅              |                                                           |
| GET /gamification/me                  | Profile home                                           | ✅              |                                                           |
| GET /gamification/me/history          | (Available; profile can use)                           | ✅              |                                                           |
| GET /gamification/leaderboard         | Profile → Classement                                   | ✅              |                                                           |
| GET /user-preferences                 | Dashboard (rappelCR), profile notifications, reminders | ✅              |                                                           |
| PUT /user-preferences                 | Profile → Notifications                                | ✅              |                                                           |
| GET /resources                        | Profile → Ressources list                              | ✅              |                                                           |
| GET /resources/:id                    | Profile → Ressources detail                            | ✅              |                                                           |
| GET /students                         | Élèves list                                            | ❌              | Not in backend; mobile static only — add or document      |


---

## 10. Summary: what to add or align for full E2E

1. **Sessions**
  - List: response shape (`data` vs `items`) — mobile already accepts both.
  - Query `status`: accept lowercase (e.g. `in_progress`).
  - GET /sessions/:id: return `establishment`, `room` (with name), `reportId`.
  - PATCH participant: return updated participant with `user` loaded.
2. **Students**
  - Either add **GET /students** (or equivalent) for tutor/company and use it in the Élèves tab, or keep static and document.
3. **Dashboard “Élèves suivis”**
  - Either expose a count from backend (e.g. in report-kpis or dashboard) or keep using static count when on API.
4. **Auth / branding**
  - Already required for bootstrap when apiUrl is set; no extra endpoints.
5. **Offline**
  - Same endpoints as online (POST/PATCH reports, PATCH participant); ensure 403/409 handling and cache invalidation as in mobile.

Once the above are done and the **GET /students** (or alternative) decision is made, switching off static data should give a full E2E functional app with every screen and click backed by the API.

---

## 11. Quick reference: endpoints per screen


| Screen / flow           | GET                                                 | POST                  | PATCH                                                      | PUT               |
| ----------------------- | --------------------------------------------------- | --------------------- | ---------------------------------------------------------- | ----------------- |
| **Bootstrap**           | /users/login, /branding/complete                    | —                     | —                                                          | —                 |
| **Login**               | /users/login (after Firebase)                       | —                     | —                                                          | —                 |
| **Dashboard**           | /sessions, /sessions/report-kpis, /user-preferences | —                     | —                                                          | —                 |
| **Sessions list**       | /sessions                                           | —                     | —                                                          | —                 |
| **Session detail**      | /sessions/:id, /sessions/:id/participants           | —                     | /sessions/:id/participants/:pid                            | —                 |
| **Attendance history**  | /sessions/attendance-history                        | —                     | —                                                          | —                 |
| **Comptes-rendus list** | /sessions/dashboard/tutor                           | —                     | —                                                          | —                 |
| **Comptes-rendus new**  | /sessions, profile                                  | /sessions/:id/reports | —                                                          | —                 |
| **Comptes-rendus [id]** | /sessions/:sessionId/reports/:id                    | —                     | /sessions/:sessionId/reports/:id                           | —                 |
| **Élèves**              | (none — static or future GET /students)             | —                     | —                                                          | —                 |
| **Profile**             | /users/login, /gamification/me                      | —                     | —                                                          | —                 |
| **Profile edit**        | (profile)                                           | —                     | /users/me                                                  | —                 |
| **Historique**          | /activity-feed/me                                   | —                     | —                                                          | —                 |
| **Classement**          | /gamification/leaderboard                           | —                     | —                                                          | —                 |
| **Ressources**          | /resources, /resources/:id                          | —                     | —                                                          | —                 |
| **Notifications**       | /user-preferences                                   | —                     | —                                                          | /user-preferences |
| **Offline sync**        | —                                                   | /sessions/:id/reports | /sessions/:id/participants/:pid, /sessions/:id/reports/:id | —                 |


