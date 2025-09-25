# UC-06: Điểm danh học sinh (Attendance) – Implementation Plan

## 1. Mục tiêu
- [ ] Mục tiêu: Cho phép giáo viên điểm danh học sinh trong từng buổi học, đánh dấu tình trạng tham dự (present/absent/late) và ghi chú cho từng học sinh.
- [ ] Actor: Giáo viên (owner của class/session).
- [ ] Tiền đề: Có session đã tạo, có học sinh trong lớp, giáo viên đã đăng nhập.

## 2. Database & Model

2.1 Schema hiện tại (đã có từ migration 0005)
```sql
CREATE TABLE IF NOT EXISTS Attendance (
  id            TEXT PRIMARY KEY,
  sessionId     TEXT NOT NULL REFERENCES Session(id) ON DELETE CASCADE,
  studentId     TEXT NOT NULL REFERENCES Student(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('present','absent','late')),
  note          TEXT,
  markedBy      TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  markedAt      TEXT NOT NULL DEFAULT (datetime('now')),
  feeOverride   INTEGER,
  UNIQUE(sessionId, studentId)
);
CREATE INDEX IF NOT EXISTS idx_attendance_sessionId ON Attendance(sessionId);
CREATE INDEX IF NOT EXISTS idx_attendance_studentId ON Attendance(studentId);
```

2.2 Notes & Business Rules
- [ ] Mỗi học sinh chỉ có một record attendance cho mỗi session (UNIQUE constraint).
- [ ] Status: 'present', 'absent', 'late' - all count toward attendance but may affect fee calculation differently.
- [ ] feeOverride: per-student fee override for this specific session (nullable).
- [ ] markedBy: track which teacher marked the attendance (nullable for system operations).
- [ ] Fee calculation order: Attendance.feeOverride → ClassStudent.unitPriceOverride → Session.feePerSession.

## 3. Backend (Cloudflare Workers)

3.1 Routes & API endpoints
- [X] `GET /api/sessions/:sessionId/attendance` — get attendance list for session with student info.
- [X] `POST /api/sessions/:sessionId/attendance` — bulk create/update attendance records.
- [X] `PUT /api/attendance/:id` — update individual attendance record.
- [X] `DELETE /api/attendance/:id` — remove attendance record (soft delete or hard delete based on business rules).
- [X] `GET /api/students/:studentId/attendance` — get attendance history for student (for reports/analytics).
- [X] Apply `authMiddleware` to all endpoints. Only session owner (teacherId) may manage attendance.

3.2 Validation & Schemas
- [X] Create `workers/features/attendance/attendanceSchemas.ts` with Valibot schemas:
  - `CreateAttendanceSchema` — sessionId, studentId, status, note (optional), feeOverride (optional)
  - `UpdateAttendanceSchema` — status, note (optional), feeOverride (optional)
  - `BulkAttendanceSchema` — array of attendance records for bulk operations
  - `AttendanceQuerySchema` — for filtering attendance lists

3.3 Error codes / i18n
- [X] Add error codes to `workers/errors.ts`:
  - `ATTENDANCE_ALREADY_EXISTS` — when trying to create duplicate attendance
  - `ATTENDANCE_NOT_FOUND` — attendance record not found
  - `ATTENDANCE_SESSION_COMPLETED` — cannot modify attendance for completed sessions (based on business rules)
  - `ATTENDANCE_STUDENT_NOT_IN_CLASS` — student is not enrolled in the class (for class sessions)
- [X] Add Vietnamese messages to `workers/i18n/errorMessages.ts`:
  - `ATTENDANCE_ALREADY_EXISTS: "Điểm danh cho học sinh này đã tồn tại"`
  - `ATTENDANCE_NOT_FOUND: "Không tìm thấy bản ghi điểm danh"`
  - `ATTENDANCE_SESSION_COMPLETED: "Không thể sửa điểm danh cho buổi học đã hoàn thành"`
  - `ATTENDANCE_STUDENT_NOT_IN_CLASS: "Học sinh không thuộc lớp học này"`

## 4. Repository & SQL

