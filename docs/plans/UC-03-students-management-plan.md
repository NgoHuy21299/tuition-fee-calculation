# UC-03: Quản lý học sinh và gán vào lớp – Implementation Plan

## 1. Database & Model
- [ ] Xác nhận domain tables đã có trong `0005_domain_schema.sql`: `Parent`, `Student(studentPhone, studentEmail)`, `Class`, `ClassStudent`, `Session`, `Attendance`.
- [ ] (Planned) Tạo migration chuẩn hóa contact fields của `Student` (không chạy ngay):
  - File đề xuất: `0007_student_contact_rename.sql`
  - Đổi tên cột: `studentPhone -> phone`, `studentEmail -> email`
  - Giữ nguyên index `idx_student_parentId(parentId)`
- [ ] Cập nhật `docs/database-docs.md` nếu cần, đảm bảo phần Student phản ánh đúng cột sử dụng bởi API.
- [ ] Không thay đổi cấu trúc `ClassStudent` (giữ `unitPriceOverride`, `joinedAt`, `leftAt`, UNIQUE(classId, studentId)).

Ghi chú:
- Luồng giá: `Attendance.feeOverride` > `ClassStudent.unitPriceOverride` > `Session.feePerSession`.
- `leftAt` dùng để giữ lịch sử rời lớp của học sinh.

## 2. Backend (Cloudflare Workers)
### 2.1 Routes & Middleware
- [ ] Tạo route `workers/routes/studentRoute.ts`
  - [ ] `GET /api/students` (filter: `classId`). Luôn lấy theo teacher id, hiện tại chưa cần pagination (pagination sẽ xử lý ở FE).
  - [ ] `POST /api/students` (create). API cần phải hỗ trợ việc bulk insert (tạo nhiều học sinh cùng lúc) và hỗ trợ tạo `Parent` kèm theo một cách optional (parentInline).
    - Body (single create) gợi ý:
      ```json
      {
        "name": "Đức Trí",
        "email": "",
        "phone": "",
        "note": "",
        "parentInline": {
          "relationship": "father|mother|grandfather|grandmother",
          "name": "Bố Đức Trí",  
          "phone": "",
          "email": "",
          "note": ""
        }
      }
      ```
    - Quy tắc: nếu có `parentInline` → backend tạo Parent trước, sau đó tạo Student gắn với Parent vừa tạo. Nếu không có `parentInline` → tạo Student không gắn Parent.
  - [ ] `GET /api/students/:id` (detail)
  - [ ] `PUT /api/students/:id` (update)
  - [ ] `DELETE /api/students/:id` (delete – giai đoạn đầu hard delete). Cần kiểm tra xem student đang có trong lớp nào không hoặc đã tham gia tiết học nào chưa -> nếu đã phát sinh liên kết với hệ thống thì không cho xóa (chỉ cho phép left khỏi class).
- [ ] Tạo route `workers/routes/classStudentRoute.ts`
  - [ ] `POST /api/classes/:id/students` (add student to class, body: `{ studentId, unitPriceOverride? }`)
  - [ ] `DELETE /api/classes/:id/students/:classStudentId` (remove; hoặc `PUT` để set `leftAt`)
- [ ] Đăng ký routes trên `workers/app.ts` và áp dụng `authMiddleware` toàn bộ endpoints (giáo viên phải đăng nhập).

### 2.2 Repository & SQL
- [ ] Tạo `workers/repos/studentRepository.ts`
  - [ ] `listByTeacher({ teacherId, classId? })` - Hiện tại chưa cần pagination hoặc filter nâng cao.
  - [ ] `create({ id, teacherId, name, email?, phone?, note?, parentInline? })`
  - [ ] `getById({ id, teacherId })`
  - [ ] `update({ id, teacherId, patch })`
  - [ ] `delete({ id, teacherId })`
  - [ ] (Hỗ trợ) `existsDuplicate({ teacherId, name, phone?, email? })`
- [ ] Tạo `workers/repos/classStudentRepository.ts`
  - [ ] `add({ id, classId, studentId, unitPriceOverride? })`
  - [ ] `leave({ classStudentId, leftAt })`
  - [ ] `listByClass({ classId, page, pageSize })`
  - [ ] `isMember({ classId, studentId })`

Lưu ý SQL/D1:
- `Class` đã có `teacherId`; khi query students theo teacher cần join qua các quan hệ sở hữu phù hợp (tuỳ chính sách dữ liệu: học sinh thuộc giáo viên).
- Ít nhất, filter theo `teacherId` từ Auth để ngăn truy cập chéo.

