# Schema ↔ AI Copilot Integration Report

**Source of truth:** `docs/database/schema.sql` (production Supabase schema dump — context only, not executable).  
**Scope:** Read-only analysis of schema entities vs Assistant Business Skills, Ednov REST adapters, and knowledge providers.  
**Constraints honored:** No DB changes, no migrations, no SQL execution, no Copilot switch from Ednov REST adapters to direct Supabase queries. AI architecture (Planner, BQE, Orchestrators) unchanged.

**Date:** 2026-08-12  
**Files modified:** this report only.

---

## 1. Schema overview (domains / modules)

**~100 tables** in `public`, multi-tenant around **`companies`**. Hub entity for operations is **`sessions`**; identity is **`users`** (+ roles/profiles).

| Domain | Tables (representative) | Role for Copilot |
| --- | --- | --- |
| **Tenant / org** | `companies`, `establishments`, `rooms`, `departments`, `partners`, `foot_clubs`, `establishment_coordinators`, `establishment_specialties`, `establishment_prospection_status_history`, `contact_functions` | Schools, quotas, prospection, rooms |
| **Identity / RBAC** | `users`, `roles`, `user_roles`, `profiles`, `user_profiles`, `role_groups`, `user_establishments`, `user_programs`, `rules`, `rule_overrides`, `interface_elements`, `role_interface_elements`, `user_interface_preferences` | Students/tutors/volunteers/parents via roles + profile category; guardians in JSON |
| **Academic catalog** | `programs`, `levels`, `subjects`, `school_years`, `school_year_quarters`, `school_classes`, `specialties`, `specialty_levels`, `user_profile_specialties`, `vacation_zones`, `holidays`, `catalog_options`, `activity_types`, `activities` | Programs ≠ “courses”; sessions carry subject/level JSON arrays |
| **Sessions** | `session_configs`, `session_configurations`, `sessions`, `session_participants`, `assignments`, `session_status_history`, `session_groups`, `session_student_tutor_pairs`, `core_pairs`, `binomes`, `livekit_rooms`, `session_presence_events`, `session_ai_chat_messages`, `session_student_scorings`, `session_light_scorings` | Planning, attendance, matching, visio |
| **Reports / CR** | `session_reports`, `vsc_reports`, `vsc_daily_reports`, `session_comptes_rendus`, `compte_rendu_scoring_entries`, `compte_rendu_events` | Two CR models (classic `session_reports` + structured `session_comptes_rendus`) |
| **Events** | `events`, `event_participants`, `event_unregistered_participants`, `event_syntheses`, `event_activities` | Non-session calendar activities |
| **Onboarding / registration** | `onboarding_step_templates`, `user_onboarding_records`, `user_onboarding_step_progress`, `email_otp_challenges`, `user_histories`, `user_history_onboarding_steps`, `user_history_validations`, `tutor_criminal_records`, `student_status_history` | True “inscription” lifecycle ≠ session enrollment |
| **Notifications / comms** | `notifications`, `email_templates`, `post_its`, `post_it_shares`, `assigned_post_it_templates` | In-app alerts, sticky notes |
| **Documents / resources** | `pedagogical_resources`, `media_assets`, `document_templates` | Pedagogy resources vs branding media |
| **Gamification** | `gamification_*`, `tutor_gamification` | XP, badges, challenges (no dedicated skill) |
| **Config / branding** | `company_settings`, `feature_flags`, `brandings`, `branding_histories`, `themes`, `ui_configurations` | Settings / flags (read-only via Copilot) |
| **Infra / ops** | `migrations`, `audit_logs`, `outbox_events`, `processed_events`, `idempotency_keys` | Not Copilot business domains |

### Naming note (API vs DB)

Ednov REST DTOs use **camelCase** (`firstName`, `assignmentSource`, `sessionDate`). Schema columns are **snake_case** (`first_name`, `assignment_source`, `session_date`). Adapters already normalize camelCase + occasional snake_case aliases. That is correct for REST — not a reason to query Supabase from the Assistant.

---

## 2. Entity list + FK graph summary

### Hub entities

