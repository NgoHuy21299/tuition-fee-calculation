# UC-04: Tạo lịch / Buổi học (Sessions) – Implementation Plan

## 1. Mục tiêu
- [X] Mục tiêu: Cho phép giáo viên tạo, sửa, huỷ và quản lý buổi học (sessions) cho từng lớp, gồm cả khả năng tạo theo chu kỳ (recurring) và xử lý trường hợp trùng/không hợp lệ.
- [X] Actor: Giáo viên (owner của class).

## 2. Database & Model

2.1 Đề xuất schema / migrations
- Created Session table in migration 0005:
```
CREATE TABLE IF NOT EXISTS Session (
  id            TEXT PRIMARY KEY,
  classId       TEXT REFERENCES Class(id) ON DELETE SET NULL,
  teacherId     TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  startTime     TEXT NOT NULL,
  durationMin   INTEGER NOT NULL CHECK (durationMin > 0),
  status        TEXT NOT NULL CHECK (status IN ('scheduled','completed','canceled')),
  notes         TEXT,
  feePerSession INTEGER,
  type          TEXT NOT NULL DEFAULT 'class' CHECK (type IN ('class','ad_hoc')),
  createdAt     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_session_classId ON Session(classId);
CREATE INDEX IF NOT EXISTS idx_session_teacherId ON Session(teacherId);
CREATE INDEX IF NOT EXISTS idx_session_startTime ON Session(startTime);
```

- [X] Migration `0010_migration_session_table.sql`:
  - [X] (Đã chọn phương án A: lightweight grouping) Không tạo bảng full `SessionSeries` ở giai đoạn này. Thay vào đó:
    - [X] Thêm cột nullable `seriesId` (TEXT) trên bảng `Session` để nhóm những session được tạo cùng 1 đợt lặp.
    - [X] Ví dụ migration (minimal):
      - [X] ALTER TABLE Session ADD COLUMN seriesId TEXT NULL;
      - [X] CREATE INDEX IF NOT EXISTS idx_session_seriesId ON Session(seriesId);

2.2 Notes & indexes
- [X] Add FK and indexes for queries by class and date ranges. Create index on `startAt` for fast upcoming-session queries.
- [X] Prefer storing times in UTC; convert at API boundaries based on teacher's timezone (front-end handles display/localization).

## 3. Backend (Cloudflare Workers)

3.1 Routes & API endpoints
- [X] `GET /api/classes/:classId/sessions` — list sessions for class. Hiện tại chỉ làm việc lấy ra, theo plan sẽ có một UC bổ sung sử dụng cache để đảm bảo lấy nhiều mà không cần phải query database nhiều lần.
- [ ] `POST /api/classes/:classId/sessions` — create single session or batch create (frontend may send expanded sessions array or a recurrence object; backend expands if provided). Body supports single-session fields or series/recurrence info.
- [X] `GET /api/sessions/:id` — session detail.
- [X] `PUT /api/sessions/:id` — update session (supports reschedule, change duration, notes, status, feePerSession).
- [X] `DELETE /api/sessions/:id` — delete/cancel a session. If attendance exists → return 409 `SESSION_HAS_ATTENDANCE` unless force parameter provided and business rules allow.
- [X] Apply `authMiddleware` to all endpoints. Only class owner (teacherId from auth) may create/update/delete sessions for their classes.

3.2 Validation & Schemas
- [X] Create `workers/features/session/sessionSchemas.ts` with Valibot schemas:

3.3 Error codes / i18n
- [X] Add error codes to `workers/errors.ts`:
- [X] Add Vietnamese messages to `workers/i18n/errorMessages.ts`:

## 4. Repository & SQL

