# Cấu trúc dự án

Tổng quan các thư mục và file chính trong repository:

```
/ (root)
├─ app/
│  ├─ components/
│  │  ├─ DashboardHeader.tsx
│  │  ├─ DashboardSidebar.tsx
│  │  ├─ DashboardBody.tsx
│  │  └─ DashboardShell.tsx
│  ├─ routes/
│  │  ├─ home.tsx
│  │  ├─ login.tsx
│  │  ├─ register.tsx
│  │  └─ dashboard.tsx
│  ├─ utils/
│  │  ├─ auth.server.ts
│  │  └─ misc.ts
│  ├─ app.css
│  ├─ entry.server.tsx
│  ├─ root.tsx
│  ├─ routes.ts
│  ├─ types/
│  │  └─ react-router.d.ts
│  └─ welcome/
│     ├─ logo-dark.svg
│     ├─ logo-light.svg
│     └─ welcome.tsx
├─ public/
│  └─ favicon.ico
├─ workers/
│  ├─ app.ts
│  ├─ constants.ts
│  ├─ handlers/
│  │  └─ ssr.ts
│  ├─ middleware/
│  │  └─ auth.ts
│  ├─ routes/
│  │  └─ auth.ts
│  └─ lib/
│     ├─ jwt.ts
│     └─ cookies.ts
├─ .react-router/
├─ build/
├─ package.json
├─ package-lock.json
├─ react-router.config.ts
├─ vite.config.ts
├─ wrangler.jsonc
├─ worker-configuration.d.ts
├─ tsconfig.json
├─ tsconfig.node.json
├─ tsconfig.cloudflare.json
└─ README.md
```

## Thư mục và file quan trọng

- __`app/`__: Nơi chứa code frontend của React Router (SSR + SPA).
  - __`app/routes/`__: Các file component cho từng page/route. Ví dụ `home.tsx`.
    - Mỗi file có thể export `meta`, `loader`, `action` và default component.
    - Dữ liệu `loader` truy cập được `context.cloudflare.env` để lấy biến môi trường từ Workers.
  - __`app/routes.ts`__: Khai báo cấu hình routes theo kiểu file-based của `@react-router/dev/routes`.
    - Ví dụ: `index("routes/home.tsx")` cho route `/`.
    - Thêm mới page bằng cách thêm `route("/path", "routes/your-file.tsx")`.
    - Đã có: `/login`, `/register`, `/dashboard` (bảo vệ bằng loader `requireUser`).
  - __`app/root.tsx`__: Root layout, khai báo `<Links/>`, `<Meta/>`, `<Scripts/>`, `<Outlet/>`, và `ErrorBoundary`.
  - __`app/entry.server.tsx`__: Hàm `handleRequest` để render SSR bằng `ServerRouter`.
  - __`app/app.css`__: CSS toàn cục (kết hợp với Tailwind qua plugin Vite).
  - __`app/types/react-router.d.ts`__: Bổ sung type Cloudflare context cho React Router loaders.
  - __`app/utils/auth.server.ts`__: Helper `requireUser(request, env)` cho loader, xác thực JWT từ cookie.
  - __`app/welcome/`__: Component chào mừng và tài nguyên SVG mẫu.

- __`workers/`__:
  - __`workers/app.ts`__: Ứng dụng Hono chạy trên Cloudflare Workers.
    - Áp dụng middleware `apiAuthGuard` cho tất cả `/api/*`.
    - Định tuyến `app.route("/api/auth", createAuthRouter())` (login/logout/register).
    - Bắt các request còn lại bằng SSR handler để render React Router.
    - Có handler tắt tiếng request DevTools `/.well-known/appspecific/com.chrome.devtools.json` (204).
  - __`workers/constants.ts`__: Khai báo `COOKIE_NAME`, `COOKIE_MAX_AGE`, `PUBLIC_PATHS`, `PUBLIC_API_PATHS`.
  - __`workers/middleware/auth.ts`__: `apiAuthGuard` bảo vệ `/api/*` trừ các `PUBLIC_API_PATHS`.
  - __`workers/routes/auth.ts`__: Endpoints `POST /login`, `POST /logout`, `POST /register` và set/clear cookie.
  - __`workers/lib/jwt.ts`__, __`workers/lib/cookies.ts`__, __`workers/handlers/ssr.ts`__.

- __`public/`__:
  - Tài nguyên tĩnh phục vụ trực tiếp (ví dụ `favicon.ico`). Có thể mở rộng thêm ảnh, robots.txt,…

- __`wrangler.jsonc`__:
  - Cấu hình Worker: `name`, `compatibility_date`, `main` (trỏ tới `workers/app.ts`).
  - `vars`: Biến môi trường (ví dụ `VALUE_FROM_CLOUDFLARE`). Truy cập qua `c.env` (Hono) hoặc `context.cloudflare.env` (loader React Router).
  - Có thể cấu hình bindings khác (KV, D1, R2, Queues…), `assets` cho static binding, `services` cho service bindings.

- __`vite.config.ts`__:
  - Khai báo plugin: `@cloudflare/vite-plugin`, `@tailwindcss/vite`, `@react-router/dev/vite`, `vite-tsconfig-paths`.
  - Thiết lập `viteEnvironment` cho SSR.

- __`react-router.config.ts`__:
  - Bật `ssr: true` và `future.unstable_viteEnvironmentApi`.

- __`worker-configuration.d.ts`__:
  - Khai báo type cho `Env` (Bindings). Giúp TypeScript hiểu các biến môi trường/binding có sẵn.

- __`tsconfig*.json`__:
  - Cấu hình TypeScript cho dự án và các môi trường khác nhau (node, cloudflare).

- __`build/`__, __`.react-router/`__, __`node_modules/`__:
  - Thư mục tạo bởi build/dev tool. Không chỉnh sửa trực tiếp.

## Hướng dẫn ngắn: thêm Page mới

- Tạo file mới trong `app/routes/`, ví dụ `app/routes/about.tsx`.
- Khai báo route trong `app/routes.ts` bằng `route("/about", "routes/about.tsx")` (giữ nguyên `index("routes/home.tsx")` nếu cần trang chủ).
- Chạy `npm run dev` và truy cập `/about`.

## Hướng dẫn ngắn: thêm API mới (Hono)

- Mở `workers/app.ts` và thêm trước handler `app.get("*", ...)`:
  ```ts
  app.get("/api/health", (c) => c.json({ ok: true }));
  ```
- Đọc biến môi trường qua `c.env.MY_VAR`; nếu cần, khai báo trong `wrangler.jsonc` phần `vars` hoặc sử dụng `wrangler secret` cho dữ liệu nhạy cảm.

## Lưu ý

- Khi thay đổi bindings/vars, chạy lại dev server để được cập nhật.
- Nếu dùng D1/KV/R2…, cần thêm binding tương ứng trong `wrangler.jsonc` và mở rộng type `Env`.
- UI dùng Tailwind + có thể tích hợp ShadCN UI dễ dàng cho component nhất quán.
