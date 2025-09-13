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
- [ ] Tạo `workers/repos/classRepository.ts`
  - [ ] `listByTeacher({ teacherId, page, pageSize, q, isActive, sort })`
  - [ ] `create({ id, teacherId, name, subject, description, defaultFeePerSession, isActive })`
  - [ ] `getById({ id, teacherId })`
  - [ ] `update({ id, teacherId, patch })`
  - [ ] `delete({ id, teacherId })`
  - [ ] `hasStudents({ classId })` (từ `ClassStudent`)
  - [ ] `hasSessions({ classId })` (từ `Session`)

### 2.3 Validation & Types
- [ ] Tạo `workers/types/classTypes.ts`
  - [ ] `CreateClassInput`, `UpdateClassInput`, `ClassDTO`
  - [ ] Ràng buộc: `name` bắt buộc; `defaultFeePerSession` là số nguyên >= 0 hoặc null; độ dài `subject/description`
- [ ] Map `isActive` (0/1) ↔ boolean trong DTO

### 2.4 Business Rules & Errors
- [ ] Chỉ owner (`teacherId` từ auth) mới được CRUD class
- [ ] Xóa lớp: nếu còn `ClassStudent` hoặc `Session` → trả 409 `CLASS_HAS_DEPENDENCIES`
- [ ] Thêm thông báo lỗi/i18n trong `workers/i18n/messages.ts`
- [ ] Chuẩn hóa trả lỗi: NOT_FOUND, FORBIDDEN, VALIDATION_ERROR

### 2.5 Integration với UCs tiếp theo
- [ ] Trả về `defaultFeePerSession` trong GET để UC tạo `Session` có thể prefill `feePerSession`
- [ ] Chuẩn bị `Students` tab (UC-03) và `Sessions` tab (UC-04) ở phần Frontend (placeholder dữ liệu)

## 3. Frontend (React)
### 3.1 API Client
- [ ] Tạo `frontend/src/services/classService.ts`
  - [ ] `listClasses(params)`
  - [ ] `createClass(payload)`
  - [ ] `getClass(id)`
  - [ ] `updateClass(id, patch)`
  - [ ] `deleteClass(id)`

### 3.2 Pages & Components
- [ ] Danh sách lớp `/classes`
  - [ ] Bảng: name, subject, defaultFeePerSession, isActive, createdAt, actions
  - [ ] Bộ lọc: `q`, `isActive`, phân trang; sort mặc định `createdAt desc`
  - [ ] Actions: Tạo mới, Xem/Sửa, Xóa
- [ ] Form tạo/sửa `ClassForm`
  - [ ] Trường: name (bắt buộc), subject, description, defaultFeePerSession (number), isActive (toggle)
  - [ ] Validation UI; helper text: "Giá mặc định để điền sẵn khi tạo buổi học. Có thể thay đổi từng buổi."
  - [ ] Loading/disabled state khi submit; hiển thị lỗi
- [ ] Trang chi tiết `ClassDetail`
  - [ ] Hiển thị metadata class
  - [ ] Tabs: Overview | Students (placeholder UC-03) | Sessions (placeholder UC-04)
  - [ ] Hành động: Lưu, Toggle Active, Xóa
- [ ] Sidebar: Đảm bảo có link tới `/classes`

### 3.3 UX/XOá lớp
- [ ] Confirm modal khi xóa
- [ ] Nếu API trả 409 `CLASS_HAS_DEPENDENCIES`, hiển thị hướng dẫn: "Không thể xoá lớp vì còn học sinh hoặc buổi học. Vui lòng xoá/di chuyển dữ liệu trước."

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
