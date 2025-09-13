# UC-02: Tách biệt Frontend (React SPA) và Backend (Cloudflare Worker)

Mục tiêu: Giữ nguyên backend Worker như hiện tại (Hono + D1 + JWT, CORS đã bật), tách phần frontend sang một dự án React thuần (SPA, build tĩnh) có thể deploy lên site khác và gọi API đến Worker qua domain Cloudflare.

---

## 1) Hiện trạng dự án (tóm tắt)

- Backend hiện tại: nằm trong `workers/` và được cấu hình bởi `wrangler.jsonc`.
  - Router chính: `workers/app.ts`.
  - Middleware auth: `workers/middleware/authMiddleware.ts` (JWT Bearer, không dùng cookie – Phase 3).
  - Route auth: `workers/routes/authRoute.ts`.
  - Health routes: `workers/routes/healthRoute.ts` (đã được nhắc trong README).
  - SSR handler cho React Router: `workers/handlers/ssr.ts` (server-side render + asset serving hiện tại).
  - D1 helpers: `workers/helpers/queryHelpers.ts`.
  - I18n messages: `workers/i18n/messages.ts`.
- Frontend hiện tại: nằm trong `app/` (React Router + SSR mode).
  - `app/routes/*.tsx` chứa các page như `login.tsx`, `register.tsx`, `dashboard.*.tsx`…
  - `app/utils/auth.client.ts` chứa hàm `apiFetch()` đính kèm Authorization header khi gọi `/api/*`.
  - Tailwind v4 với `@tailwindcss/vite`, cấu hình sẵn trong `vite.config.ts`.
- Build/dev hiện tại “fullstack” kết hợp frontend + worker trong một bundle với `@cloudflare/vite-plugin` và `@react-router/dev`.

Khi tách, chúng ta:
- Giữ nguyên Worker và mã backend tại repo này (không thay đổi logic).
- GIỮ NGUYÊN frontend SSR hiện tại trong thư mục `app/` (không xóa, không thay đổi hành vi) để không ảnh hưởng đến dự án đang chạy.
- TẠO THÊM một dự án React SPA mới đặt trong một thư mục con bên cạnh, ví dụ: `frontend/` (đề xuất tên). Dự án này build độc lập và deploy lên site khác, gọi API đến Worker.

---

## 2) Thiết kế kiến trúc sau khi tách

- Backend (giữ nguyên):
  - Repo hiện tại, deploy Cloudflare Worker qua Wrangler.
  - Tiếp tục expose API dưới prefix `/api/*` (ví dụ: `https://<worker-domain>/api/...`).
  - CORS: đã bật toàn cục trong `workers/app.ts` (cho phép Origin đến từ site khác). Không dùng `credentials` vì xác thực qua Bearer token.
- Frontend SSR (giữ nguyên):
  - Tiếp tục tồn tại ở `app/` như hiện tại và được render qua Worker SSR handler. Không thay đổi để tránh ảnh hưởng.
- Frontend SPA (mới):
  - Thư mục đề xuất: `frontend/`.
  - Tech: Vite + React + React Router DOM (CSR), Tailwind v4, Axios.
  - Deploy lên site khác (Cloudflare Pages / Netlify / Vercel / S3+CDN…).
  - Gọi API Worker qua `VITE_API_BASE_URL` (ví dụ: `https://<worker-domain>`), request API dùng absolute URL: `${VITE_API_BASE_URL}/api/...`.

Lưu ý: Do SPA chạy ở domain khác, không xung đột với SSR hiện hữu. Có thể vận hành song song và chuyển dần lưu lượng sang SPA khi sẵn sàng.

### 2.1) Cấu trúc thư mục đồng tồn tại trong cùng repo

```
root/
  app/                       # SSR frontend hiện tại (giữ nguyên)
  workers/                   # Backend Worker (giữ nguyên)
  frontend/              # NEW: dự án React SPA độc lập
    package.json
    vite.config.ts
    index.html
    src/
      api/client.ts          # Axios client
      utils/auth.ts          # token helpers (copy từ app/...)
      routes/                # pages SPA (copy/convert từ app/routes)
      components/            # copy từ app/components
      index.css              # copy từ app/app.css
```

---

## 3) Danh sách file/thư mục cần sao chép sang dự án Frontend SPA mới

Tạo dự án mới trong cùng repo tại `frontend/` và SAO CHÉP các phần sau từ repo hiện tại (không xóa bản gốc trong `app/`):