### 2.3 Validation & Types
- [ ] Tạo `workers/types/studentTypes.ts`
  - [ ] `CreateStudentInput`, `UpdateStudentInput`, `StudentDTO`
  - [ ] `ParentInlineInput { relationship: 'father'|'mother'|'grandfather'|'grandmother', name?, phone?, email?, note? }`
  - [ ] Ràng buộc: `name` bắt buộc; `email` hợp lệ; `phone` định dạng số/chuẩn; `note` độ dài tối đa.
  - [ ] Chuẩn hoá trả về: `StudentDTO { id, name, phone, email, parentName?, parentPhone?, note, createdAt }` (ẩn chi tiết parentId ở DTO; nếu cần thêm chi tiết parent thì tạo `ParentDTO` lồng bên trong).
- [ ] Tạo `workers/types/classStudentTypes.ts`
  - [ ] `AddClassStudentInput { studentId, unitPriceOverride? }`
  - [ ] `ClassStudentDTO { id, classId, studentId, unitPriceOverride, joinedAt, leftAt }`
- [ ] i18n: thêm messages/validation vào `workers/i18n/messages.ts` và `workers/i18n/validationMessages.ts`.

### 2.4 Services (Business Rules)
- [ ] `workers/services/studentService.ts`
  - [ ] `listByTeacher(...)` – list đơn giản theo teacher id, classId?.
  - [ ] `create(...)` – kiểm tra trùng (name + phone hoặc email). Hỗ trợ tạo `Parent` nội tuyến (không sử dụng `parentId` trên API):
       - Nếu có `input.parentInline` → chuẩn hoá `parentInline.name`:
         - Nếu không truyền `name` hoặc rỗng → auto-generate theo format: `${prefix} ${studentName}` với prefix map theo `relationship`:
           - father → "Bố"
           - mother → "Mẹ"
           - grandfather → "Ông"
           - grandmother → "Bà"
         - Nếu đã truyền `name` → dùng nguyên giá trị (giáo viên có thể tuỳ biến).
       - Tạo Parent trước → lấy `parentId` nội bộ → tạo Student (API/DTO không trả `parentId`, chỉ trả thông tin hiển thị của Parent nếu cần).
  - [ ] `update(...)` – không cho phép sửa gây trùng.
  - [ ] `delete(...)` – hard delete; cảnh báo nếu đang là thành viên của lớp (option: ngăn xoá nếu còn membership); nếu đã từng tham gia lớp học thì không thể xóa (vì đã có record trong classStudent, classStudent chỉ có thể leave chứ không bị remove).
- [ ] `workers/services/classStudentService.ts`
  - [ ] `add(...)` – enforce UNIQUE(classId, studentId), có thể ghi `unitPriceOverride`.
  - [ ] `leave(...)` – cập nhật `leftAt`.
  - [ ] Business rules: chỉ owner class được thao tác; không thêm học sinh đã rời nếu chính sách không cho phép.

## 3. Frontend (React)
### 3.1 API Client
- [ ] Tạo `frontend/src/services/studentService.ts`
  - [ ] `listStudents(params)` - Chú ý đối chiếu với backend để đưa params phù hợp.
  - [ ] `createStudent(payload)`
  - [ ] `getStudent(id)`
  - [ ] `updateStudent(id, patch)`
  - [ ] `deleteStudent(id)`
- [ ] Cập nhật/định nghĩa `frontend/src/services/classStudentService.ts`
  - [ ] `addStudentToClass(classId, payload)`
  - [ ] `leaveStudentFromClass(classId, classStudentId, leftAt)` - leftAt lấy current theo giờ UTC để lưu vào backend cho chuẩn hóa.

### 3.2 Pages & Components
- [ ] Sidebar: thêm mục "Học sinh" → route `/students`
- [ ] Trang danh sách `/students`
  - [ ] Bảng: Name, Phone, ParentName, Classes, Actions
  - [ ] Bộ lọc: `classId` (tuỳ chọn).
  - [ ] Actions: Tạo mới, Xem/Sửa, Xoá