| Entity | Inbound FKs (approx.) | Outbound / notes |
| --- | --- | --- |
| `companies` | ~70 `company_id` refs | Tenant root |
| `users` | Many role FKs (`managed_by`, `author_id`, `tutor_user_id`, …) | Soft roles via `user_roles` + `profiles.category` |
| `establishments` | sessions, events, rooms, pairs, reports | `company_id`, optional `department_code` → `departments` |
| `sessions` | ~13 `session_id` refs | Heavy: room, program, school_year, activity, livekit, session_group, JSON subject/level ids |
| `events` | participants, syntheses, activities | Parallel lifecycle to sessions |
| `programs` / `subjects` / `levels` / `school_years` | catalog + session denorm | Programs are company-scoped; no establishment FK on `programs` |
| `session_reports` / `session_comptes_rendus` | validation / scoring children | Distinct status enums |

### Important business FKs (non-exhaustive)

```
companies
  ├── establishments ── rooms
  │                 ├── establishment_coordinators → users
  │                 └── establishment_specialties → specialties
  ├── users ── user_roles → roles
  │         ├── user_profiles → profiles, levels, school_classes
  │         │                └── user_profile_specialties → specialties
  │         ├── user_establishments → establishments
  │         └── user_programs → programs
  ├── programs, levels, subjects, school_years, activities
  ├── sessions → establishments, rooms, programs, school_years, activities,
  │              session_configurations, livekit_rooms, session_groups
  │     ├── session_participants → users
  │     ├── session_student_tutor_pairs → users (student, tutor)
  │     ├── assignments → users (volunteer)
  │     ├── session_reports → users (author, validated_by)
  │     └── session_comptes_rendus → compte_rendu_* 
  ├── core_pairs (binôme cœur) → users, establishments, subjects
  ├── binomes → users, establishments, school_years, sessions
  ├── events → … → event_participants / event_activities
  └── notifications → users
```

**~216** foreign-key constraints in the dump. Highest fan-in: `companies`, then `users`, `sessions`, `establishments`.

### Circular / dump-order caveats

- `establishments.managed_by_id` → `users` while `users.company_id` → `companies` (ordering in dump is not executable).
- `sessions.livekit_room_id` ↔ `livekit_rooms.session_id` (mutual).
- `session_groups` declares **no FK constraints** in the dump despite being referenced by `sessions.session_group_id`.

---

## 3. M2M / join tables

### Pure / classic M2M

| Join table | Links | Notes |
| --- | --- | --- |
| `user_roles` | users ↔ roles | + `role_label`, `mode` |
| `user_establishments` | users ↔ establishments | + `company_id` |
| `user_programs` | users ↔ programs | |
| `user_profile_specialties` | user_profiles ↔ specialties | Composite PK |
| `establishment_specialties` | establishments ↔ specialties | Composite PK |
| `specialty_levels` | specialties ↔ levels | Composite PK |
| `event_activities` | events ↔ activities | Composite PK |
| `role_interface_elements` | roles ↔ interface_elements | RBAC UI |
| `gamification_user_badges` | users ↔ badges | |
| `gamification_challenge_progress` | users ↔ challenges | |

### Assignment / pair joins (business-critical)

| Table | Semantics | Copilot surface today |
| --- | --- | --- |
| `session_participants` | Session ↔ user + **role** + **attendance_status** | Session / attendance / registration (via participants API) |
| `session_student_tutor_pairs` | Per-session student–tutor match + `assignment_source` | Matching skill + `/sessions/student-tutor-pairs` |
| `core_pairs` | Persistent “binôme cœur” (FK names still say `binome_coeur_*`) | Matching `listBinomeCoeur` → `/companies/current/binome-coeur` |
| `binomes` | Richer durable binôme record (status, origin, denormalized names) | Partially overlapping with core_pairs; **no first-class skill** |
| `assignments` | Session ↔ **volunteer** only | Not the same as student–tutor pairs |
| `event_participants` | Event ↔ user + role + attendance | Calendar/events gap |
| `post_it_shares` | post_its ↔ users | No skill |

---

## 4. Skill ↔ table mapping matrix

Skills live under `Assistant/assistant-backend/src/modules/business-skills/skills/*` and **must** call Ednov via adapters (see `BusinessSkill` contract).

