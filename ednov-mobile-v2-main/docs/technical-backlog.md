# Technical backlog — Switch from static data to API

This backlog lists tasks to complete so the mobile app is fully functional when using the real backend API instead of static data. It consolidates items from `backend-api-alignment.md` and `e2e-endpoints-audit.md`.

**Status legend:** `To do` | `In progress` | `Done`

---

## Backend

### B1. List sessions — response shape for mobile

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | High |
| **Area** | Backend — sessions |

**Description**  
Mobile expects the list-sessions response to be either a raw array or an object with an array in `items` or `data`. Backend currently returns `{ data, total, page, pageSize }`. Mobile already accepts `data` (see `services/sessions.ts`). Ensure the contract is documented and that mobile receives a non-empty array when there are results.

**Acceptance criteria**  
- [ ] GET /sessions response is documented (e.g. OpenAPI): `{ data: Session[], total, page, pageSize }`.
- [ ] When `apiUrl` is set, mobile list and dashboard display sessions from this response (no regression).

**Reference**  
`backend-api-alignment.md` §1, §10 item 1.

---

### B2. List sessions — accept lowercase `status` in query

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | High |
| **Area** | Backend — sessions |

**Description**  
Mobile sends `status` in lowercase (e.g. `in_progress`, `planned`). Backend DTO validates with `@IsEnum(SessionStatus)` where the enum is UPPERCASE. Filtering by status fails when mobile sends lowercase.

**Acceptance criteria**  
- [ ] GET /sessions accepts query param `status` in lowercase (e.g. `planned`, `in_progress`, `completed`, `closed`, `cancelled`).
- [ ] Backend normalizes to internal enum before applying the filter (or DTO/pipe accepts both cases).
- [ ] Mobile can filter sessions by status when calling the API.

**Reference**  
`backend-api-alignment.md` §1, §10 item 2.

---

### B3. GET session by id — return establishment and room with name

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | High |
| **Area** | Backend — sessions |

**Description**  
Session detail screen shows establishment and room names. Backend currently returns the raw Session entity without loading `establishment` or `room` relations, so the response only has `establishmentId` and `roomId`.

**Acceptance criteria**  
- [ ] GET /sessions/:id loads and returns `establishment` (at least `id`, `name`) and `room` (at least `id`, `name` when present).
- [ ] Mobile `mapRawToSession` can display establishment and room names on session detail and in lists that use this payload.

**Reference**  
`backend-api-alignment.md` §2, §10 item 3.

---

### B4. GET session by id — add reportId (or crId)

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | High |
| **Area** | Backend — sessions |

**Description**  
Mobile uses `reportId` (or `crId`) for the “Voir le CR” button. Session entity has no such field; the link is via `session_reports.session_id`. Backend should expose the report id when one exists for the session.

**Acceptance criteria**  
- [ ] GET /sessions/:id response includes `reportId` (or `crId`): the id of the session_report row for this session if it exists, otherwise `null`.
- [ ] Mobile can navigate to the correct CR from session detail without an extra call.

**Reference**  
`backend-api-alignment.md` §2, §10 item 4.

---

### B5. PATCH participant — return updated participant with user loaded

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | High |
| **Area** | Backend — sessions |

**Description**  
After updating attendance, mobile updates its cache with the returned participant. If the response does not include `user` (firstName, lastName), the UI/cache may be inconsistent. Backend currently returns the saved participant without re-loading the `user` relation.

**Acceptance criteria**  
- [ ] PATCH /sessions/:sessionId/participants/:participantId response includes the participant with `user` loaded (at least `firstName`, `lastName`).
- [ ] Mobile presence list updates correctly after a presence change (no missing names).

**Reference**  
`backend-api-alignment.md` §4, §10 item 5.

---

### B6. (Optional) Tutor dashboard — include establishment/room/reportId in sessions

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | Low |
| **Area** | Backend — sessions |

**Description**  
GET /sessions/dashboard/tutor returns `upcomingSessions`. If the dashboard UI needs establishment, room, or reportId for each session, include them (same shape as GET /sessions/:id). Otherwise this can be skipped.

**Acceptance criteria**  
- [ ] Product decision: dashboard needs these fields or not.
- [ ] If yes: upcomingSessions items include establishment, room, reportId (or document that mobile should load session detail when navigating).