4.1 `workers/features/attendance/attendanceRepository.ts`
- [X] Methods:
  - `findBySession({ sessionId, teacherId })` — get all attendance for session with student details
  - `findByStudent({ studentId, teacherId, classId?, fromDate?, toDate? })` — attendance history for student
  - `create({ sessionId, studentId, status, note?, feeOverride?, markedBy })` — create single attendance
  - `bulkUpsert(attendanceRecords[])` — bulk create/update for session
  - `update({ id, status?, note?, feeOverride?, markedBy })` — update existing attendance
  - `delete({ id, teacherId })` — delete attendance (with ownership check)
  - `hasAttendance({ sessionId })` — check if session has any attendance (used in session deletion)
  - `getAttendanceStats({ classId?, studentId?, fromDate?, toDate? })` — statistics for reports

4.2 SQL considerations
- [X] Join with Student table to get student name/info in attendance lists.
- [X] Join with Session/Class for ownership verification (teacherId).
- [X] Optimize for common queries: attendance by session, attendance history by student.
- [X] Use transactions for bulk operations to ensure data consistency.
- [X] Index usage: leverage existing indexes on sessionId and studentId.

## 5. Service Layer

5.1 `workers/features/attendance/attendanceService.ts`
- [X] Methods:
  - `getSessionAttendance({ sessionId, teacherId })` — get attendance list with student info and calculated fees
  - `markAttendance({ sessionId, attendanceRecords[], teacherId })` — bulk mark attendance for session
  - `updateAttendance({ id, updates, teacherId })` — update single attendance record
  - `deleteAttendance({ id, teacherId })` — remove attendance record
  - `getStudentAttendanceHistory({ studentId, teacherId, filters })` — attendance history with statistics
  - `calculateSessionFees({ sessionId })` — calculate fees for all students in session based on attendance and overrides

5.2 Business rules & edge cases
- [X] Ownership: only session owner (teacherId) may manage attendance.
- [ ] Fee calculation: implement the fee resolution order (Attendance.feeOverride → ClassStudent.unitPriceOverride → Session.feePerSession).
- [ ] Class membership validation: for class sessions, verify student is enrolled in class.
- [ ] Session status validation: may restrict attendance modification for completed/canceled sessions.
- [ ] Bulk operations: handle partial failures gracefully, return detailed results.
- [ ] Historical data: preserve attendance history even when students leave class.

## 6. Frontend (React)

6.1 API client
- [ ] `frontend/src/services/attendanceService.ts`:
  - `getSessionAttendance(sessionId)` — get attendance list for session
  - `markAttendance(sessionId, attendanceRecords)` — bulk mark attendance
  - `updateAttendance(attendanceId, updates)` — update single attendance
  - `deleteAttendance(attendanceId)` — remove attendance
  - `getStudentAttendance(studentId, filters?)` — get student attendance history

6.2 Pages & Components
- [ ] Attendance page: `/attendance/:sessionId` (hiện tại truy cập thông qua class -> class detail -> tab buổi học -> Điểm danh (cần tạo mới trong phần thao tác của từng hàng buổi học))
  - Show session details (class name, date, time, duration)
  - List all students in class/session with attendance status
  - Bulk actions: Mark All Present, Mark All Absent, Save All Changes
  - Individual student actions: toggle status, add note, set fee override

- [ ] `AttendanceForm` (main attendance marking interface)
  - Student list with status toggle buttons (Present/Absent/Late)
  - Note field for each student (optional)
  - Fee override field for each student (optional, shows calculated fee)
  - Bulk save functionality with optimistic updates

- [ ] `AttendanceRow` (individual student row)
  - Student name and basic info
  - Status buttons with visual indicators
  - Note input field (collapsible/expandable)
  - Fee display with override option
  - Last modified info (markedAt, markedBy)

- [ ] `AttendanceHistory` (for student detail view)
  - Table showing attendance across sessions
  - Filtering by date range, class, status
  - Statistics summary (total sessions, attendance rate)

6.3 UX details
- [ ] Quick action buttons: "Tất cả có mặt", "Tất cả vắng mặt" for bulk operations.
- [ ] Visual indicators for attendance status (icons, colors).
- [ ] Auto-save functionality with loading states and error handling.
- [ ] Confirmation dialogs for destructive actions.
- [ ] Mobile-responsive design for marking attendance on tablets/phones.
- [ ] Keyboard shortcuts for quick marking (1=Present, 2=Absent, 3=Late).

