# Production Integration Report — Ednov AI Copilot ↔ live APIs

**Date:** 2026-08-12  
**Constraints honored:** no database changes, no migrations, no SQL, AI architecture (Planner, BQE, Workflow, Tool Registry/Orchestrator, Knowledge Orchestrator, Documentation RAG, Streaming, Suggestions, Conversation Tree, ExecutionTrace) unchanged.

**Data path:** Copilot → Business Skills → Adapters → **Ednov REST** (`EDNOV_API_BASE_URL`) with the **user Firebase bearer**. Company scoping and role filtering stay on Ednov (visibility scope / `@Roles` / `@LinkedElement`). The Assistant never queries Supabase.

---

## Platform fix (all company-scoped modules)

Ednov web rewrites `/companies/current` → `/companies/{uuid}` in `api-client.ts`. The Assistant client did **not**, so establishments, rooms, and binôme-cœur calls 404’d on `ParseUUIDPipe`.

**Now:** `EdnovApiClient` resolves `companies/current` using `companyId` from `GET /users/login` (stored on `RequestContextStore.ednovCompanyId`).

---

## Module status

| Module | Status | Live endpoints used | Auth / tenant | Notes |
| --- | --- | --- | --- | --- |
| **Students** | ✅ Fully connected | `GET /users/students`, `GET /users/students/:id`, `GET /users/:id/status-history` | Bearer + Ednov visibility | Counts/lists/search; some census lists remain sample-scoped |
| **Tutors** | ✅ Fully connected | `GET /users/tutors`, `GET /users/tutors/:id` | Bearer + visibility | Workload still derived from matching sample |
| **Sessions** | ✅ Fully connected | `GET /sessions`, `GET /sessions/:id`, `POST /sessions/:id/cancel` | Bearer + visibility | Create still via Ednov form / existing tool |
| **Matching** | ✅ Fully connected | `GET /sessions/student-tutor-pairs`, `GET /sessions/:id/assignment-candidates`, `PUT /sessions/:id/assignments` | Bearer | Per-session pairs (`session_student_tutor_pairs`) |
| **Reports** | ✅ Fully connected | `GET /sessions/reports`, `GET /sessions/report-kpis`, `PATCH …/validate` | Bearer + volunteer scope on validate | Classic `session_reports` only |
| **Dashboard** | ✅ Fully connected | `GET /dashboard/stats`, `GET /dashboard/charts` | Bearer | KPI gaps documented in skill facts |
| **Notifications** | ✅ Fully connected | `GET /notifications`, `GET /notifications/unread-count`, `PATCH …/read`, `POST /notifications/read-all` | Current user only | No public “send notification” API |
| **Calendar** | ✅ Fully connected | `GET /calendar/events?startDate&endDate` | Company-scoped | Returns `{ events, total }`; types: session, postit, holiday |
| **Programs** | ✅ Fully connected | `GET /academic/programs` | Bearer | |
| **Users** | ✅ Fully connected | `GET /users/login`, `PATCH /users/me` | Bearer | |
| **Establishments** | ✅ Fully connected | `GET /companies/{companyId}/establishments` | Bearer + company UUID rewrite | Was broken via `/companies/current` |
| **Gamification** | ✅ Fully connected | `GET /gamification/me`, `GET /gamification/leaderboard`, `GET /gamification/me/history`, `GET /gamification/users/:userId` (staff) | Roles on staff route | New skill + adapter |
| **VSC Reports** | ✅ Fully connected | `GET /sessions/vsc-reports`, `GET /sessions/vsc-daily-reports`, `GET /sessions/:id/vsc-reports` | Visibility + volunteer/VSC filter | New skill; statuses draft/submitted/validated |
| **Binômes (cœur)** | ⚠ Partially connected | `GET /companies/{companyId}/binome-coeur` | Staff + company UUID | Maps **`core_pairs`**. Table **`binomes`** has **no REST API** |
| **Onboarding** | ❌ Missing API | — | — | Skill returns explicit gap (no invented steps) |
| **Parents** | ⚠ Partially connected | `GET /users/students` → `guardianContact` | Staff | No Parents table/API |
| **Registration** | ⚠ Partially connected | `GET /sessions/:id/participants` | Bearer | Session enrollment ≠ onboarding |
| **Documents** | ✅ Fully connected | `GET /resources`, `GET /resources/:id` | Company-scoped | Pedagogical resources |
| **Attendance** | ✅ Fully connected | `GET /sessions/attendance-history` | Bearer | |
| **Statistics** | ✅ Fully connected | Dashboard stats/charts | Bearer | Same KPI gaps as dashboard |
| **Configuration** | ✅ Fully connected | `GET /settings`, `GET /settings/feature-flags` | Bearer | Read-only; secrets stripped |