**Reference**  
`backend-api-alignment.md` §6, §10 item 6.

---

### B7. GET students (or equivalent) — list students for Élèves tab

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | High |
| **Area** | Backend — new endpoint |

**Description**  
The Élèves tab currently uses static data only; there is no GET /students in the backend. Backend has GET /sessions/analytics/students (KPIs), not a list of students. To make the Élèves tab API-driven, add an endpoint that returns the list of students (e.g. for the company or for the current tutor).

**Acceptance criteria**  
- [ ] New endpoint: e.g. GET /students (or GET /tutor/students, or under companies/…), scoped by company and optionally by tutor.
- [ ] Response: array of students with at least `id`, `firstName`, `lastName`, and optionally `program` (or equivalent).
- [ ] Mobile can switch from static data to this endpoint when `apiUrl` is set (see M2).

**Reference**  
`e2e-endpoints-audit.md` §6 (Élèves), §9 checklist, §10 Summary.

---

## Mobile

### M1. Dashboard — “Élèves suivis” count when using API

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | Medium |
| **Area** | Mobile — dashboard |

**Description**  
`useDashboardKpis` uses `getStaticStudents().length` for “Élèves suivis” when on static data. When using the API, there is no students list endpoint yet; after B7, the count could come from GET /students length or from a dedicated count (e.g. from report-kpis or dashboard) if the backend exposes it.

**Acceptance criteria**  
- [ ] When `apiUrl` is set and static data off: “Élèves suivis” uses a sensible source (e.g. GET /students length once B7 exists, or a backend count if added).
- [ ] When static data is on: keep current behavior (static students count).

**Reference**  
`e2e-endpoints-audit.md` §3 (Dashboard), §10 Summary.

---

### M2. Élèves tab — consume GET /students when available

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | High |
| **Area** | Mobile — students |

**Description**  
`services/students.ts` always uses `getStaticStudents()` when not using static data (with a comment that backend has no GET /students). Once B7 is done, call the new endpoint and map the response to the existing `Student` type.

**Acceptance criteria**  
- [ ] When `apiUrl` is set and static data off: fetchStudents() calls GET /students (or the agreed URL), maps response to `Student[]`.
- [ ] When static data on or no apiUrl: keep current static list.
- [ ] Élèves list and detail screens work with API data (search, navigation).

**Reference**  
`e2e-endpoints-audit.md` §6, §10 Summary; `services/students.ts`.

---

### M3. (Optional) E2E / manual test checklist when switching off static data

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | Medium |
| **Area** | QA / docs |

**Description**  
Document a short E2E or manual test checklist to run after setting `EXPO_PUBLIC_USE_STATIC_DATA=false` and `EXPO_PUBLIC_API_URL` to the backend: login, dashboard, sessions list/detail, presence update, CR list/new/edit, profile, historique, classement, ressources, notifications, élèves (if B7+M2 done), offline sync.

**Acceptance criteria**  
- [ ] Checklist exists (e.g. in `docs/` or `test-report-presence-seance.md` style) and covers main flows per screen.
- [ ] Team can use it to validate the “switch to API” release.

**Reference**  
`e2e-endpoints-audit.md` full document.

---

## Summary table

| ID  | Title | Priority | Area |
|-----|--------|----------|------|
| B1  | List sessions — response shape for mobile | High | Backend |
| B2  | List sessions — accept lowercase status | High | Backend |
| B3  | GET session by id — establishment & room | High | Backend |
| B4  | GET session by id — reportId | High | Backend |
| B5  | PATCH participant — return user | High | Backend |
| B6  | (Optional) Dashboard tutor — establishment/room/reportId | Low | Backend |
| B7  | GET students for Élèves tab | High | Backend |
| M1  | Dashboard — Élèves suivis count with API | Medium | Mobile |
| M2  | Élèves tab — consume GET /students | High | Mobile |
| M3  | (Optional) E2E checklist for API switch | Medium | QA/docs |

**Recommended order for “switch to API”:**  
B1 → B2 → B3 → B4 → B5 (sessions + presence fully aligned), then B7 + M2 (Élèves), then M1, then B6 and M3 if needed.

---

**AI features (Intelligence artificielle)** are in a separate backlog: [ai-backlog.md](ai-backlog.md) — to be developed later.





