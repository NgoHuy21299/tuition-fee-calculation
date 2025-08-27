# Đặc tả yêu cầu (Personal Tuition Fee Calculation)

Tài liệu mô tả yêu cầu chức năng cho dự án cá nhân tính tiền học thêm. Hệ thống được thiết kế ưu tiên xác thực (yêu cầu đăng nhập ngay khi vào ứng dụng) và tập trung vào trải nghiệm cho giáo viên.

## Mục tiêu

- Quản lý lớp học thêm và lịch học một cách đơn giản.
- Điểm danh học sinh nhanh chóng qua link gửi email khi đến giờ học.
- Tổng hợp báo cáo theo tháng và tính tiền học theo số buổi tham gia.
- Hỗ trợ tạo nội dung tin nhắn gửi phụ huynh về số buổi và học phí.

## Người dùng & phân quyền

- **Giáo viên (Teacher)**: người dùng chính, bắt buộc đăng nhập để sử dụng mọi tính năng.

## Xác thực & bảo mật

- **Yêu cầu đăng nhập ngay khi vào web**:
  - Trang mặc định chuyển đến trang `Đăng nhập` nếu chưa xác thực.
  - Sau khi đăng nhập thành công, điều hướng về `Dashboard` giáo viên.
- Gợi ý kỹ thuật:
  - SSO/OAuth (Google) hoặc email/password (tự quản). Lưu session/JWT qua cookie HttpOnly.
  - Thiết lập middleware kiểm tra auth ở tất cả route UI/API (trừ `login`, `callback`, webhook email nếu có).

## Tính năng chính

1) Quản lý lớp học
- Tạo/Sửa/Xoá lớp học.
- Thuộc tính lớp: tên lớp, mô tả, môn học, đơn giá mỗi buổi (feePerSession), trạng thái (đang hoạt động/ngưng).

2) Lịch học của lớp
- Tạo lịch học: ngày/giờ bắt đầu, thời lượng, ghi chú, trạng thái (dự kiến/đã diễn ra/hủy).
- Hỗ trợ tạo lặp (ví dụ: thứ 2–4–6, 18:00) và sinh các buổi theo khoảng thời gian.

3) Học sinh trong lớp
- Thêm/Xoá học sinh vào lớp (có thể dùng danh bạ riêng hoặc nhập nhanh).
- Thuộc tính học sinh: họ tên, email phụ huynh, số điện thoại phụ huynh, ghi chú.

4) Gửi email nhắc giờ học + link điểm danh
- Trước giờ học X phút, hệ thống gửi email cho giáo viên:
  - Nội dung gồm thông tin buổi học và **link điểm danh** dành cho giáo viên.
  - Tùy chọn gửi thêm cho phụ huynh (thông báo sắp đến giờ học) — có thể bật/tắt per class.
- Email includes deep link: `/attendance/:classId/:sessionId` (yêu cầu giáo viên đăng nhập).

5) Điểm danh học sinh
- Giao diện điểm danh hiển thị danh sách học sinh -> check-in (có/không, muộn, ghi chú).
- Lưu lịch sử điểm danh: thời điểm, người thực hiện, thay đổi.

6) Báo cáo theo tháng
- Chọn lớp + tháng -> hiển thị báo cáo: mỗi học sinh tham gia những buổi nào, tổng số buổi, tổng tiền (số buổi x đơn giá lớp hoặc mức tuỳ chỉnh học sinh nếu có).
- Xuất: hiển thị trên web, tải file (CSV/PDF – giai đoạn sau), hoặc gửi email cho giáo viên.

7) Tạo nội dung tin nhắn gửi phụ huynh
- Sinh template tin nhắn: “Tháng MM/YYYY, học sinh A tham gia X buổi, học phí: Y VNĐ”.
- Tùy chọn copy nhanh hoặc gửi email tổng hợp cho giáo viên.

## Luồng nghiệp vụ tiêu biểu