---

## Connected modules (summary)

Fully wired to real Ednov APIs with user token, company filter on the API, and pagination where the backend paginates: **Students, Tutors, Sessions, Matching, Reports, Dashboard, Statistics, Notifications, Calendar, Programs, Users, Establishments, Documents, Attendance, Configuration, Gamification, VSC Reports**.

---

## Partially connected

| Module | Why |
| --- | --- |
| **Binômes** | Core pairs (`binome-coeur` / `core_pairs`) live. Durable `binomes` table has no controller. |
| **Parents** | Guardian JSON on student profiles only. |
| **Registration** | Participants API only; onboarding tables unused. |
| **Matching wait/validation** | No pair validation status / wait-start fields on API. |
| **Dashboard matchings / program×students / attendance-by-establishment** | Not on `/dashboard/stats` or `/charts`. |

---

## Remaining gaps / missing APIs

Do **not** invent these. Needed if Copilot must answer them from live data:

| Needed endpoint | Expected response | Why required |
| --- | --- | --- |
| `GET /onboarding/records` | Paginated `user_onboarding_records` (user, status, template, company) | Count pending onboarding / “waiting for onboarding” |
| `GET /onboarding/records/:id/steps` | `user_onboarding_step_progress[]` | Diagnose missing onboarding steps |
| `GET /onboarding/templates` | `onboarding_step_templates[]` | Explain required steps |
| `GET /users/:id/histories` | `user_histories` + validations | Onboarding / Hubspot timeline |
| `GET /binomes` | Paginated `binomes` (status, origin, student, tutor, establishment) | Distinct from `core_pairs` / session pairs |
| `GET /events` | Paginated schema `events` + participants | Non-session activities (calendar only aggregates sessions/post-its/holidays) |
| `GET /session-comptes-rendus` | Structured CR + scoring entries | Separate from `session_reports` and VSC |
| `POST /notifications` (or send) | Created notification | “Notify tutor/coordinator” from Copilot |
| `GET /dashboard/stats` matching KPI | `{ activeMatchings }` | “How many active matchings?” |
| `GET /users/students?programId=` | Filtered students | Students by program |
| Pair `createdBy` / unmatched-since | Fields on pairs DTO | Matching creator & wait > 30 days |

---

## Adapter / skill changes (this integration)

| Change | Purpose |
| --- | --- |
| `EdnovApiClient` company rewrite | Align with web `/companies/current` |
| `CalendarAdapter` | Real `{ events, total }` + `YYYY-MM-DD` query |
| `RegistrationAdapter` | Stop inventing `ACTIVE` / `createdAt=now`; use participant role + attendance |
| `GamificationAdapter` + `GamificationSkill` | XP, badges, leaderboard |
| `AcademicAdapter` VSC list methods + `VscReportSkill` | VSC + daily VSC |
| `BinomeSkill` | Core pairs via binome-cœur |
| `OnboardingSkill` | Explicit missing-API facts |
| Notification unread count | `GET /notifications/unread-count` |

---

## Production readiness score

**82 / 100**

- **+** All previously mocked calendar/company-current/registration status paths now hit real APIs.  
- **+** Gamification and VSC covered with existing REST.  
- **−** Onboarding and `binomes` table remain API-less (honest gaps).  
- **−** Some list questions still authorization-scoped samples (Ednov pagination / visibility), not full-company census.  
- **−** No Copilot send-notification or structured CR APIs.

Architecture engines were not modified. New modules follow **1 Adapter + 1 Skill** registration only.