| Skill ID | Primary schema entities | Related / secondary | Coverage |
| --- | --- | --- | --- |
| `student` | `users` (+ student roles), `user_profiles`, `user_establishments`, `student_status_history` | `levels`, `school_classes`, `specialties`, pairs | Strong via `/users/students` |
| `tutor` | `users` (+ tutor roles), `user_profiles`, `tutor_criminal_records` | pairs, gamification (indirect) | Strong via `/users/tutors` |
| `parent` | **No `parents` table** — `user_profiles.guardian_contact` JSON; optional parent roles on `roles` / participants | `users` | Weak / embedded only |
| `user` | `users`, `user_profiles` | `user_roles` | Self/profile via `/users/login`, `/users/me` |
| `matching` | `session_student_tutor_pairs`, `core_pairs` | `binomes`, `session_participants`, `assignments` | Strong for pairs; `binomes` table underused |
| `session` | `sessions`, `session_participants`, `session_groups`, `session_configurations` | `rooms`, `activities`, LiveKit | Strong list/get/create/cancel |
| `program` | `programs`, `user_programs` | subjects/levels (denorm on sessions) | Strong list/search |
| `establishment` | `establishments`, `rooms`, coordinators/specialties | prospection history | Strong list/get |
| `registration` | **Semantic mismatch:** skill ≈ session participation; schema onboarding = `user_onboarding_*`, `user_histories` | `session_participants`, `user_programs` | Partial — enrollment ≠ onboarding |
| `attendance` | `session_participants.attendance_status`, `sessions.session_attendance`, `session_presence_events` | LiveKit | Via attendance-history API |
| `report` | `session_reports` (statuses match skill) | `session_comptes_rendus`, `vsc_reports`, `vsc_daily_reports` | Strong for classic CR; structured/VSC CR **gap** |
| `notification` | `notifications` | email_templates | Strong list/read |
| `calendar` | Aggregated API `/calendar/events` → may blend `sessions` + `events` | `holidays`, `vacation_zones` | Partial — no dedicated events skill |
| `document` | `pedagogical_resources` (via `/resources`) | `media_assets`, `document_templates` | Partial |
| `configuration` | `company_settings`, `feature_flags` | branding/themes/UI | Read-only via `/settings*` |
| `dashboard` | Aggregates over users/sessions/establishments/programs | charts by establishment | KPI API — not a table |
| `statistics` | Same as dashboard + comparisons | — | KPI/chart APIs |

---

## 5. Adapter ↔ table mapping

Adapters: `Assistant/assistant-backend/src/modules/integration/adapters/*` — all use `EdnovApiClient` (user bearer).

| Adapter | Ednov surfaces (examples) | Schema entities |
| --- | --- | --- |
| `user.adapter` | `/users/login`, `/users/me`, `/users/students`, `/users/tutors`, `/users/:id/status-history` | `users`, `user_profiles`, `user_roles`, `user_establishments`, `student_status_history` |
| `academic.adapter` | `/sessions`, `/sessions/reports`, `/sessions/report-kpis`, `/companies/current/establishments`, programs/subjects | `sessions`, `session_participants`, `session_reports`, `establishments`, `programs`, `subjects` |
| `matching.adapter` | `/sessions/student-tutor-pairs`, `/sessions/:id/assignments`, `/companies/current/binome-coeur` | `session_student_tutor_pairs`, `session_participants`, `core_pairs` |
| `registration.adapter` | Derives “registrations” from sessions + participants | `sessions`, `session_participants` (not `user_onboarding_*`) |
| `calendar.adapter` | `/calendar/events` | Likely `sessions` and/or `events` (API composite) |
| `notification.adapter` | `/notifications`, unread/read | `notifications` |
| `resource.adapter` | `/resources` | `pedagogical_resources` |
| `settings.adapter` | `/settings`, `/settings/feature-flags` | `company_settings`, `feature_flags` (+ possibly branding) |
| `dashboard.adapter` | dashboard stats/charts endpoints | Derived aggregates |

### Knowledge providers ↔ schema

Registry: `application-provider.registry.ts`.

| Provider | Data path | Schema alignment |
| --- | --- | --- |
| `page-context` | UI selection only | No table |
| `business-intelligence` | Skills / BQE | Indirect |
| `user-profile` | Context / Ednov | `users` / profiles |
| `course` | `AcademicAdapter.listProgramsAsCourses` | Maps **programs/sessions → “Course” view** (Assistant concept, not a `courses` table) |
| `tutor` / `student` | `UserAdapter` | `users` (+ profiles) |
| `registration` | `RegistrationAdapter` | Participants, not onboarding tables |
| `program` | `AcademicAdapter` | `programs` |
| `faq` / `policy` | Static / docs | No DB |

