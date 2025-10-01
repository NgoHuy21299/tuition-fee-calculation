# UC-07: Báo cáo theo tháng (Monthly Reports) – Implementation Plan

## 1. Mục tiêu
- [ ] Mục tiêu: Xem/tạo báo cáo tổng hợp học phí theo tháng cho từng lớp và học sinh, bao gồm danh sách buổi học, tình trạng điểm danh và tính toán học phí.
- [ ] Actor: Giáo viên (owner của class).
- [ ] Tiền đề: Có dữ liệu Sessions và Attendance đầy đủ từ các UC trước (UC-04, UC-06).

## 2. Business Logic & Fee Calculation

### 2.1 Thứ tự ưu tiên tính học phí (Fee Resolution Hierarchy)
1. **Attendance.feeOverride** - Override phí cho học sinh trong buổi học cụ thể
2. **ClassStudent.unitPriceOverride** - Override phí cho học sinh trong toàn bộ lớp
3. **Session.feePerSession** - Phí mặc định cho buổi học

### 2.2 Các loại buổi học được tính vào báo cáo
- [ ] Chỉ tính các buổi học có trạng thái `completed` hoặc `scheduled` (không tính `canceled`)
- [ ] Chỉ tính học sinh có trạng thái điểm danh `present` hoặc `late` (không tính `absent`)

### 2.3 Thông tin báo cáo cần thiết
- [ ] Tổng số buổi học trong tháng
- [ ] Tổng số buổi học sinh tham gia (present/late)
- [ ] Tổng học phí phải trả
- [ ] Chi tiết từng buổi học với thông tin học sinh
- [ ] Tổng kết theo học sinh (tên, số buổi tham gia, tổng tiền)

## 3. Database & Model

### 3.1 Schema hiện tại (đã có từ migration 0005)
```sql
-- Các bảng liên quan đã có:
-- Session (id, classId, teacherId, startTime, durationMin, status, feePerSession, type)
-- Attendance (id, sessionId, studentId, status, feeOverride, markedAt)
-- ClassStudent (id, classId, studentId, unitPriceOverride, joinedAt, leftAt)
-- Student (id, name, studentPhone, studentEmail, parentId)
-- Class (id, teacherId, name, subject, description, isActive)
```

### 3.2 Views hoặc Queries phức tạp cần thiết
- [ ] Query join nhiều bảng để lấy thông tin đầy đủ cho báo cáo
- [ ] Filter theo tháng và năm
- [ ] Tính toán học phí theo thứ tự ưu tiên
- [ ] Group by học sinh để tính tổng kết

## 4. Backend (Cloudflare Workers)

### 4.1 Routes & API endpoints
- [ ] `GET /api/reports/monthly` — Báo cáo tổng hợp theo tháng với các query params:
  - `classId` (bắt buộc): ID của lớp học
  - `month` (bắt buộc): Tháng theo định dạng YYYY-MM
  - `teacherId` (tự động từ auth): Giáo viên chủ lớp
  - `includeStudentDetails` (tùy chọn): Có lấy chi tiết từng buổi học cho mỗi học sinh không
  - `forceRefresh` (tùy chọn, boolean): Nếu `true` thì bỏ qua cache và tính lại báo cáo
- [ ] `GET /api/reports/monthly/summary` — Chỉ lấy tổng kết không có chi tiết (nhẹ hơn)
- [ ] `GET /api/reports/monthly/export` — Export báo cáo dạng CSV/PDF (tương lai)

### 4.2 Validation & Schemas
- [ ] Create `workers/features/reports/reportsSchemas.ts` với Valibot schemas:
  - `MonthlyReportQuerySchema` — classId, month (YYYY-MM format), includeStudentDetails?, forceRefresh?: boolean
  - `MonthlyReportResponseSchema` — Cấu trúc response với báo cáo đầy đủ

