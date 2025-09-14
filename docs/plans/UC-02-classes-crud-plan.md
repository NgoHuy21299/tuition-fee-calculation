# UC-02: Tạo/Sửa/Xóa lớp học (Classes CRUD) – Implementation Plan

## 1. Database & Model
- [X] Bổ sung cột `Class.defaultFeePerSession` (0006_add_class_default_fee.sql)
- [X] Cập nhật tài liệu: `docs/database-docs.md` (mục Class + ghi chú defaulting cho Session)

## 2. Backend (Cloudflare Workers)
### 2.1 Routes & Middleware
- [X] Tạo route `workers/routes/classRoute.ts` (chú ý cần phải documentation đầy đủ cho các endpoint)
  - [X] `GET /api/classes` (filter: q, isActive; paginate; sort)
  - [X] `POST /api/classes` (create)
  - [X] `GET /api/classes/:id` (detail)
  - [X] `PUT /api/classes/:id` (update)
  - [X] `DELETE /api/classes/:id` (delete)
- [X] Đăng ký route trong `workers/app.ts`
- [X] Áp dụng `authMiddleware` cho toàn bộ endpoints, chỉ cần kiểm tra lại xem đã áp dụng tự động chưa, nếu tôi không nhầm thì chỉ có một vài api trong public mới không được áp dụng auth middleware.S

### 2.2 Repository & SQL
- [X] Tạo `workers/repos/classRepository.ts`
  - [X] `listByTeacher({ teacherId, page, pageSize, q, isActive, sort })`
  - [X] `create({ id, teacherId, name, subject, description, defaultFeePerSession, isActive })`
  - [X] `getById({ id, teacherId })`
  - [X] `update({ id, teacherId, patch })`
  - [X] `delete({ id, teacherId })`
  - [X] `hasStudents({ classId })` (từ `ClassStudent`)
  - [X] `hasSessions({ classId })` (từ `Session`)

### 2.3 Validation & Types
- [X] Tạo `workers/types/classTypes.ts`
  - [X] `CreateClassInput`, `UpdateClassInput`, `ClassDTO`
  - [X] Ràng buộc: `name` bắt buộc; `defaultFeePerSession` là số nguyên >= 0 hoặc null; độ dài `subject/description`
- [X] Map `isActive` (0/1) ↔ boolean trong DTO

### 2.3.1 Tạo service
- [X] Tạo `workers/services/classService.ts`
  - [X] `listByTeacher({ teacherId, page, pageSize, q, isActive, sort })`
  - [X] `create({ id, teacherId, name, subject, description, defaultFeePerSession, isActive })`
  - [X] `getById({ id, teacherId })`
  - [X] `update({ id, teacherId, patch })`
  - [X] `delete({ id, teacherId })`
  - [X] `hasStudents({ classId })`
  - [X] `hasSessions({ classId })`
- [X] Business rules:
  - [X] Chỉ owner (`teacherId` từ auth) mới được CRUD class
  - [X] Xóa lớp: nếu còn `ClassStudent` hoặc `Session` → trả 409 `CLASS_HAS_DEPENDENCIES`
  - [X] Thêm thông báo lỗi/i18n trong `workers/i18n/messages.ts`
  - [X] Chuẩn hóa trả lỗi: NOT_FOUND, FORBIDDEN, VALIDATION_ERROR

## 3. Frontend (React)
### 3.1 API Client
- [X] Tạo `frontend/src/services/classService.ts`
  - [X] `listClasses(params)`
  - [X] `createClass(payload)`
  - [X] `getClass(id)`
  - [X] `updateClass(id, patch)`
  - [X] `deleteClass(id)`

### 3.2 Pages & Components
- [X] Danh sách lớp `/classes`
  - [X] Bảng: name, subject, defaultFeePerSession, isActive, createdAt, actions
  - [X] Bộ lọc: `q`, `isActive`, phân trang; sort mặc định `createdAt desc`
  - [X] Actions: Tạo mới, Xem/Sửa, Xóa
- [X] Form tạo/sửa `ClassForm`
  - [X] Trường: name (bắt buộc), subject, description, defaultFeePerSession (number), isActive (toggle)
  - [X] Validation UI; helper text: "Giá mặc định để điền sẵn khi tạo buổi học. Có thể thay đổi từng buổi."
  - [X] Loading/disabled state khi submit; hiển thị lỗi
- [X] Trang chi tiết `ClassDetail`
  - [X] Hiển thị metadata class
  - [X] Tabs: Overview | Students (placeholder UC-03) | Sessions (placeholder UC-04)
  - [X] Hành động: Lưu, Toggle Active, Xóa
- [X] Sidebar: Đảm bảo có link tới `/classes`

### 3.3 UX/XOá lớp
- [X] Confirm modal khi xóa
- [X] Nếu API trả 409 `CLASS_HAS_DEPENDENCIES`, hiển thị hướng dẫn: "Không thể xoá lớp vì còn học sinh hoặc buổi học. Vui lòng xoá/di chuyển dữ liệu trước."

## 4. Tests
- [ ] Unit tests (repo): CRUD, filter/search, ownership, dependency checks
- [ ] Integration tests (routes): auth required, validation, 409 on delete, pagination
- [ ] (Tùy chọn) E2E smoke: tạo → sửa → danh sách → xóa

## 5. Documentation
- [ ] Cập nhật `docs/05-use-cases.md` (UC-02) để thêm trường `defaultFeePerSession` vào bước tạo lớp
- [ ] Ghi chú defaulting: Khi tạo Session thuộc Class, nếu không truyền `feePerSession`, backend prefill từ `Class.defaultFeePerSession`

## 6. Rollout Checklist
- [ ] Chạy migrations đến `0006`
- [ ] Triển khai backend route + repo + types
- [ ] Triển khai frontend pages + API client
- [ ] Manual QA: CRUD lớp; thử prefill giá khi tạo session (sẽ thực hiện ở UC-04)
- [ ] Cập nhật docs và chốt kế hoạch cho UC-03/UC-04 liên kết