- UI & pages từ `app/` (chọn các file thuần client, không phụ thuộc SSR):
  - `app/components/` → `frontend/src/components/`
  - `app/welcome/` → `frontend/src/welcome/` (nếu đang dùng)
  - `app/app.css` → `frontend/src/index.css` (hoặc `src/app.css` tùy convention)
  - `app/routes/*.tsx` → chuyển thành route components của SPA tại `frontend/src/routes/`.
    - Cần loại bỏ/điều chỉnh phần nào phụ thuộc server loader/action của React Router SSR (nếu có). Thay thế bằng gọi Axios client phía client.
  - `app/lib/` → `frontend/src/lib/` (chỉ copy module không phụ thuộc Worker/SSR)
  - `app/utils/auth.client.ts` → `frontend/src/utils/auth.ts` (giữ các hàm token: `getToken()`, `setToken()`, `clearToken()`). Tạo thêm `frontend/src/api/client.ts` để cấu hình Axios sử dụng `VITE_API_BASE_URL`.
  - `app/root.tsx` → có thể tham khảo cấu trúc layout, tách phần route layout/Providers cho SPA.

Không copy các file chỉ phục vụ SSR hoặc build fullstack (vẫn để yên trong dự án SSR):
- KHÔNG mang theo `app/entry.server.tsx`.
- KHÔNG mang theo `.react-router/`, `workers/handlers/ssr.ts`, `react-router.config.ts`.

Các file cấu hình kiểu UI/tailwind/shadcn cần mang theo và điều chỉnh:
- `components.json` (nếu dùng shadcn/ui) → copy sang root frontend để tiếp tục quản lý components.
- Tailwind v4:
  - Hiện tại dùng plugin `@tailwindcss/vite` (v4). Trên frontend, tiếp tục dùng plugin này.
  - Tạo/điều chỉnh `postcss` config nếu cần (v4 thường không cần `postcss.config.js`).

---

## 4) Khởi tạo dự án Frontend SPA mới trong thư mục `frontend/` (Vite + React + TS)

1. Tạo dự án mới (ví dụ Vite) ngay trong thư mục `frontend/`:
   - `npm create vite@latest frontend -- --template react-ts`
2. Cài dependencies cần thiết:
   - React & Router DOM (khớp với version đang dùng):
     - `react@19`, `react-dom@19`, `react-router-dom@7` (phù hợp `react-router` 7.6.3 hiện có).
   - UI stack:
     - `shadcn/ui` (theo nhu cầu), `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`.
   - Tailwind v4 + plugin Vite:
     - `tailwindcss@^4`, `@tailwindcss/vite`.
   - HTTP client:
     - `axios` (dùng làm lớp gọi API chuẩn hóa)
3. Dev dependencies:
   - `typescript`, `vite`, `@types/react`, `@types/react-dom` (Vite template đã có sẵn).
4. Cấu hình Vite của frontend (ví dụ `vite.config.ts`):
   - Thêm plugin `@tailwindcss/vite`.
   - Tùy chọn: `vite-tsconfig-paths` nếu muốn giữ alias `@/*`.
5. Cấu trúc thư mục gợi ý cho frontend SPA:
   - `src/main.tsx` – mount app vào DOM.
   - `src/App.tsx` – chứa `<Router>` và `<Routes>` SPA.
   - `src/routes/` – chứa các page (`Login`, `Register`, `Dashboard`…).
   - `src/components/` – UI components copy từ `app/components/`.
   - `src/utils/auth.ts` – copy/điều chỉnh từ `app/utils/auth.client.ts`.
   - `src/lib/` – utils/libs thuần client.
   - `src/index.css` – copy từ `app/app.css` và điều chỉnh imports Tailwind.
6. Cấu hình Tailwind v4 cho frontend:
   - Add plugin trong `vite.config.ts`: `import tailwindcss from "@tailwindcss/vite";` và `plugins: [tailwindcss()]`.
   - Đảm bảo trong `src/index.css` có `@import "tailwindcss";` theo Tailwind v4.
7. Thiết lập env cho SPA:
   - Tạo `.env` (dev) và cấu hình CI/CD (prod) để có biến `VITE_API_BASE_URL` trỏ tới domain Worker.

8. Chạy thử đồng thời (local):
   - Backend/SSR Worker: ở root repo chạy `wrangler dev` (hoặc `npm run dev` nếu đã cấu hình).
   - SPA: trong `frontend/` chạy `npm run dev` (mặc định Vite dùng port 5173).
   - Thiết lập `VITE_API_BASE_URL=http://127.0.0.1:8787` (URL của Worker dev) trong `frontend/.env`.

---

## 5) Chuẩn hóa lớp gọi API với Axios (frontend)

- Tạo `src/api/client.ts` với một `axios.create()` sử dụng `baseURL = import.meta.env.VITE_API_BASE_URL`.
- Thêm request interceptor để tự động đính kèm `Authorization: Bearer <token>` (đọc từ `src/utils/auth.ts`) cho các đường dẫn `/api/*`.
- Thêm response interceptor để xử lý `401 Unauthorized`: tự động `clearToken()` và (tuỳ chọn) điều hướng về `/login`.
- Ví dụ sử dụng: `client.post("/api/auth/login", { email, password })`.

