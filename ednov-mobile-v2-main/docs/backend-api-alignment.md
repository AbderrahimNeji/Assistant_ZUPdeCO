# Backend API alignment for mobile (sessions & presence)

This document lists what the mobile app expects from the sessions API and what the backend already provides or still needs, so that switching from static data to the real API works correctly.

---

## Summary

| Area | Status | Notes |
|------|--------|--------|
| GET /sessions (list) | **Gap** | Response shape: backend uses `data`, mobile expects `items` or array. Query `status` case mismatch. |
| GET /sessions/:id | **Gap** | Session detail should include `establishment`, `room` (with name) and `reportId`. |
| GET /sessions/:id/participants | **Aligned** | Backend returns participants with `user`; mobile maps `user.firstName`, `user.lastName`. |
| PATCH /sessions/:id/participants/:participantId | **Partial** | Forbidden when session closed/completed/cancelled ✓. Response should include `user` for display. |
| GET /sessions/report-kpis | **Aligned** | Same shape. |
| GET /sessions/dashboard/tutor | **Aligned** | Same shape; sessions in response may lack establishment/room names. |
| GET /sessions/attendance-history | **Aligned** | Same shape `{ items, total, page, pageSize }`; items have `session` + `participants`. |

---

## 1. GET /sessions (list sessions)

### Mobile expects

- **Query params:** `dateFrom`, `dateTo`, `status`, `establishmentId`, `roomId` (optional).
- **Response:** Either a **plain array** of sessions, or an object with **`items`** (array).  
  Mobile does: `const items = Array.isArray(data) ? data : (data as Record<string, unknown>).items`.

### Backend today

- **Query:** `ListSessionsQueryDto` with `dateFrom`, `dateTo`, `status`, `establishmentId`, `roomId`, plus `page`, `pageSize`, etc.  
  **`status`** is validated with `@IsEnum(SessionStatus)` where `SessionStatus` is **UPPERCASE** (`PLANNED`, `IN_PROGRESS`, …).  
  Mobile sends **lowercase** (`in_progress`, `planned`, …).
- **Response:** `{ data: Session[], total, page, pageSize }` (no `items`).

### Backend changes to add

1. **Response shape for mobile compatibility**  
   Either:
   - Return **`items`** in addition to (or instead of) `data` for this endpoint, e.g. `{ items: data, total, page, pageSize }`, or  
   - Document that mobile must use the **`data`** field and update the mobile client to use `data` when present (e.g. `items = body.items ?? body.data ?? body`).
2. **Query param `status`**  
   Accept **lowercase** session status in query (e.g. `in_progress`, `planned`) and normalize to backend enum before filtering, so mobile can keep sending lowercase.

---

## 2. GET /sessions/:id (session detail)

### Mobile expects (for mapping in `mapRawToSession`)

- `id`, `sessionDate`, `startTime` (or combined `date`).
- **`establishment`:** object with `name` or string (for display).
- **`room`:** object with `name` or string (for display).
- **`status`:** string (mobile normalizes UPPERCASE to lowercase).
- **`joinLink`** or `sessionLink` or `meetingUrl`.
- **`sessionFormat`:** `in_person` | `remote` | `hybrid`.
- **`reportId`** or `crId` (for “Voir le CR” link).

### Backend today

- `findOne(id, companyId)` returns the **Session entity** without loading relations.  
  So the JSON has `establishmentId`, `roomId` but **no** `establishment: { name }`, `room: { name }`.
- Session entity has **no** `reportId`; the link to the report is via `session_reports.session_id`.

### Backend changes to add

1. **Include relation or DTO for session detail**  
   For GET `/sessions/:id`, load and expose:
   - **establishment** (at least `id`, `name`).
   - **room** (at least `id`, `name` if present).
2. **Expose report id for the session**  
   Add a **`reportId`** (or `crId`) on the response: e.g. the `id` of the `session_report` row for this `sessionId` if it exists, otherwise `null`.  
   This allows the mobile “Voir le CR” button without an extra call.

---

## 3. GET /sessions/:sessionId/participants

### Mobile expects

- Array of objects with: `id`, `userId`, `role`, `attendanceStatus` (`present` | `absent` | `excused` | `pending`), and **`user`** with `firstName`, `lastName`.

### Backend today

- `findParticipants` returns participants with `relations: ['user']`.  
  TypeORM serializes `user`, so the response has `user.firstName`, `user.lastName` (User entity has these fields).  
  **Aligned.**

---

## 4. PATCH /sessions/:sessionId/participants/:participantId (update presence)

### Mobile expects

