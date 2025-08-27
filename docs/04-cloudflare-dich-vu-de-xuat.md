# Đề xuất các dịch vụ Cloudflare cho dự án

Tài liệu này chọn các dịch vụ Cloudflare phù hợp với yêu cầu trong `docs/03-yeu-cau-chuc-nang.md`, nêu ưu/nhược điểm và lý do chọn. Code hiện tại sử dụng Workers/Hono/React Router (xem `workers/app.ts`, `wrangler.jsonc`, `app/`).

## Tổng quan lựa chọn

- Nền tảng chạy: Cloudflare Workers (đang dùng).
- CSDL: D1 (SQLite phân tán – đủ cho quy mô cá nhân, dễ quản lý).
- Lưu trữ khóa-giá trị nhanh: KV (lưu session nhẹ, feature flags, cache tạm).
- Tác vụ nền và hàng đợi: Queues (gửi email, xử lý công việc không đồng bộ).
- Lên lịch: Cron Triggers (gửi email nhắc giờ học X phút trước buổi học).
- Lưu trữ file (tuỳ chọn): R2 (nếu xuất báo cáo PDF/CSV cần lưu trữ/tải lại).
- Chống bot cho form đăng nhập: Turnstile (nếu mở public, tránh abuse).
- Đồng bộ/khóa theo lớp/buổi: Durable Objects (nếu cần tính nhất quán khi điểm danh đồng thời).
- Quan sát/giám sát: Workers Observability/Logs/Analytics Engine.
- Email: Email Routing không gửi được transactional; dùng Email Workers + nhà cung cấp SMTP/API (Resend/SendGrid/Mailchannels) qua biến môi trường.

## Chi tiết dịch vụ

### 1) Cloudflare Workers (bắt buộc)
- Lý do chọn: Đã dùng cho SSR React Router và Hono API (`workers/app.ts`).
- Ưu điểm:
  - Edge runtime, latency thấp; tích hợp tốt Vite/React Router.
  - Dễ cấu hình qua `wrangler.jsonc`; secrets/vars thuận tiện.
- Nhược điểm:
  - Hạn mức CPU/runtime. Cần đẩy tác vụ nặng sang Queues.

### 2) D1 (CSDL chính)
- Lý do: Lưu giáo viên, lớp, học sinh, buổi học, điểm danh, logs báo cáo.
- Ưu điểm:
  - Managed SQLite, dễ migrate, chi phí thấp, phù hợp quy mô cá nhân.
  - Tích hợp native với Workers; driver nhẹ.
- Nhược điểm:
  - Chưa phù hợp khối lượng write cực lớn; một số tính năng nâng cao còn hạn chế.
- Gợi ý cấu hình:
  - Khai báo binding D1 trong `wrangler.jsonc` và type `Env` (`worker-configuration.d.ts`).
  - Tạo migration để dựng bảng: Teacher, Class, Student, ClassStudent, Session, Attendance, EmailJob.

### 3) KV (tuỳ chọn – session/cache nhẹ)
- Lý do: Lưu session (JWT id -> userId), token reset password, feature flags ngắn hạn, cache dữ liệu ít thay đổi.
- Ưu điểm:
  - Truy xuất nhanh, eventual consistency; chi phí thấp.
- Nhược điểm:
  - Không phù hợp dữ liệu quan hệ/phức tạp; consistency không mạnh.
- Gợi ý: Lưu session ID/metadata; dữ liệu chính (điểm danh, lớp, báo cáo) vẫn ở D1.

### 4) Queues (hàng đợi email/tác vụ nền)
- Lý do: Gửi email nhắc giờ học, gửi báo cáo, xử lý hàng loạt tách khỏi request người dùng.
- Ưu điểm:
  - Tin cậy, tách tác vụ tốn thời gian; retry, DLQ.
- Nhược điểm:
  - Cần thêm consumer Worker; phức tạp hơn so với gọi trực tiếp.
- Gợi ý:
  - Producer: API/cron push job vào queue (type: reminder/report).
  - Consumer: Worker đọc queue, gọi provider email bằng API key trong secrets.

### 5) Cron Triggers (lịch gửi email nhắc)
- Lý do: Tự động quét các buổi học sắp diễn ra (ví dụ 15 phút trước) và tạo job email.
- Ưu điểm:
  - Dễ cấu hình trong `wrangler.toml/jsonc` với cron expression.
- Nhược điểm:
  - Độ lệch thời gian nhỏ có thể có; cần logic idempotent.