4.1 `workers/features/session/sessionRepository.ts`
- [ ] Methods:
  - [X] `listByClass({ classId, teacherId })`
  - [X] `create(sessionRow, teacherId, classId)` — insert single session
  - [X] `createMany( teacherId, classId, sessions[])` — bulk insert generated sessions for a series (transactional when possible)
  - [X] `getById({ id, teacherId })`
  - [X] `update({ id, patch, teacherId })`
  - [X] `delete({ id, teacherId })` — delete or mark cancelled
  - [X] `findConflicts({ teacherId, classId, startAt, endAt })` — find overlapping sessions for same class (or teacher-wide checks)
  - [X] `listUpcoming({ teacherId, limit, from })` — for reminder cron/notification

- [X] `hasAttendance({ sessionId })` — check `Attendance` table before destructive ops - Viết trong attendanceRepository.ts

4.2 SQL considerations
- [X] Use parameterized queries. Keep query logging similar to existing repos. Bulk insert should be efficient but careful with SQLite limitations (wrap in transaction).
- [X] Optimize query: just get fields that we need, prevent join larger than 3 tables, maximum is join 3 tables.

## 5. Service Layer

5.1 `workers/features/session/sessionService.ts`
- [X] Methods:
  - [X] `listByClass(...)` — apply mapping to DTO (status string → enum etc.)
  - [X] `create({ classId, input, teacherId })` — business rules:
  - [X] `getById({ id, teacherId })`
  - [X] `update({ id, teacherId, patch })` — if rescheduling a session that already has attendance → either block (409) or allow only limited changes.
  - [X] `delete({ id, teacherId })` — if hasAttendance → throw SESSION_HAS_ATTENDANCE (409). Otherwise delete or set status='cancelled'.
  - [X] `listUpcoming({ windowMinutes })` — used by Cron job for notification (UC-05).

5.2 Business rules & edge cases
- [X] Ownership: only class owner may manage sessions.
- [X] Defaulting: feePerSession defaults to Class.defaultFeePerSession if omitted.
- [X] Conflict detection: check overlapping sessions for the same class (and optionally for the teacher across classes to avoid double-booking teacher).
- [X] Recurrence safety: cap series size and provide clear error.
- [X] Timezone: API accepts UTC ISO strings and timezone for recurrence rules; service normalizes to UTC for storage.

## 6. Frontend (React)

6.1 API client
- [ ] `frontend/src/services/sessionService.ts`:
  - [ ] `listSessions(classId)`
  - [ ] `createSession(classId, payload)` (single or batch - hỗ trợ cả hai loại là tốt nhất)
  - [ ] `getSession(id)`
  - [ ] `updateSession(id, patch)`
  - [ ] `deleteSession(id)`

6.2 Pages & Components
- [ ] Session page: tab within `ClassDetail`
  - [ ] Cho phép lựa chọn hai loại view
    - [ ] View theo dạng table (liệt kê từng session, trạng thái, action Sửa/Cancel/Xoá, với action sửa thì là một Model)
    - [ ] Calendar view (month/week) tìm kiếm và sử dụng shadcn ui phù hợp cho phần này. Ở trong calendar khi bấm vào mặc định là action Sửa chẳng hạn (mở modal).
  - [ ] Filters: status (planned, cancelled, completed).
  - [ ] Actions: Create session (modal), Create recurring series (modal with recurrence UI).

- [ ] `SessionForm` (used for Create and Edit)
  - [ ] Fields: startAt (datetime picker), durationMinutes (number), feePerSession (number, optional with helper: "Mặc định: giá của lớp"), notes (textarea), recurrence controls (optional)
  - [ ] UX: show a summary of generated sessions when creating a series (e.g., "Tạo 12 buổi: từ 2025-10-01 đến 2026-01-15, mỗi Tue/Thu 18:00"). Allow user to confirm before submit.

- [ ] `SessionList` / `SessionCard` / `SessionDetail`
  - [ ] Session detail shows attendance link, createdBy, status, notes, and actions.

- [ ] Sau khi hoàn thiện tab ở trong class detail rồi mới tạo riêng một page là Session page để xem tất cả các session được tạo.