---

## 6. Missing mappings / gaps

### A. Schema domains with no Business Skill

| Gap domain | Tables | Impact |
| --- | --- | --- |
| Gamification | `gamification_*`, `tutor_gamification` | Cannot answer XP/badge/challenge questions from live skills |
| Structured comptes-rendus | `session_comptes_rendus`, scoring/events | Skill `report` targets `session_reports` statuses only |
| VSC reporting | `vsc_reports`, `vsc_daily_reports` | No VSC skill |
| Events (non-session) | `events`, `event_*` | Calendar may partially cover; no list/search/CRUD skill |
| Durable `binomes` | `binomes` | Matching uses pairs + optional core_pairs API |
| Onboarding / Hubspot history | `user_onboarding_*`, `user_histories*` | Registration skill does not map here |
| Post-its | `post_its`, shares, templates | Uncovered |
| Partners / foot clubs / catalog_options | org extras | Uncovered |
| Presence / LiveKit detail | `livekit_rooms`, `session_presence_events` | Attendance may skim; no deep skill |
| Session AI chat store | `session_ai_chat_messages` | Separate from Assistant Copilot |
| Scoring | `session_student_scorings`, `session_light_scorings` | Uncovered |

### B. Skills / providers without a 1:1 table

| Surface | Reality |
| --- | --- |
| `course` knowledge provider | No `courses` table — facade over `programs` / `sessions` |
| `parent` skill | No parents entity — `guardian_contact` JSON on `user_profiles` |
| `dashboard` / `statistics` | Computed endpoints, not tables |
| `registration` skill | Name suggests onboarding; implementation is session enrollment |

### C. Dual / overlapping models (confusion risk for schema-aware prompts)

1. **`session_reports`** vs **`session_comptes_rendus`** — different status enums (`to_complete`/`draft`/`submitted`/… vs `a_saisir`/`saisi`/`valide`/…).
2. **`core_pairs`** vs **`binomes`** vs **`session_student_tutor_pairs`** — ephemeral session match vs persistent cœur vs rich binôme.
3. **`assignments`** (volunteers) vs matching **assignments** API (student–tutor).
4. **`session_configs`** vs **`session_configurations`**.

### D. Field / labeling notes (already mostly handled)

| Topic | Assessment |
| --- | --- |
| `assignmentSource` / `assignment_source` | Matching adapter already aliases both |
| `studentUser` / `tutorUser` embeds | Normalized in matching adapter |
| Program `name` vs API `label` | Academic adapter accepts both |
| Notification `body` / `message` / `content` | Notification adapter aliases |
| Resource `title` / `name` | Resource adapter aliases |
| Users `first_name` (DB) vs `firstName` (API) | Correct REST mapping; do not snake_case API calls |

**No adapter rewrite performed** — existing aliases are sufficient; further changes would risk breaking Ednov DTO contracts.

---

## 7. Recommended future adaptations (do **not** implement DB layer)

Priority for a schema-aware Copilot that **keeps Ednov REST**:

1. **Documentation / planner hints (safe)**  
   - Encode entity vocabulary in skill/domain docs: `programs` ≠ courses; `session_reports` ≠ `session_comptes_rendus`; `core_pairs` = binôme cœur; `binomes` = durable matching record.  
   - Clarify `registration` = session participation; onboarding = `user_onboarding_*` (future skill or adapter methods when APIs exist).

2. **Comment-only map helpers on adapters (optional, low risk)**  
   - File-header JSDoc: `/** Schema: session_student_tutor_pairs, core_pairs */` etc.  
   - Prefer reporting over code churn unless a concrete DTO bug appears.

3. **New Ednov-backed skills (when APIs exist)** — still no Supabase client:  
   - `event` skill → `/events`  
   - `compte-rendu` / structured report skill → comptes-rendus endpoints  
   - `vsc-report` skill  
   - `gamification` skill  
   - `onboarding` skill → onboarding records  
   - Optional `binome` skill distinguishing `binomes` vs `core_pairs`

