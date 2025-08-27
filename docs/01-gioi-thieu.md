# Tổng quan dự án

Dự án là một template full-stack hiện đại chạy trên Cloudflare Workers, kết hợp:

- Frontend: React + React Router (SSR + SPA mode), UI theo phong cách ShadCN và Tailwind CSS (đã cấu hình plugin Tailwind cho Vite).
- Backend: Hono (chạy cùng Worker), định nghĩa API linh hoạt theo chuẩn REST.
- Build/Dev: Vite + @cloudflare/vite-plugin, @react-router/dev cho routing, Wrangler để deploy lên Cloudflare.

Các thành phần chính liên quan:
- `workers/app.ts`: Ứng dụng Hono khởi tạo React Router handler và có chỗ để khai báo các endpoint API tùy chỉnh.
- `app/`: Code React Router (route files, root, entry.server, styles,…).
- `wrangler.jsonc`: Cấu hình deploy Cloudflare Workers, biến môi trường (`vars`).
- `vite.config.ts`: Cấu hình Vite + plugin Cloudflare + Tailwind + React Router.
- `package.json`: Dependencies và scripts (`dev`, `build`, `deploy`, `typecheck`).

## Cách hoạt động tổng quan

- Mọi request được Worker (Hono) tiếp nhận tại `workers/app.ts`.
- Các path không phải API sẽ được `createRequestHandler` chuyển cho React Router để render SSR/SPA dựa trên các route được khai báo ở `app/routes.ts`.
- API do bạn tự định nghĩa trên Hono (ví dụ `/api/*`) trước khi rơi vào handler React Router.
- Trong React Router, `loader`/`action` có thể truy cập `context.cloudflare.env` để lấy biến môi trường cấu hình từ Workers (`wrangler.jsonc`). Ví dụ trong `app/routes/home.tsx`:
  - `loader` đọc `context.cloudflare.env.VALUE_FROM_CLOUDFLARE` và trả về cho component qua `loaderData`.

## Quy trình thêm mới một Page (Route UI)

1) Tạo file route mới trong `app/routes/`, ví dụ: `app/routes/about.tsx`.
   - Xuất các hàm tùy chọn như `meta`, `loader`, `action` và component default:
     ```tsx
     import type { Route } from "./+types/about";

     export function meta({}: Route.MetaArgs) {
       return [{ title: "About" }];
     }

     export function loader({ context }: Route.LoaderArgs) {
       return { env: context.cloudflare.env.VALUE_FROM_CLOUDFLARE };
     }

     export default function About({ loaderData }: Route.ComponentProps) {
       return <div>About page - env: {loaderData.env}</div>;
     }
     ```

2) Khai báo đường dẫn trong `app/routes.ts`.
   - File hiện tại:
     ```ts
     import { type RouteConfig, index } from "@react-router/dev/routes";

     export default [index("routes/home.tsx")] satisfies RouteConfig;
     ```
   - Thêm một route mới, ví dụ `/about` trỏ tới `routes/about.tsx`:
     ```ts
     import { type RouteConfig, index, route } from "@react-router/dev/routes";

     export default [
       index("routes/home.tsx"),
       route("/about", "routes/about.tsx"),
     ] satisfies RouteConfig;
     ```
   - Gợi ý: có thể tạo nested routes bằng cách truyền mảng children cho `route(...)` nếu cần.

3) Chạy dev và kiểm tra:
   - `npm run dev` rồi truy cập `/about`.

## Quy trình thêm mới một API (Hono)

1) Mở `workers/app.ts` và khai báo route API trước đoạn `app.get("*", ...)` (vì đoạn này sẽ bắt tất cả path còn lại để render React Router):
   ```ts
   import { Hono } from "hono";
   import { createRequestHandler } from "react-router";

   const app = new Hono<{ Bindings: Env }>();

   // API mẫu
   app.get("/api/health", (c) => c.json({ ok: true }));

   app.post("/api/tuition/calc", async (c) => {
     const body = await c.req.json<{ credits: number; feePerCredit: number }>();
     const total = body.credits * body.feePerCredit;
     return c.json({ total });
   });

   // React Router handler (để cuối cùng)
   app.get("*", (c) => {
     const requestHandler = createRequestHandler(
       () => import("virtual:react-router/server-build"),
       import.meta.env.MODE,
     );
     return requestHandler(c.req.raw, {
       cloudflare: { env: c.env, ctx: c.executionCtx },
     });
   });

   export default app;
   ```

2) Sử dụng biến môi trường và binding trong API (nếu cần):
   - Khai báo trong `wrangler.jsonc` phần `vars` hoặc các binding khác (D1, KV,…).
   - Đọc qua `c.env` trong handler Hono.

3) Test:
   - `npm run dev` và gọi thử `GET /api/health` hoặc `POST /api/tuition/calc`.

## Scripts hữu ích

- `npm run dev`: Chạy dev server (Workers + React Router) với HMR.
- `npm run build`: Build React Router app.
- `npm run preview`: Preview build tĩnh với Vite (phục vụ kiểm tra UI).
- `npm run deploy`: Build và deploy Worker qua Wrangler.
- `npm run typecheck`: Sinh type Workers + typegen React Router + TS build.

## Ghi chú triển khai

- Deploy cần đăng nhập Wrangler và có dự án Cloudflare Workers. Cấu hình tên worker trong `wrangler.jsonc` (key `name`).
- Khi cần secrets, dùng `wrangler secret put KEY` thay vì để trực tiếp trong `vars`.
- Có thể bật Observability trong `wrangler.jsonc` để theo dõi Worker.