- Tạo lớp mới -> Thiết lập đơn giá/bộ lịch (lặp) -> Thêm học sinh -> Hệ thống tự sinh các buổi -> Trước giờ học gửi email cho giáo viên -> Giáo viên mở link và điểm danh -> Cuối tháng mở trang báo cáo -> Xem/tải/gửi email -> Tạo tin nhắn cho phụ huynh.

## Dữ liệu & mô hình (gợi ý)

- Teacher: id, email, name, authProvider, createdAt.
- Class: id, teacherId, name, subject, description, feePerSession, isActive, createdAt.
- Student: id, name, parentEmail, parentPhone, note, createdAt.
- ClassStudent: id, classId, studentId, unitPriceOverride?, joinedAt, leftAt?
- Session: id, classId, startTime, durationMin, status, notes, createdAt.
- Attendance: id, sessionId, studentId, status (present/absent/late), note, markedBy, markedAt.
- EmailJob/Notification: id, type, target, scheduleTime, payload, status.

## Trang UI (đề xuất)

- /login: Đăng nhập.
- /dashboard: Tổng quan lớp, buổi sắp diễn ra.
- /classes: Danh sách lớp -> tạo/sửa/xoá.
- /classes/:classId: Chi tiết lớp, tab Học sinh, tab Lịch học.
- /classes/:classId/schedule: Tạo lịch/lặp.
- /attendance/:classId/:sessionId: Điểm danh.
- /reports/monthly: Báo cáo theo tháng (lọc lớp + tháng).
- /settings: Cài đặt (email, múi giờ, mặc định nhắc lịch…).

## API (đề xuất)

- Auth: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
- Classes: GET/POST /api/classes, GET/PUT/DELETE /api/classes/:id
- Students: GET/POST /api/students, liên kết lớp: POST/DELETE /api/classes/:id/students
- Schedule/Sessions: POST /api/classes/:id/sessions(generators), GET /api/classes/:id/sessions
- Attendance: GET/POST /api/sessions/:id/attendance
- Reports: GET /api/reports/monthly?classId=&month=YYYY-MM
- Notifications: POST /api/notifications/preview, POST /api/notifications/send

## Email & thông báo

- Tích hợp email provider (Cloudflare Email Workers, Resend, SendGrid…).
- Cấu hình lịch gửi qua CRON Triggers của Workers (ví dụ mỗi phút quét buổi sắp diễn ra trong X phút tới để gửi mail nhắc).
- Biến môi trường: EMAIL_API_KEY, EMAIL_SENDER, APP_BASE_URL, TIMEZONE.

## Tính tiền học & quy tắc

- Mặc định: tiền học = số buổi điểm danh “có mặt” x feePerSession của lớp.
- Cho phép override đơn giá theo học sinh (nếu có trường hợp đặc biệt).
- Quy ước điểm danh “muộn” vẫn tính buổi (có cấu hình).
- Hỗ trợ bỏ qua buổi bị hủy.

## Quy tắc điều hướng & bảo vệ route

- Nếu chưa đăng nhập, redirect về `/login` cho mọi route trừ public assets.
- Loader của mỗi route nên kiểm tra `context.cloudflare.env` + session để xác thực.

## Khả năng mở rộng (tương lai)

- Nhiều giáo viên (multi-tenant), mời thêm trợ giảng.
- Portal phụ huynh.
- Thanh toán online, xuất hóa đơn.
- Xuất PDF báo cáo.

## Ghi chú triển khai với code hiện tại

- Thêm middleware kiểm tra đăng nhập trong `workers/app.ts` cho các đường dẫn `/api/*`.
- Ở phần React Router, kiểm tra auth trong `loader` của các trang chính, hoặc tạo higher-order loader để tái sử dụng.
- Sử dụng `wrangler.jsonc` để thêm biến môi trường phục vụ email, base URL, timezone. Các biến đọc qua `context.cloudflare.env` (loader) hoặc `c.env` (Hono).