4. **Registration adapter honesty**  
   - Rename facts/labels from “registration/enrollment” to “session participation” **or** add real onboarding API mapping when available — avoid implying `user_onboarding_records` coverage.

5. **Parent skill**  
   - Document that facts come from `user_profiles.guardian_contact`; never invent a parents table.

6. **Explicit non-goals**  
   - Do not add `@supabase/supabase-js` or Prisma-against-prod into skills.  
   - Do not generate migrations from this dump.  
   - Keep Planner / BQE / Orchestrator contracts; only expand skill registry + adapters.

---

## 8. Production readiness for schema-aware Copilot

| Criterion | Status |
| --- | --- |
| Core tutoring ops (students, tutors, sessions, establishments, programs, pairs, classic reports, notifications, KPIs) | **Ready** via Ednov adapters |
| Schema vocabulary fidelity in prompts | **Partial** — dual CR/matching models can confuse answers without explicit hints |
| Full schema coverage | **Not ready** — gamification, events, VSC CR, onboarding, post-its, scoring largely uncovered |
| Direct DB awareness in Copilot | **Intentionally out of scope** — architecture is API-mediated |
| Field naming Ednov ↔ schema | **Good enough** — camelCase DTOs + existing aliases |
| Multi-tenant safety | Relies on Ednov auth + company scoping; Copilot must not bypass with service-role Supabase |

**Verdict:** Copilot is **production-capable for the Ednov-covered operational core**, and **schema-aware at the documentation/mapping layer**. It is **not** a full schema mirror. Next readiness step is vocabulary + skill gaps via REST — not a database client.

---

## 9. Files modified

| File | Change |
| --- | --- |
| `docs/database/SCHEMA_AI_INTEGRATION_REPORT.md` | **Created** (this report) |
| Adapters / skills / SQL | **None** |

---

## Appendix A — Full table inventory (100)

`migrations`, `companies`, `establishments`, `rooms`, `users`, `roles`, `user_roles`, `profiles`, `user_profiles`, `programs`, `levels`, `subjects`, `school_years`, `vacation_zones`, `holidays`, `session_configs`, `sessions`, `session_participants`, `assignments`, `session_reports`, `vsc_reports`, `company_settings`, `feature_flags`, `brandings`, `branding_histories`, `themes`, `media_assets`, `email_templates`, `document_templates`, `ui_configurations`, `audit_logs`, `outbox_events`, `processed_events`, `idempotency_keys`, `rules`, `rule_overrides`, `user_interface_preferences`, `interface_elements`, `role_interface_elements`, `post_its`, `post_it_shares`, `activity_types`, `activities`, `gamification_niveaux`, `gamification_badges`, `gamification_badge_conditions`, `gamification_xp_regles`, `tutor_gamification`, `gamification_xp_logs`, `gamification_user_badges`, `gamification_challenges`, `gamification_challenge_progress`, `session_status_history`, `pedagogical_resources`, `session_student_tutor_pairs`, `core_pairs`, `user_establishments`, `session_ai_chat_messages`, `tutor_criminal_records`, `establishment_coordinators`, `contact_functions`, `school_classes`, `specialties`, `establishment_specialties`, `user_profile_specialties`, `notifications`, `specialty_levels`, `student_status_history`, `vsc_daily_reports`, `role_groups`, `assigned_post_it_templates`, `school_year_quarters`, `onboarding_step_templates`, `user_onboarding_records`, `user_onboarding_step_progress`, `email_otp_challenges`, `session_configurations`, `session_student_scorings`, `session_light_scorings`, `livekit_rooms`, `session_presence_events`, `binomes`, `session_comptes_rendus`, `compte_rendu_scoring_entries`, `compte_rendu_events`, `session_groups`, `departments`, `partners`, `catalog_options`, `establishment_prospection_status_history`, `user_programs`, `events`, `event_participants`, `event_unregistered_participants`, `event_syntheses`, `event_activities`, `foot_clubs`, `user_histories`, `user_history_onboarding_steps`, `user_history_validations`.

## Appendix B — Skill inventory (17)

`student`, `tutor`, `matching`, `session`, `program`, `registration`, `attendance`, `report`, `notification`, `calendar`, `user`, `dashboard`, `statistics`, `document`, `establishment`, `configuration`, `parent`.