Lưu ý CORS:
- Backend đã set CORS trong `workers/app.ts`:
  - `Access-Control-Allow-Origin` = origin đến (hoặc `*` khi Origin= "null").
  - `Access-Control-Allow-Headers` bao gồm `Authorization, Content-Type`.
  - Có route `OPTIONS` cho preflight.
- Vì dùng Bearer token trong header, KHÔNG cần `credentials`/cookies.

---

## 6) Routing chuyển đổi từ SSR sang SPA

- Các file trong `app/routes/*.tsx` cần:
  - Bỏ `loader/action` của React Router SSR (nếu có), thay bằng hook client (`useEffect`, `useLoaderData` không SSR) và gọi Axios client.
  - Chuyển sang `react-router-dom` v7 cho SPA (`createBrowserRouter` hoặc `Router + Routes`).
  - Cấu hình bảo vệ route (PrivateRoute) dựa trên token localStorage.
- Ví dụ mapping nhanh:
  - `app/routes/login.tsx` → `src/routes/Login.tsx`.
  - `app/routes/register.tsx` → `src/routes/Register.tsx`.
  - `app/routes/dashboard*.tsx` → `src/routes/dashboard/*.tsx` + layout chung.

---

## 7) Những gì giữ nguyên ở Backend

- Không đổi mã trong `workers/` (router, middleware, services, routes, helpers, i18n…).
- Vẫn deploy bằng `wrangler` theo `wrangler.jsonc` hiện tại.
- Tiếp tục sử dụng D1 (`migrations/` giữ ở backend repo).
- Giữ `workers/handlers/ssr.ts` nếu vẫn cần cho đường dẫn không-API (nhưng sau khi tách SPA, backend có thể chỉ nên phục vụ API).
  - Khuyến nghị: Cân nhắc xoá/disable SSR catch-all `app.get("*", ...)` nếu không còn cần render SPA từ Worker, để backend chỉ là API. Nếu vẫn giữ, tránh xung đột path với SPA host khác (do domain khác nên an toàn).

---

## 8) Deploy

- Backend (không đổi):
  - `wrangler deploy` → lấy domain Workers (ví dụ: `https://tuition-fee-calculation.<account>.workers.dev`).
  - Sau khi deploy, xác thực CORS bằng cách gọi từ local frontend origin.
- Frontend SPA (mới):
  - Build SPA: `npm run build` → `dist/`.
  - Deploy lên Cloudflare Pages / Netlify / Vercel:
    - Thiết lập biến môi trường `VITE_API_BASE_URL` trên platform trỏ tới domain Worker (sản xuất+preview).
    - Thiết lập SPA fallback (rewrite 404 → `/index.html`).
  - Domain: có thể dùng domain riêng (ví dụ `app.yourdomain.com`).

- Frontend SSR (giữ nguyên):
  - Vẫn deploy/bundled chung theo pipeline hiện tại của repo này khi bạn cần.
  - Không bị ảnh hưởng bởi sự xuất hiện của `frontend/` vì là dự án độc lập.

---

## 9) Kiểm thử sau khi tách

- Kiểm tra đăng ký/đăng nhập:
  - `POST /api/auth/register` → trả `{ token }`.
  - `POST /api/auth/login` → trả `{ token }`.
  - Lưu token vào localStorage qua `setToken()`.
- Kiểm tra API có bảo vệ:
  - `GET/POST ... /api/...` với header `Authorization: Bearer <token>`.
  - Đảm bảo 401 khi token không hợp lệ/hết hạn và frontend xử lý hợp lý.
- Kiểm tra CORS:
  - Từ domain frontend, gọi API Worker thật – preflight `OPTIONS` pass, headers trả `Access-Control-Allow-Origin` đúng.
- Kiểm tra health endpoints: `/api/health`, `/api/live`, `/api/ready`.

---

## 10) Bước-by-bước thực hiện (Checklist thực thi)

1. Tạo thư mục `frontend/` trong repo hiện tại và khởi tạo dự án Vite React TS bên trong.
2. Cài deps: `react@19`, `react-dom@19`, `react-router-dom@7`, tailwind v4, shadcn stack.
3. Cấu hình `vite.config.ts` với `@tailwindcss/vite` và (tuỳ chọn) `vite-tsconfig-paths`.
4. Copy `components.json` (nếu dùng), `app/app.css` → `frontend/src/index.css`.
5. Copy `app/components/`, `app/welcome/`, `app/lib/` (chỉ module client), `app/utils/auth.client.ts` → `frontend/src/...` và bổ sung `frontend/src/api/client.ts` (Axios) sử dụng `VITE_API_BASE_URL`.
6. Chuyển `app/routes/*.tsx` sang `src/routes/`:
   - Bỏ loader/action SSR, chuyển sang gọi Axios client trong client.
   - Thiết lập `react-router-dom` SPA routing.
   - Tạo guard dựa trên token để bảo vệ các route `/dashboard/*`.
