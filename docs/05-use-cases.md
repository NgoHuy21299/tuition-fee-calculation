# Use Cases chi tiết và thứ tự thực hiện

Tài liệu này liệt kê các Use Case (UC) chi tiết, sắp xếp theo thứ tự thực thi tối ưu dựa trên yêu cầu trong `docs/03-yeu-cau-chuc-nang.md` và các đề xuất hạ tầng trong `docs/04-cloudflare-dich-vu-de-xuat.md`.

Ghi chú định dạng UC:
- Mỗi UC có: Mục tiêu, Actor, Tiền đề, Luồng chính, Luồng thay thế, Dữ liệu/Endpoint liên quan, Tiêu chí nghiệm thu (AC).

## Thứ tự ưu tiên tổng thể
1. Xác thực & khung hạ tầng (Auth, Session, Env, DB)
2. Quản lý lớp học (Classes)
3. Quản lý học sinh (Students) và gán vào lớp
4. Lịch học/buổi học (Schedule/Sessions)
5. Điểm danh (Attendance)
6. Báo cáo tháng (Reports)
7. Thông báo email nhắc lịch (Cron + Queues)
8. Sinh nội dung tin nhắn phụ huynh (Messaging)
9. Cài đặt hệ thống (Settings)
10. Quan sát/giám sát (Observability) và bảo trì

---

## UC-01: Đăng nhập bắt buộc (Auth Gate)
- Mục tiêu: Chỉ cho phép giáo viên đã đăng nhập truy cập ứng dụng; chuyển hướng về `/login` nếu chưa auth.
- Actor: Giáo viên.
- Tiền đề:
  - Có trang `/login` (UI), middleware kiểm tra session/JWT ở API và loader bảo vệ route.
  - Biến môi trường secret đã thiết lập trong `wrangler.jsonc`.
- Luồng chính:
  1) Người dùng truy cập bất kỳ route bảo vệ -> bị redirect `/login` nếu chưa có session hợp lệ.
  2) Tại `/login`, người dùng xác thực (email/password).
  3) Sau khi thành công -> set cookie HttpOnly và điều hướng về `/dashboard`.
- Luồng thay thế:
  - Thất bại xác thực -> hiển thị thông báo lỗi, cho phép thử lại.
- Dữ liệu/Endpoint: `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/register`.
- AC:
  - Không đăng nhập không thể truy cập trang bảo vệ.
  - Có thể đăng nhập/đăng xuất ổn định, cookie an toàn.

## UC-02: Thiết lập hạ tầng dữ liệu (D1 + Migrations)
- Mục tiêu: Khởi tạo bảng dữ liệu nền tảng.
- Actor: Hệ thống/Dev.
- Tiền đề: Binding D1 `DB` trong `wrangler.jsonc` (đã có).
- Luồng chính:
  1) Tạo migrations cho bảng: Teacher, Class, Student, ClassStudent, Session, Attendance, EmailJob.
  2) Áp dụng migration lên D1 (local và production).
- Luồng thay thế: Nâng cấp lược đồ (migrations tiếp theo).
- Dữ liệu: D1 `DB`.
- AC: Migrations chạy thành công; có thể CRUD bản ghi cơ bản.

## UC-03: Tạo/Sửa/Xóa lớp học (Classes CRUD)
- Mục tiêu: Quản lý danh sách lớp học.
- Actor: Giáo viên.
- Tiền đề: Đã đăng nhập; có bảng `Class`.
- Luồng chính:
  1) Xem danh sách lớp tại `/classes`.
  2) Tạo lớp mới: name, subject, description, feePerSession, isActive.
  3) Sửa/Xoá lớp.
- Luồng thay thế: Validate dữ liệu; ngăn xóa lớp còn dữ liệu quan trọng (tùy chính sách).
- Endpoint: `GET/POST /api/classes`, `GET/PUT/DELETE /api/classes/:id`.
- AC: CRUD hoạt động; hiển thị cập nhật ngay trên UI.

## UC-04: Quản lý học sinh và gán vào lớp
- Mục tiêu: Quản lý học sinh và liên kết với lớp.
- Actor: Giáo viên.
- Tiền đề: Bảng `Student`, `ClassStudent`.
- Luồng chính:
  1) Tạo học sinh: name, parentEmail, parentPhone, note.
  2) Thêm học sinh vào lớp: `ClassStudent` (có thể unitPriceOverride?).
  3) Gỡ học sinh khỏi lớp (giữ lịch sử nếu cần: `leftAt`).
- Luồng thay thế: Nhập nhanh danh sách; kiểm tra trùng.
- Endpoint: `GET/POST /api/students`, `POST/DELETE /api/classes/:id/students`.
- AC: Học sinh hiển thị trong tab lớp; dữ liệu liên kết chính xác.

## UC-05: Tạo lịch/buổi học (Sessions)
- Mục tiêu: Tạo các buổi học cho lớp, có thể theo lặp.
- Actor: Giáo viên.
- Tiền đề: Có lớp, có học sinh (không bắt buộc để tạo buổi).
- Luồng chính:
  1) Tại `/classes/:classId/schedule`, tạo buổi: startTime, duration, notes, status=planned.
  2) Tạo theo lặp (ví dụ T2-4-6 18:00) sinh nhiều buổi trong khoảng thời gian.
  3) Chỉnh sửa/hủy buổi.