### 4.3 Error codes / i18n
- [ ] Thêm error codes vào `workers/errors.ts`:
  - `REPORT_INVALID_MONTH_FORMAT` — Tháng không đúng định dạng YYYY-MM
  - `REPORT_CLASS_NOT_FOUND` — Không tìm thấy lớp học
  - `REPORT_NO_DATA` — Không có dữ liệu báo cáo cho tháng này
  - `REPORT_UNAUTHORIZED` — Không có quyền xem báo cáo của lớp này

- [ ] Thêm Vietnamese messages vào `workers/i18n/errorMessages.ts`:
  - `REPORT_INVALID_MONTH_FORMAT: "Định dạng tháng không hợp lệ. Sử dụng YYYY-MM"`
  - `REPORT_CLASS_NOT_FOUND: "Không tìm thấy lớp học"`
  - `REPORT_NO_DATA: "Không có dữ liệu báo cáo cho tháng này"`
  - `REPORT_UNAUTHORIZED: "Không có quyền xem báo cáo của lớp học này"`

## 5. Repository & SQL

### 5.1 Cách tiếp cận truy vấn theo module (không dùng 1 câu SQL lớn)
- [ ] Không viết một câu query khổng lồ. Thay vào đó, sử dụng các repository hiện có theo từng bảng, ghép dữ liệu ở Service layer.
- [ ] Repositories cần/được bổ sung (nếu thiếu):
  - `sessionRepository.listByClassInMonth({ classId, teacherId, year, month })`
  - `attendanceRepository.findBySessionIds({ sessionIds, teacherId })`
  - `classStudentRepository.listMemberships({ classId, teacherId })` — trả về `studentId, unitPriceOverride, joinedAt, leftAt`
  - `studentRepository.findByIds({ ids })`
  - (Tùy chọn) `classRepository.getById({ id, teacherId })` để lấy thông tin lớp

### 5.2 Truy vấn nhỏ theo từng repository (pseudo-SQL)
```sql
-- Session trong tháng
SELECT id, startTime, durationMin, status, feePerSession
FROM Session
WHERE classId = ? AND teacherId = ? AND strftime('%Y-%m', startTime) = ?
  AND status IN ('scheduled','completed')
ORDER BY startTime;

-- Membership của học sinh trong lớp (để tính unitPriceOverride và joinedAt/leftAt)
SELECT studentId, unitPriceOverride, joinedAt, leftAt
FROM ClassStudent
WHERE classId = ?;

-- Attendance của các session trong tháng
SELECT id, sessionId, studentId, status, feeOverride, markedAt, note
FROM Attendance
WHERE sessionId IN (?, ?, ...);

-- Thông tin học sinh
SELECT id, name, studentPhone, studentEmail
FROM Student
WHERE id IN (?, ?, ...);
```

// Ghi chú: Service layer sẽ áp dụng business rules: lọc attendance hợp lệ, áp dụng fee priority,
// và join dữ liệu từ các repository ở tầng ứng dụng để dễ kiểm soát logic và performance.

### 5.3 Performance considerations
- [ ] Tối ưu query với proper indexes
- [ ] Pagination nếu có quá nhiều dữ liệu
- [ ] Caching kết quả báo cáo trong thời gian ngắn

## 6. Service Layer

### 6.1 `workers/features/reports/reportsService.ts`
- [ ] Methods:
  - `getMonthlyReport({ classId, teacherId, month, includeStudentDetails, forceRefresh })` — Main service method (hỗ trợ cache bypass)
  - `calculateStudentTotal({ studentAttendances })` — Tính tổng tiền cho học sinh
  - `calculateClassTotal({ allAttendances })` — Tính tổng tiền cho cả lớp
  - `formatReportData({ rawData })` — Format dữ liệu để trả về frontend

### 6.3 Cache strategy (ngắn hạn, lưu trong D1)
- [ ] Tạo bảng `ReportCache` (D1) để lưu JSON kết quả đã tính:
  - `id` (PK), `teacherId`, `classId`, `year`, `month`, `payload` (TEXT JSON), `computedAt` (datetime)