6.3 UX details
- [ ] Confirm modal when cancelling/deleting a session.
- [ ] If backend returns `SESSION_CONFLICT`, show inline message with conflicting session(s) and option to view them.
- [ ] When creating series, provide preview and maximum count warning (e.g., "Bạn đang tạo 120 buổi — điều này có thể mất thời gian.").
- [ ] Timezone handling: let user pick local timezone for recurrence preview; store as UTC.

## 7. Tests

- [ ] Unit tests (service + repo):
  - [ ] Recurrence generator: given recurrence config produce expected sessions (happy path + daylight saving edge case if timezone-aware).
  - [ ] Conflict detection: overlapping intervals produce SESSION_CONFLICT.
  - [ ] Fee defaulting: omitted feePerSession prefilled from Class.defaultFeePerSession.

- [ ] Integration tests (routes):
  - [ ] Auth required for all session endpoints.
  - [ ] Creating single session → 201 and retrievable.
  - [ ] Creating recurring series → creates expected number of sessions (and stores seriesId on created sessions).
  - [ ] Deleting session with attendance → 409 SESSION_HAS_ATTENDANCE.

## 8. Documentation

- [ ] Update `docs/05-use-cases.md` UC-04 section to reference defaulting behavior (feePerSession prefill) and recurrence support.
- [ ] Add DB notes to `docs/database-docs.md` describing `Session` and `seriesId` grouping approach, timezone conventions, and indexes.

## 9. Rollout Checklist

- [ ] Create migrations: `000X_create_sessions.sql`, add migration to `ALTER TABLE Session ADD COLUMN seriesId TEXT NULL` and `CREATE INDEX idx_session_seriesId`.
- [ ] Implement repository & SQL queries.
- [ ] Implement Valibot schemas and add validation error messages keys in `workers/validation/common/validationTypes.ts` and `workers/i18n/validationMessages.ts` as needed.
- [ ] Implement service with conflict detection, fee defaulting, and recurrence generation (batch create + `seriesId` tagging).
- [ ] Add routes in `workers/routes/sessionRoute.ts` and register in `workers/app.ts`.
- [ ] Add i18n error messages in `workers/i18n/errorMessages.ts`.
- [ ] Implement frontend service and `Schedule` page + `SessionForm` components.
- [ ] Add unit/integration tests.
- [ ] Manual QA: create single sessions, create recurring series, test conflict detection, test delete with attendance.

## 10. Non-goals / Deferred items

- [ ] Complex RRULE full RFC-5545 parser: initially support a limited recurrence model (daysOfWeek + time + start/end/maxOccurrences). If project needs richer recurrence, integrate a well-known library (rrule.js) later.
- [ ] Automatic notification/email sending is covered in UC-05 (Cron + Queues) and will be integrated with `listUpcomingForReminder`.

## Tiny contract (inputs / outputs / success criteria)

- [ ] Inputs: create/update payloads (startAt ISO string, durationMinutes int, optional feePerSession, optional recurrence object).
- [ ] Outputs: Session DTO(s) with id, classId, startAt, durationMinutes, feePerSession, status, notes.
- [ ] Error modes: 400 validation errors, 401 unauthorized, 403 forbidden (non-owner), 404 not found, 409 business errors (SESSION_CONFLICT, SESSION_HAS_ATTENDANCE).

## Edge cases to cover

- [ ] Overlapping sessions (same class or teacher double-booking).
- [ ] Creating very large recurring series (apply a hard cap).
- [ ] Timezone/daylight-saving transitions when generating recurrences.
- [ ] Rescheduling a session that already has attendance.

---

### Completion summary

Created `docs/plans/UC-04-sessions-plan.md` with proposed DB schema, backend routes, repository/service responsibilities, frontend components, tests, documentation and rollout checklist. This plan follows the conventions used in `UC-02-classes-crud-plan.md` and is ready for implementation.