### 6) R2 (tuỳ chọn – lưu file báo cáo)
- Lý do: Nếu muốn xuất và lưu báo cáo tháng (PDF/CSV) để tải lại hoặc chia sẻ link tạm.
- Ưu điểm:
  - Object storage rẻ; presigned URLs; tích hợp Workers tốt.
- Nhược điểm:
  - Không cần thiết nếu chỉ render báo cáo trực tiếp và gửi email nội dung thuần văn bản.

### 7) Turnstile (chống bot đăng nhập)
- Lý do: Nếu cho phép đăng ký/mở public, cần tránh spam login/credential stuffing.
- Ưu điểm:
  - Privacy-first captcha, dễ tích hợp form.
- Nhược điểm:
  - Thêm bước UX; có thể bỏ qua ban đầu nếu chỉ dùng cá nhân.

### 8) Durable Objects (đồng bộ/khóa theo phiên điểm danh – tuỳ chọn)
- Lý do: Đảm bảo tính nhất quán khi nhiều tab/thiết bị cùng điểm danh một buổi.
- Ưu điểm:
  - Cung cấp state nhất quán theo key (classId/sessionId); lock tự nhiên.
- Nhược điểm:
  - Phức tạp hơn D1 thuần; thêm chi phí/triển khai.
- Khuyến nghị: Chỉ dùng khi thật sự có xung đột ghi đồng thời đáng kể.

### 9) Workers Observability/Logs/Analytics Engine
- Lý do: Theo dõi lỗi, latency, số lần gọi, debug sự cố email/cron.
- Ưu điểm:
  - Bật nhanh trong `wrangler.jsonc` (`observability.enabled: true` đã bật).
  - Analytics Engine lưu sự kiện tuỳ ý (điểm danh, gửi mail) để phân tích.
- Nhược điểm:
  - Analytics Engine tính phí theo lưu trữ/số bản ghi; cân nhắc khi mở rộng.

### 10) Email (qua Email Workers + Provider bên ngoài)
- Lý do: Cloudflare Email Routing chủ yếu để nhận/forward, không gửi transactional.
- Giải pháp:
  - Dùng Resend/SendGrid/MailChannels qua API từ Worker/Queues.
  - Lưu API key trong secrets (`wrangler secret put ...`).
- Ưu điểm:
  - Gửi đáng tin cậy, theo dõi trạng thái gửi, template linh hoạt.
- Nhược điểm:
  - Phát sinh chi phí ngoài Cloudflare; cần cấu hình domain/DNS cho email.

## Kiến trúc gợi ý theo yêu cầu

- Request UI/API -> `workers/app.ts` (Hono).
- Auth: session JWT ký với secret; session id/metadata ở KV (nhẹ), user và quyền ở D1.
- Dữ liệu nghiệp vụ (lớp, lịch, học sinh, điểm danh) -> D1.
- Cron Triggers chạy mỗi phút: tìm buổi sắp diễn ra 10–15 phút tới -> push job vào Queues.
- Queues Consumer gửi email nhắc kèm deep link `/attendance/:classId/:sessionId`.
- Báo cáo tháng: query D1 -> render HTML/csv; nếu cần lưu -> R2; nếu chỉ gửi mail -> trực tiếp qua provider.
- Turnstile bảo vệ form `/login` nếu cần.

## Lý do tổng kết

- Quy mô cá nhân, nghiệp vụ rõ ràng -> D1 đủ dùng, đơn giản, rẻ.
- Tác vụ gửi email và lịch trình -> Cron + Queues đảm bảo không chặn request.
- Session/cache nhẹ -> KV kinh tế, tốc độ cao.
- Báo cáo file -> chỉ dùng R2 khi thật sự cần lưu trữ.
- Tăng an toàn đăng nhập -> Turnstile (tuỳ mức độ mở public).

## Cấu hình tham chiếu

- `wrangler.jsonc`: thêm bindings `d1_databases`, `kv_namespaces`, `queues`, `r2_buckets` (nếu dùng) và `vars`/`secrets`.
- `worker-configuration.d.ts`: mở rộng type `Env` để có `DB`, `KV`, `QUEUE`, `R2`, `EMAIL_API_KEY`…
- `workers/app.ts`: middleware auth, handlers API; producer Queues; đọc `c.env.*`.
- `app/routes/*`: kiểm tra auth trong `loader` (đọc `context.cloudflare.env`).