- [ ] Quy trình trong `getMonthlyReport`:
  1) Nếu `forceRefresh !== true`, tìm cache theo key (`teacherId,classId,year,month`). Nếu còn trong TTL 4h → trả về ngay `payload`.
  2) Nếu không có cache/hết TTL/`forceRefresh=true` → chạy pipeline truy vấn module (Sessions, ClassStudent, Attendance, Student) → tính toán → lưu lại vào `ReportCache` → trả về kết quả.
- [ ] Không dùng in-memory cache do Workers có nhiều isolate; KV/DO có thể cân nhắc sau. Giai đoạn này dùng D1 cho đơn giản và có transactional consistency.

### 6.2 Business rules & edge cases
- [ ] Chỉ giáo viên chủ lớp mới xem được báo cáo
- [ ] Chỉ tính phí cho buổi học đã hoàn thành hoặc đang diễn ra
- [ ] Chỉ tính phí cho học sinh có mặt (present/late)
- [ ] Xử lý trường hợp học sinh tham gia giữa tháng (joinedAt/leftAt)
- [ ] Xử lý feeOverride âm hoặc bằng 0

## 7. Frontend (React)

### 7.1 API client
- [ ] `frontend/src/services/reportsService.ts`:
  - `getMonthlyReport(classId, month, includeStudentDetails?, forceRefresh?)` — Lấy báo cáo tháng (có thể bypass cache)
  - `getMonthlySummary(classId, month, forceRefresh?)` — Lấy tổng kết nhanh (có thể bypass cache)
  - `exportReport(classId, month, format)` — Export báo cáo (tương lai)

### 7.2 Pages & Components
- [ ] Reports page: `/reports/monthly` (route mới)
  - [ ] Bộ lọc: Chọn lớp học (dropdown), chọn tháng (month picker)
  - [ ] Hiển thị báo cáo tổng hợp và chi tiết
  - [ ] Actions: Force tính lại (bỏ qua cache), Xuất báo cáo, gửi email (tương lai)

- [ ] `MonthlyReportFilters` component:
  - [ ] Class selector với danh sách lớp học của giáo viên
  - [ ] Month/Year picker với validation
  - [ ] Toggle để bật/tắt chi tiết học sinh

- [ ] `MonthlyReportView` component:
  - [ ] Tổng quan: Tổng số buổi, tổng số học sinh tham gia, tổng học phí
  - [ ] Bảng chi tiết: Danh sách học sinh với số buổi tham gia và tổng tiền
  - [ ] Mở rộng: Chi tiết từng buổi học cho mỗi học sinh (nếu bật)

- [ ] `StudentReportRow` component:
  - [ ] Thông tin học sinh cơ bản
  - [ ] Số buổi tham gia / tổng buổi trong tháng
  - [ ] Tổng học phí phải trả
  - [ ] Expandable list chi tiết từng buổi

- [ ] `SessionReportDetail` component:
  - [ ] Thông tin buổi học (ngày, giờ, trạng thái)
  - [ ] Trạng thái điểm danh
  - [ ] Học phí được tính (với ghi chú về cách tính)

### 7.3 UX details
- [ ] Loading states khi đang tải báo cáo
- [ ] Error handling với retry functionality
- [ ] Empty state khi không có dữ liệu
- [ ] Responsive design cho mobile/tablet
- [ ] Print-friendly layout cho báo cáo

## 8. Integration Points

### 8.1 Navigation Integration
- [ ] Thêm menu "Báo cáo" trong sidebar
- [ ] Link từ ClassDetail sang báo cáo tháng của lớp đó

### 8.2 Data Integration
- [ ] Sử dụng cùng service layers với attendance và session
- [ ] Tích hợp với existing error handling và i18n

## 9. Tests

