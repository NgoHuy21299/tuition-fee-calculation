# Kế hoạch triển khai chi tiết: UC-01 Đăng nhập bắt buộc (Auth Gate)

Mục tiêu: Bảo vệ toàn bộ ứng dụng, yêu cầu người dùng (giáo viên) đăng nhập trước khi truy cập bất kỳ route nào (trừ các route công khai như `/login`, static assets). Sau đăng nhập chuyển đến `/dashboard`.

## 1) Quyết định kỹ thuật

- __Cách xác thực__: Giai đoạn đầu dùng email/password nội bộ cho đơn giản. Có thể nâng cấp OAuth Google sau.
- __Phiên đăng nhập__: JWT ký bằng secret, lưu trong cookie HttpOnly (Secure, SameSite=Lax/Strict). Session store tối thiểu: không bắt buộc KV (JWT tự chứa), nhưng có thể dùng KV để revoke sớm hoặc theo dõi hoạt động.
- __Bindings__:
  - Đã có: `DB: D1Database` trong `wrangler.jsonc`.
  - Tùy chọn: `KV` cho session blacklist/token reset (nâng cấp sau UC-01 nếu cần).
- __Migrations D1__ (tối thiểu cho auth):
  - Bảng `Teacher` (id, email UNIQUE, password_hash, name, createdAt)
  - Bảng `SessionRevocation` (optional) hoặc sử dụng KV cho revoke.

## 2) Công việc cụ thể theo file

- __`workers/app.ts`__
  1) Thêm middleware parse cookie, verify JWT, gắn `c.set('user', user)` nếu hợp lệ.
  2) Bỏ qua kiểm tra auth cho các đường dẫn: `/login`, `/api/auth/login`, `/api/auth/logout`, static assets `/build/*`, `/favicon.ico`.
  3) Với đường dẫn `/api/*` còn lại: trả 401 nếu thiếu/invalid.
  4) Đối với request UI (không phải `/api/*`): nếu chưa auth -> để React Router loader xử lý redirect về `/login` (hoặc có thể redirect ngay tại Workers đối với các path không-public).
  5) Tạo endpoints:
     - `POST /api/auth/login` nhận `{ email, password }`, tra `Teacher` và so sánh `password_hash` (bcrypt/argon2 – xem giới hạn runtime; có thể dùng Web Crypto + scrypt/argon2 WASM nhẹ). Nếu khớp -> ký JWT, set cookie, trả 200.
     - `POST /api/auth/logout` xóa cookie (set Max-Age=0) hoặc thêm vào blacklist (KV hoặc bảng revocation), trả 200.

- __`app/routes.ts`__
  - Thêm route `/login` đến `routes/login.tsx`.
  - Bảo tồn `index("routes/home.tsx")` hoặc đổi `index` thành `dashboard` khi có.

- __`app/routes/login.tsx`__ (mới)
  - Form nhập email/password, submit `POST /api/auth/login`.
  - Sau khi thành công: `navigate('/dashboard')` hoặc server trả redirect.

- __`app/routes/*` loaders__
  - Tạo helper `requireUser()` (dùng trong loader) đọc `context.cloudflare.env` + cookie từ `request.headers`:
    - Gọi `verifyJWT(cookie)` (trùng thuật toán với Workers middleware). Nếu invalid -> trả `redirect('/login')`.
  - Áp dụng `requireUser()` cho tất cả route bảo vệ (`/`, `/dashboard`, `/classes`, ...).

- __Secrets & cấu hình__
  - `wrangler secret put JWT_SECRET`
  - Optional: `wrangler secret put PASSWORD_PEPPER`
  - Thiết lập `COOKIE_NAME=auth` trong `vars` (không nhạy cảm) nếu muốn.

- __Type & Env__
  - Cập nhật `worker-configuration.d.ts` bằng cách chạy `npm run cf-typegen` sau khi thêm secrets/vars mới.

## 3) Luồng xử lý

- Login:
  1) UI POST `/api/auth/login` -> Workers tra DB -> nếu đúng -> tạo JWT (payload: `sub=teacherId`, `email`, `exp`), set cookie HttpOnly.
  2) Trả 200 (hoặc 204) -> UI điều hướng `/dashboard`.
- Mọi request sau đó:
  - Workers middleware/loader xác minh cookie JWT. Invalid/expired -> redirect `/login`.
- Logout:
  - POST `/api/auth/logout` -> clear cookie. Nếu dùng blacklist -> ghi vào KV/bảng đến khi `exp` qua.

## 4) Schema D1 gợi ý (SQL)

```sql
CREATE TABLE IF NOT EXISTS Teacher (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Giai đoạn sau khi cần reset password/email verify mới bổ sung bảng/field.

## 5) Chi tiết JWT & Cookie

- Thuật toán: HS256 (HMAC) với `JWT_SECRET` (đơn giản, đủ cho cá nhân). Có thể nâng cấp RS256.
- Thời hạn: 7 ngày (configurable). Gia hạn rolling khi có hoạt động.
- Cookie:
  - `Set-Cookie: auth=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`

## 6) Bảo vệ route trong React Router

- Helper `requireUser(request, env)` ở thư mục tiện ích, dùng trong tất cả `loader` các route chính.
- 404/500 vẫn do `app/root.tsx` quản lý `ErrorBoundary`.

## 7) Kiểm thử

- Unit: verifyJWT, signJWT, hash/verify password.
- Integration: `/api/auth/login` happy/invalid, loader redirect khi không có cookie.
- E2E: Đăng nhập -> vào `/classes` thấy nội dung; logout -> bị đá về `/login`.

## 8) Lộ trình triển khai UC-01

1) Tạo bảng `Teacher` (migration D1) và seed một tài khoản mặc định (dev).
2) Thêm secrets `JWT_SECRET` (và `PASSWORD_PEPPER` nếu dùng).
3) Implement endpoints `/api/auth/login`, `/api/auth/logout` trong `workers/app.ts`.
4) Thêm middleware verify JWT cho `/api/*`.
5) Tạo `app/routes/login.tsx` + form + xử lý redirect.
6) Viết helper `requireUser()` và áp vào loaders các route.
7) Test local `npm run dev` và cập nhật tài liệu nếu thay đổi.

## 9) Tài liệu cập nhật

- Cập nhật `docs/02-cau-truc-du-an.md` phần routes để thêm `/login` khi tạo.
- Cập nhật `docs/05-use-cases.md` (UC-01) nếu có thay đổi nhỏ trong flow.
- Cập nhật `docs/04-cloudflare-dich-vu-de-xuat.md` nếu thêm KV cho session blacklist.

## 10) TODO Status
[completed] Implement login page UI at 
app/routes/login.tsx
 with black/white modern style
[completed] Register /login route in 
app/routes.ts
[completed] Generate route types (+types) and run typecheck
[pending] Implement API endpoints and middleware in workers/app.ts
[pending] Create requireUser() and apply to protected loaders
[pending] Add /dashboard stub route
[pending] Update docs for /login and UC-01