- Luồng thay thế: Xử lý trùng lịch; chỉ báo cảnh báo.
- Endpoint: `POST /api/classes/:id/sessions`, `GET /api/classes/:id/sessions`, `PUT/DELETE /api/sessions/:id`.
- AC: Buổi được sinh đúng thời gian; hiển thị trên UI.

## UC-06: Gửi email nhắc giờ học (Cron + Queues)
- Mục tiêu: Nhắc giáo viên trước giờ học kèm link điểm danh.
- Actor: Hệ thống.
- Tiền đề: Cron Triggers, Queues, provider Email + secrets.
- Luồng chính:
  1) Cron chạy mỗi phút, query D1 tìm buổi sẽ diễn ra trong 10–15 phút tới.
  2) Tạo job vào Queue với payload buổi học.
  3) Consumer Queue gửi email (Resend/SendGrid/Mailchannels) tới giáo viên, kèm link `/attendance/:classId/:sessionId`.
- Luồng thay thế: Retry khi gửi mail thất bại; log vào Analytics/Observability.
- Endpoint: Producer/Consumer nội bộ; có thể `POST /api/notifications/send` (thủ công).
- AC: Email được gửi đúng thời điểm; không gửi trùng (idempotent).

## UC-07: Điểm danh học sinh
- Mục tiêu: Đánh dấu tham dự/absent/late cho từng học sinh trong buổi.
- Actor: Giáo viên.
- Tiền đề: Có buổi học, có học sinh trong lớp; đã đăng nhập.
- Luồng chính:
  1) Mở link `/attendance/:classId/:sessionId`.
  2) UI hiển thị danh sách học sinh -> tick trạng thái, thêm ghi chú.
  3) Lưu điểm danh -> ghi vào `Attendance` với `markedBy`, `markedAt`.
- Luồng thay thế: Cho phép cập nhật lại sau buổi; có lịch sử thay đổi.
- Endpoint: `GET/POST /api/sessions/:id/attendance`.
- AC: Dữ liệu lưu chính xác; tổng buổi tính đúng.

## UC-08: Báo cáo theo tháng
- Mục tiêu: Xem/tạo báo cáo mỗi học sinh đã học những buổi nào, tổng buổi, tổng tiền.
- Actor: Giáo viên.
- Tiền đề: Dữ liệu Attendance/Sessions đầy đủ.
- Luồng chính:
  1) Chọn lớp + tháng tại `/reports/monthly`.
  2) API tổng hợp từ D1 -> trả về bảng chi tiết và tổng kết.
  3) Hiển thị trên UI; tùy chọn tải CSV/PDF (giai đoạn sau) hoặc gửi email.
- Luồng thay thế: Lọc theo học sinh; bỏ qua buổi hủy.
- Endpoint: `GET /api/reports/monthly?classId=&month=YYYY-MM`.
- AC: Số buổi và tiền tính đúng theo rule; performance ổn.

## UC-09: Sinh nội dung tin nhắn cho phụ huynh
- Mục tiêu: Sinh template “Tháng MM/YYYY, học sinh A tham gia X buổi, học phí Y VNĐ”.
- Actor: Giáo viên.
- Tiền đề: Có báo cáo tháng.
- Luồng chính:
  1) Tại UI báo cáo, bấm “Sinh tin nhắn”.
  2) Hệ thống tạo text cho từng học sinh; cho phép copy nhanh hoặc gửi email tổng hợp cho giáo viên.
- Luồng thay thế: Tùy chỉnh template.
- Endpoint: `POST /api/notifications/preview` (tạo preview nội dung).
- AC: Nội dung đúng số buổi/tiền; dễ copy/sử dụng.

## UC-10: Cài đặt hệ thống
- Mục tiêu: Thiết lập thông số (email provider, timezone, nhắc lịch mặc định, đơn giá mặc định, bảo mật…).
- Actor: Giáo viên.
- Tiền đề: Biến môi trường/Settings lưu ở D1.
- Luồng chính: Form `/settings` lưu cấu hình; secrets đặt qua Wrangler secrets.
- Endpoint: `GET/PUT /api/settings`.
- AC: Cấu hình áp dụng ngay các chức năng liên quan.

## UC-11: Quan sát/giám sát & nhật ký
- Mục tiêu: Theo dõi hoạt động, lỗi, chỉ số.
- Actor: Hệ thống/Dev.
- Tiền đề: Observability bật trong `wrangler.jsonc`.
- Luồng chính: Log lỗi quan trọng; ghi sự kiện analytics khi gửi email/điểm danh.
- AC: Có log để debug; cảnh báo khi lỗi gửi email.

---

## Lộ trình thực hiện đề xuất (Roadmap theo sprint)
- Sprint 1: UC-01, UC-02, skeleton API/DB + UI chính (`/login`, `/dashboard`).
- Sprint 2: UC-03, UC-04 (CRUD lớp, học sinh, liên kết), bảo vệ route trong loader.
- Sprint 3: UC-05 (lịch/buổi, lặp), UC-07 (điểm danh cơ bản).
- Sprint 4: UC-08 (báo cáo tháng), UC-09 (sinh tin nhắn), tối ưu hiệu năng truy vấn.
- Sprint 5: UC-06 (Cron+Queues gửi nhắc), UC-10 (cài đặt), UC-11 (observability nâng cao), R2 nếu cần.