- **Body:** `{ attendanceStatus?: 'present' | 'absent' | 'excused' | 'pending' }`.
- **Success:** 200 with the **updated participant** in the same shape as GET participants (so mobile can update local cache; it uses this in `useUpdateAttendance` `onSuccess`).
- **When session is not editable (closed/completed/cancelled):** **403** or **409** with a clear message so mobile can show “La séance est terminée…”.

### Backend today

- **Forbidden when session is closed/completed/cancelled** is already implemented in `updateParticipant` (`ForbiddenException`).
- **Response:** Returns the saved `SessionParticipant` entity.  
  `findOneParticipant` does **not** load the `user` relation, so the PATCH response may **lack** `user: { firstName, lastName }`.

### Backend changes to add

1. **PATCH response shape**  
   After saving, **reload the participant with `relations: ['user']`** (or return a DTO that includes `user` with `firstName`, `lastName`) so the mobile can display the name and keep the same shape as GET participants.

---

## 5. GET /sessions/report-kpis

### Mobile expects

- `{ missingReports, overdueReports, submittedPendingValidation, validatedReports }`.

### Backend today

- Same shape. **Aligned.**

---

## 6. GET /sessions/dashboard/tutor

### Mobile expects

- `{ upcomingSessions: Session[], reportsToSubmit: unknown[] }`.  
  Each session should be mappable with `mapRawToSession` (so same expectations as GET /sessions/:id for establishment, room, reportId if the mobile uses them on the dashboard).

### Backend today

- Returns `upcomingSessions` (Session[]) and `reportsToSubmit` (SessionReport[]).  
  Sessions are raw entities (no establishment/room/reportId).  
  If the mobile only needs id, date, status, format, joinLink on the dashboard, this is enough.  
  If it shows establishment/room or “Voir le CR” from the dashboard, same gaps as GET /sessions/:id apply.

### Backend changes to add (optional)

- If the dashboard UI needs establishment/room/reportId, either include them in the dashboard response or document that the mobile should load session detail when navigating to a session.

---

## 7. GET /sessions/attendance-history

### Mobile expects

- **Query:** `dateFrom`, `dateTo`, `page`, `pageSize`.
- **Response:** `{ items: Array<{ session: Session, participants: SessionParticipant[] }>, total, page, pageSize }`.  
  Each participant should have `user` (firstName, lastName) for display.

### Backend today

- Same query and structure.  
  `items` are `{ session, participants }`; participants are loaded with `relations: ['user']`.  
  **Aligned.**  
  Session objects in `items` are still raw (no establishment/room/reportId); mobile already maps them with `mapRawToSession`, which tolerates missing establishment/room (null).

---

## 8. Session status values

- **Backend:** `SessionStatus` enum: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`, `CANCELLED`.
- **Mobile:** Normalizes any string to lowercase and accepts `planned`, `in_progress`, `completed`, `closed`, `cancelled`.

No backend change required for response bodies; mobile handles UPPERCASE.  
Only the **list sessions query param** `status` must accept lowercase (see §1).

---

## 9. Functionality and logic already in the backend

- **Presence update forbidden when session is not in progress**  
  `updateParticipant` throws `ForbiddenException` when effective status is `CLOSED`, `CANCELLED`, or `COMPLETED`.  
  Message: “La séance est terminée. Les présences ne peuvent plus être modifiées.”
- **Attendance status**  
  Participant has `attendanceStatus`: `present` | `absent` | `excused` | `pending`.  
  DTO and entity align with mobile.
- **Tutor dashboard and attendance history**  
  Scoped by current user (tutor/participant/manager).  
  Attendance history returns past sessions with participants (with `user` loaded).

---

## 10. Checklist: backend work before switching off static data

| # | Task | Priority |
|---|------|----------|
| 1 | List sessions: support response shape mobile uses (`items` or document and use `data`) and handle pagination | High |
| 2 | List sessions: accept lowercase `status` in query and map to backend enum | High |
| 3 | GET session by id: return `establishment` and `room` with `name` (relation or DTO) | High |
| 4 | GET session by id: add `reportId` (or `crId`) from session_report when present | High |
| 5 | PATCH participant: return updated participant with `user` (firstName, lastName) loaded | High |
| 6 | (Optional) Dashboard tutor: include establishment/room/reportId in sessions if UI needs them | Low |

---

## 11. Mobile-side fallbacks (already in place)

- **Session status:** `normalizeSessionStatus()` in `services/sessions.ts` converts backend UPPERCASE to lowercase.
- **Session format:** `mapRawToSession` maps `in_person` → `presentiel`, `remote` → `visio`, `hybrid` → `hybrid`, and derives from `joinLink` if needed.
- **Establishment/room:** Mobile handles `establishment`/`room` as object or string and falls back to null.

Once the backend implements the high-priority items above, switching from static data to the API should allow the mobile to consume sessions and presence correctly.