### 9.1 Unit tests (service + repo)
- [ ] Fee calculation logic với các trường hợp edge case
- [ ] SQL query results matching với business rules
- [ ] Date filtering và month boundary handling
 - [ ] Cache TTL logic (trả về từ cache nếu < 4h)
 - [ ] Force refresh (bỏ qua cache khi `forceRefresh=true`)

### 9.2 Integration tests (routes)
- [ ] API endpoints trả về đúng format
- [ ] Authorization checks hoạt động đúng
- [ ] Performance với dữ liệu lớn

## 10. Documentation

- [ ] Cập nhật `docs/05-use-cases.md` UC-07 với chi tiết về tính toán học phí
- [ ] Thêm business rules vào `docs/database-docs.md`
- [ ] Document API endpoints và response formats

## 11. Rollout Checklist

- [ ] Tạo reports feature folder và các files cần thiết
- [ ] Implement repository với SQL queries tối ưu
- [ ] Implement Valibot schemas và validation
- [ ] Implement service với fee calculation logic
 - [ ] Thêm migration `0011_report_cache.sql` tạo bảng `ReportCache`
- [ ] Add routes và register trong app.ts
- [ ] Add i18n error messages
- [ ] Implement frontend components và pages
- [ ] Add navigation và routing
- [ ] Add unit/integration tests
- [ ] Manual QA: test với dữ liệu thực tế

## 12. Non-goals / Deferred items

- [ ] Export PDF/Excel (có thể thêm sau)
- [ ] Báo cáo tổng hợp nhiều lớp cùng lúc
- [ ] Báo cáo theo quý/năm
- [ ] So sánh báo cáo giữa các tháng
- [ ] Automated report generation và email sending

## 13. Contract (inputs / outputs / success criteria)

### Inputs
- classId: string (UUID của lớp học)
- month: string (định dạng YYYY-MM)
- teacherId: string (tự động từ authentication)
- includeStudentDetails?: boolean

### Outputs
- Báo cáo với cấu trúc:
```typescript
{
  classInfo: {
    id: string,
    name: string,
    subject: string
  },
  month: string,
  summary: {
    totalSessions: number,
    totalParticipatingStudents: number,
    totalFees: number
  },
  students: Array<{
    studentId: string,
    studentName: string,
    totalSessionsAttended: number,
    totalFees: number,
    attendanceDetails?: Array<{
      sessionId: string,
      date: string,
      status: 'present' | 'late',
      calculatedFee: number,
      feeBreakdown: {
        baseFee: number,
        classOverride?: number,
        attendanceOverride?: number
      }
    }>
  }>
}
```

### Error modes
- 400: Invalid month format, missing required parameters
- 401: Unauthorized (chưa đăng nhập)
- 403: Forbidden (không phải chủ lớp)
- 404: Class not found
- 409: No data for the specified month

## 14. Edge cases to cover

- [ ] Tháng không có buổi học nào
- [ ] Tháng có buổi học nhưng không có học sinh tham gia
- [ ] Học sinh tham gia giữa tháng (joinedAt trong tháng)
- [ ] Học sinh rời khỏi lớp giữa tháng (leftAt trong tháng)
- [ ] feeOverride âm hoặc bằng 0
- [ ] Session.feePerSession bị null
- [ ] ClassStudent.unitPriceOverride bị null
- [ ] Attendance.feeOverride bị null
- [ ] Timezone differences trong date filtering

---

### Implementation Priority

1. **High Priority (Core functionality)**
   - Backend: Repository với SQL queries tối ưu
   - Backend: Service với fee calculation logic
   - Frontend: Basic report view với filters và summary

2. **Medium Priority (Enhanced UX)**
   - Detailed student breakdown với expandable sessions
   - Error handling và loading states
   - Integration với navigation

3. **Low Priority (Nice to have)**
   - Export functionality
   - Advanced filtering options
   - Performance optimizations với caching

This plan establishes a solid foundation for monthly reporting with accurate fee calculation following the business rules defined in the system.