## 7. Integration Points

7.1 Session Integration
- [ ] Add "Điểm danh" button/link in SessionCard and SessionDetail components.
- [ ] Show attendance status in session list (e.g., "5/8 có mặt").
- [ ] Prevent session deletion if attendance exists (use hasAttendance check).

7.2 Student Integration
- [ ] Add attendance history in StudentDetail component.
- [ ] Show attendance statistics in student profile.

7.3 Class Integration
- [ ] Show attendance summary in ClassDetail component.
- [ ] Class member list should indicate which students have attendance records.

## 8. Tests

8.1 Unit tests (service + repo)
- [ ] Fee calculation logic: test fee resolution order with various override scenarios.
- [ ] Bulk operations: test partial success/failure scenarios.
- [ ] Business rule validation: student membership, session ownership, status transitions.
- [ ] Attendance statistics: accurate calculation of rates and totals.

8.2 Integration tests (routes)
- [ ] Auth required for all attendance endpoints.
- [ ] Ownership validation: only session owner can manage attendance.
- [ ] Bulk attendance creation and updates.
- [ ] Error handling: duplicate attendance, invalid session/student IDs.

## 9. Documentation

- [ ] Update `docs/05-use-cases.md` UC-06 section with fee calculation details and bulk operation support.
- [ ] Add attendance workflow to `docs/database-docs.md` with fee resolution examples.
- [ ] Document API endpoints and request/response formats.

## 10. Rollout Checklist

- [ ] Verify attendance table exists (from migration 0005).
- [ ] Implement repository with SQL queries and proper indexes.
- [ ] Implement Valibot schemas and add validation error messages.
- [ ] Implement service with fee calculation and bulk operations.
- [ ] Add routes in `workers/features/attendance/attendanceRoute.ts` and register in `workers/app.ts`.
- [ ] Add i18n error messages in `workers/i18n/errorMessages.ts`.
- [ ] Implement frontend service and AttendanceForm components.
- [ ] Add attendance links to existing session/class components.
- [ ] Add unit/integration tests.
- [ ] Manual QA: mark attendance, test fee overrides, test bulk operations, verify ownership restrictions.

## 11. Non-goals / Deferred items

- [ ] Attendance analytics/reporting (covered in UC-07).
- [ ] Automated attendance marking (QR codes, etc.) - future enhancement.
- [ ] Attendance notifications to parents - covered in UC-08.
- [ ] Advanced fee calculation rules (discounts, packages) - future enhancement.

## Contract (inputs / outputs / success criteria)

### Inputs
- Session ID for attendance marking
- Attendance records array: `{ studentId, status, note?, feeOverride? }`
- Student ID for attendance history queries
- Date range filters for attendance queries

### Outputs  
- Attendance DTOs with student info, calculated fees, and marking details
- Attendance statistics (total sessions, attendance rate, fees)
- Bulk operation results with success/failure details

### Error modes
- 400 validation errors (invalid status, missing required fields)
- 401 unauthorized
- 403 forbidden (non-owner access)
- 404 not found (session/student/attendance not found)
- 409 business errors (duplicate attendance, session completed, student not in class)

## Edge cases to cover

- [ ] Student leaves class after attendance is marked (preserve historical data).
- [ ] Session is rescheduled after attendance is marked (maintain attendance link).
- [ ] Multiple teachers trying to mark attendance simultaneously (handle concurrency).
- [ ] Bulk operations with mixed success/failure (partial completion handling).
- [ ] Fee override edge cases (negative fees, very large amounts).
- [ ] Session deletion with existing attendance (prevent or cascade properly).

---

### Implementation Priority

1. **High Priority (Core functionality)**
   - Backend: Repository, Service, Routes with basic CRUD operations
   - Frontend: AttendanceForm with bulk marking capability
   - Integration: Links from session list to attendance page

2. **Medium Priority (Enhanced UX)**
   - Advanced UI features: auto-save, keyboard shortcuts, mobile optimization
   - Attendance history views and statistics
   - Fee override functionality

3. **Low Priority (Nice to have)**
   - Advanced bulk operations and filters
   - Attendance analytics integration
   - Performance optimizations for large classes

This plan follows the established patterns from UC-04 and provides a comprehensive attendance system that integrates well with existing session and class management features.