7. Đảm bảo tất cả call API dùng absolute URL `${VITE_API_BASE_URL}/api/...`.
8. Local test: chạy SPA (`frontend/`) trên port 5173 và chạy Worker dev (`wrangler dev`) cho SSR/backend.
9. Deploy Worker (không đổi) → lấy domain prod.
10. Deploy Frontend SPA lên Pages/Netlify/Vercel và set `VITE_API_BASE_URL`.
11. E2E smoke test: đăng ký/đăng nhập, gọi endpoint bảo vệ, logout, thay đổi mật khẩu.

---

## 11) Mẫu cấu hình Axios client (frontend)

Tạo file `src/api/client.ts`:

```ts
import axios from "axios";
import { getToken, clearToken } from "../utils/auth";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  // Optionally set default headers
  headers: { "Content-Type": "application/json" },
  withCredentials: false, // dùng Bearer token, không cần cookie
});

client.interceptors.request.use((config) => {
  // Chỉ gắn Authorization cho các path API
  const isApiPath = typeof config.url === "string" && config.url.startsWith("/api/");
  if (isApiPath) {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // Token hết hạn/không hợp lệ
      clearToken();
      // Tuỳ UX: có thể redirect về /login
      // window.location.assign("/login");
    }
    return Promise.reject(err);
  },
);

export default client;
```

Ví dụ sử dụng trong một component/page:

```ts
import client from "../api/client";

async function login(email: string, password: string) {
  const { data } = await client.post("/api/auth/login", { email, password });
  // data: { token: string }
  return data;
}
```

Lưu ý: Không commit giá trị bí mật; chỉ dùng biến env public của Vite (`VITE_*`).

---

## 12) Các lưu ý quan trọng

- __Phiên bản thư viện__: Frontend nên đồng bộ major version của `react@19`, `react-router-dom@7` để tránh chênh lệch API.
- __CORS__: Hiện tại Worker cho phép Origin linh hoạt. Sản xuất có thể thu hẹp danh sách Origin hợp lệ để tăng bảo mật.
- __Không dùng cookie__: Flow đang dùng Bearer token trong header, nên không cần `Access-Control-Allow-Credentials`.
- __D1 & Migrations__: Ở backend repo. Frontend không cần biết về D1.
- __SSR__: Frontend tách biệt sẽ là CSR/SPA. Worker không còn trách nhiệm render SPA.
- __Route fallback ở host Frontend__: Bật SPA fallback để route con hoạt động (404 → index.html).
- __Logging/Observability__: Giữ nguyên observability của Worker; frontend có thể thêm Sentry/LogRocket tuỳ nhu cầu.

---

## 13) Self-review tính khả thi và phù hợp

- __Giữ nguyên backend__: Kế hoạch không đụng chạm đến `workers/` logic, `wrangler.jsonc`, D1 bindings – đạt yêu cầu.
- __CORS__: `workers/app.ts` đã set CORS cho mọi route và có `OPTIONS` handler – đủ để frontend domain khác gọi API bằng Bearer token.
- __Auth Flow__: `workers/routes/authRoute.ts` trả `{ token }` trong body (Phase 3). Frontend chỉ cần lưu token và gắn `Authorization` – phù hợp SPA.
- __Rủi ro phụ thuộc SSR__: Một số file trong `app/routes/` có thể đang dùng khả năng `loader/action` hoặc APIs đặc thù SSR.
  - Biện pháp: khi migrate, thay bằng gọi `apiFetch` trong `useEffect`/event handler, hoặc `react-query`/SWR nếu mong muốn.
- __Tailwind v4__: Đang dùng `@tailwindcss/vite`. Trên frontend mới, setup tương tự là khả thi.
- __React Router__: Chuyển sang `react-router-dom` v7 cho SPA là phù hợp với version backend đang dùng.
- __Triển khai__: Cloudflare Pages/Netlify/Vercel đều hỗ trợ SPA + env. Chỉ cần set `VITE_API_BASE_URL` đúng domain Worker.
- __Bảo mật__: Vì dùng Bearer token, tránh lưu thông tin nhạy cảm khác trên client. Có thể xem xét thiết lập TTL token, refresh flow trong tương lai.
- __Khả năng mở rộng__: Việc tách giúp scaling độc lập. Có thể thêm Service Bindings nếu tạo thêm Workers trong tương lai.

Kết luận: Plan khả thi với khối lượng migrate chủ yếu ở việc chuyển route/pages từ SSR sang SPA, điều chỉnh cách fetch dữ liệu. Backend không cần thay đổi và đã sẵn sàng cho CORS + token-based auth.