- [ ] Modal/Form `StudentForm`
  - [ ] Trường: name (bắt buộc), email, phone, note (loại bỏ parentId select; dùng ParentInline duy nhất)
  - [ ] Hàng Parent riêng với nút "+" sau label:
        - Khi bấm "+" → hiện hàng nhập ParentInline gồm: Relationship (select: Bố/Mẹ/Ông/Bà), Name (prefill theo Relationship + tên học sinh, có thể sửa), Phone, Email, Note.
        - Nếu thay đổi Relationship và ô Name chưa bị user sửa tay → tự cập nhật Name theo công thức `${prefix} ${studentName}`.
        - Nếu user đã sửa Name thủ công → không auto-overwrite khi đổi Relationship, chỉ cho phép edit thủ công.
  - [ ] Validation, loading state, error display
  - [ ] Autosave LocalStorage:
        - Sau mỗi lần out-focus (blur) của một ô nhập (debounce ~300ms), lưu trạng thái form vào LocalStorage, key: `students.form.draft` (có thể kèm userId để tránh xung đột đa tài khoản).
        - Khi mở lại form, nếu có draft → hỏi khôi phục hoặc tự động điền lại.
        - Khi tạo thành công (201) → xóa draft khỏi LocalStorage.
- [ ] Tích hợp tab Học sinh ở trang lớp `/classes/:classId`
  - [ ] Danh sách thành viên lớp (ClassStudent)
  - [ ] Action: Add student to class (search + chọn), Leave
  - [ ] Tuỳ chọn: set `unitPriceOverride` khi thêm/sửa membership

### 3.3 UX
- [ ] Confirm dialog khi xoá học sinh (sử dụng `frontend/src/components/commons/ConfirmDialog.tsx`)
- [ ] Thông báo toast thành công/thất bại các thao tác CRUD
- [ ] Loading/empty/error states rõ ràng cho bảng và form
 - [ ] Hiển thị trạng thái đã lưu (autosaved) nho nhỏ ở góc form mỗi khi lưu draft (ví dụ: "Đã lưu bản nháp lúc 10:05").

## 4. Tests
- [ ] Unit tests (repos/services)
  - [ ] Student: tạo/sửa/xoá, tìm kiếm, kiểm tra trùng, quyền sở hữu
  - [ ] ClassStudent: thêm/xoá, unique membership, leftAt
- [ ] Integration tests (routes)
  - [ ] Auth required, validation errors, pagination
- [ ] (Tuỳ chọn) E2E smoke: tạo student → gán vào lớp → gỡ → xoá student
 - [ ] Frontend tests:
   - [ ] ParentInline name auto-populate khi chọn Relationship và khi đổi tên học sinh (chỉ khi chưa sửa tay tên phụ huynh).
   - [ ] Autosave LocalStorage: debounce 300ms sau blur; khôi phục draft; xoá draft sau khi tạo thành công.

## 5. Documentation
- [ ] Cập nhật `docs/05-use-cases.md` (UC-03) nếu có thay đổi API/luồng
- [ ] Cập nhật `docs/database-docs.md` khi chốt cột contact của Student và ghi chú migration
- [ ] Viết README ngắn cho `/students` page (cách sử dụng bộ lọc, gán vào lớp)

## 6. Rollout Checklist
- [X] Quyết định cuối cùng về contact fields của Student (sử dụng `studentPhone/studentEmail` hiện có hay rename) => rename
- [ ] Nếu rename: tạo/duyệt migration `0007_student_contact_rename.sql` và áp dụng trên môi trường
- [ ] Triển khai backend routes + repos + services
- [ ] Triển khai frontend pages + API client
- [ ] Manual QA: CRUD học sinh; thêm/gỡ học sinh khỏi lớp; kiểm tra liên kết dữ liệu; xác thực quyền truy cập

## 7. Open Questions / Risks
- [X] Quan hệ sở hữu Student theo giáo viên: có cần `teacherId` trên `Student`? (Hiện dựa trên quyền truy cập chung; cân nhắc khi multi-tenant thực tế) => Không cần teacherId trên Student, bởi vì một student sẽ được gán vào lớp, giáo viên sẽ được 'phân công' dạy lớp đó => học sinh không thuộc về giáo viên nào.
- [X] Xoá học sinh nếu còn lịch sử Attendance: nên ngăn xoá hay cho phép? (gợi ý: ngăn xoá nếu có Attendance; hoặc soft delete) => Ngăn không cho xóa
- [X] Chính sách `leftAt`: khi remove có xoá hẳn row `ClassStudent` hay luôn cập nhật `leftAt` để giữ lịch sử? => Luôn cập nhật leftAt để giữ lại lịch sử. 
- [X] Tích hợp `Parent`: cần endpoint tạo nhanh Parent hay thao tác qua StudentForm là đủ? => Thao tác qua StudentForm luôn.
