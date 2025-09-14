Hướng dẫn chuẩn hóa quy trình tạo API mới (Workers/Hono)

1) Tổng quan kiến trúc
- Routes: định nghĩa endpoint và nhận request, validate input, gọi service. Ví dụ: [workers/routes/authRoute.ts](cci:7://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/routes/authRoute.ts:0:0-0:0), [workers/routes/classRoute.ts](cci:7://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/routes/classRoute.ts:0:0-0:0). Hàm factory: `createXRouter()`.
- Services: nghiệp vụ chính, gọi repository, mapping DTO. Ví dụ: [workers/services/classService.ts](cci:7://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/services/classService.ts:0:0-0:0), `workers/services/authService.ts`.
- Repos: truy cập DB (D1), thực thi SQL, trả về Row. Ví dụ: `workers/repos/classRepository.ts`, `workers/repos/userRepository.ts`.
- Validation: dùng Valibot cho schema + validate runtime, infer type compile-time. Ví dụ: `workers/validation/**`. Đặc biệt:
  - Schema: `workers/validation/<feature>/<feature>Schemas.ts`
  - Helper: [workers/validation/common/validate.ts](cci:7://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/validation/common/validate.ts:0:0-0:0) và [workers/validation/common/request.ts](cci:7://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/validation/common/request.ts:0:0-0:0) (parseBodyWithSchema)
  - Query validator đặc thù (nếu cần): trong `...Validators.ts`
- Middleware: auth guard, CORS… Ví dụ: `workers/middleware/*`.
- i18n: mapping mã lỗi/khóa message -> text. Ví dụ: `workers/i18n/messages.ts`.
- Errors: chuẩn hóa lỗi dịch vụ và mapping response. Ví dụ: [workers/errors.ts](cci:7://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/errors.ts:0:0-0:0).
- Types: DTO và helper mapping Row -> DTO. Ví dụ: [workers/types/classTypes.ts](cci:7://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/types/classTypes.ts:0:0-0:0).

2) Checklist tạo API mới theo chuẩn
- Bước 1: Thiết kế nghiệp vụ và DB
  - Xác định entity/tính năng cần quản lý.
  - Nếu cần, thêm migration SQL trong `migrations/` và cập nhật repository.

- Bước 2: Tạo repository
  - File: `workers/repos/<feature>Repository.ts`.
  - Cung cấp các hàm CRUD. Trả về Row dạng “thô” từ DB. Đặt constants như enum sort nếu cần.

- Bước 3: Tạo service
  - File: `workers/services/<feature>Service.ts`.
  - Import Repo và thực hiện nghiệp vụ (validate luồng nghiệp vụ, check quyền, mapping Row -> DTO).
  - Nhận deps: `{ db: D1Database }`.
  - Throw lỗi dạng “native” (Error) hoặc custom; để route dùng `toAppError()` mapping.

- Bước 4: Tạo schema validation với Valibot
  - File: `workers/validation/<feature>/<feature>Schemas.ts`.
  - Định nghĩa schema cho body (Create/Update…) và query nếu phù hợp.
  - Xuất type DTO bằng `InferOutput` nếu cần dùng lại ở service:
    - Ví dụ: `export type CreateXInput = InferOutput<typeof CreateXSchema>;`
  - Lưu ý: thông điệp trong schema là “validation codes”; text hiển thị dịch qua i18n.

- Bước 5: Dùng helper parseBodyWithSchema cho body
  - Dùng [parseBodyWithSchema(c, Schema)](cci:1://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/validation/common/request.ts:4:0-14:1) từ [workers/validation/common/request.ts](cci:7://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/validation/common/request.ts:0:0-0:0) để:
    - Đọc `c.req.json()` an toàn.
    - Validate bằng Valibot.
    - Trả về union `{ ok: true; value } | { ok: false; errors }`.
  - Ưu tiên infer type từ schema (type-safe), loại bỏ `any/unknown` sau khi parsed ok.

- Bước 6: Nếu có query phức tạp
  - Tạo hàm [validateListQuery(...)](cci:1://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/validation/class/classValidators.ts:28:0-67:1) hoặc schema riêng trong `...Validators.ts`/`...Schemas.ts`.
  - Chuẩn hóa giá trị về types nghiệp vụ (ví dụ bool từ “true/false”, sort hợp lệ).

- Bước 7: Tạo route
  - File: `workers/routes/<feature>Route.ts` với hàm `create<Feature>Router()`.
  - Import schemas + [parseBodyWithSchema](cci:1://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/validation/common/request.ts:4:0-14:1).
  - Mẫu xử lý:
    - Lấy user từ `c.get("user")` nếu API cần auth.
    - Parse body: `const parsed = await parseBodyWithSchema(c, SomeSchema);`
    - Nếu lỗi: trả `400` với `{ error: t("VALIDATION_ERROR"), code: "VALIDATION_ERROR", details }`.
    - Gọi service với `new <Feature>Service({ db: c.env.DB })`.
    - Bọc try/catch và dùng `toAppError(err, { code: "UNKNOWN" })`, sau đó `t(e.code, e.message)`.

- Bước 8: Đăng ký router vào app
  - File: [workers/app.ts](cci:7://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/app.ts:0:0-0:0) (hoặc nơi khởi tạo Hono app).
  - Mount router dưới prefix phù hợp, áp dụng middleware guard nếu cần.

- Bước 9: i18n message
  - Đảm bảo tất cả `code` dùng trong schema/validators/errors có khóa trong `workers/i18n/messages.ts`.
  - Dùng `t("KEY")` để dịch trước khi trả về cho client.

- Bước 10: Type-check và test
  - Chạy typecheck/build.
  - Gọi thử endpoint (dev server) để kiểm tra validate + response.

3) Mẫu code/flow chuẩn trong Route
- Auth guard
  - Ở route cần auth, luôn kiểm `const user = c.get("user");` -> trả `401` nếu không có.
- Parse body chuẩn hóa
  - `const parsed = await parseBodyWithSchema(c, CreateXSchema);`
  - `if (!parsed.ok) return c.json({ error: t("VALIDATION_ERROR"), code: "VALIDATION_ERROR", details: parsed.errors }, 400 as 400);`
  - Sau đó `parsed.value` đã type-safe (InferOutput của schema).
- Xử lý lỗi chuẩn
  - Trong `try/catch`, dùng `toAppError(err, { code: "UNKNOWN" })`.
  - Trả `c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);`
- Trả về dữ liệu
  - DTO trả về được mapping tại service (hoặc mapping helper trong `workers/types/*`).

4) Nguyên tắc về Validation & Types
- Body:
  - Không dùng `c.req.json<T>()` để “gán” type. Luôn coi body là `unknown` và validate runtime bằng Valibot.
  - Dùng [parseBodyWithSchema](cci:1://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/validation/common/request.ts:4:0-14:1) để có cả runtime validation và compile-time inference.
- Query:
  - Dùng schema/validator riêng để chuyển string -> dạng đúng type (bool, enum/sort hợp lệ).
- DTO:
  - Ưu tiên xuất type từ schema: `InferOutput<typeof Schema>` để đồng bộ.
  - Mapping Row -> DTO thực hiện ở `workers/types/*` hoặc ngay trong service nếu đơn giản.

5) Quy ước mã lỗi và i18n
- Schema và validator trả “mã” (code) như `NAME_REQUIRED`, `INVALID_JSON_BODY`… không phải text.
- Khi response ra ngoài, luôn dùng `t(code, message?)` để chuyển sang thông điệp hiển thị.
- `VALIDATION_ERROR` dùng cho lỗi validate tổng quát, chứa `details`.

6) Bảo mật và môi trường
- Dùng `c.env` để truy cập `DB`, `JWT_SECRET`… Kiểm tra tồn tại trước khi dùng (trả `SERVER_MISCONFIGURED` nếu thiếu).
- Auth:
  - Áp dụng middleware guard cho các route cần xác thực (JWT).
  - Trong auth route, phát token qua `signJWT`.

7) Do/Don’t nhanh
- Do
  - Do dùng [parseBodyWithSchema](cci:1://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/validation/common/request.ts:4:0-14:1) cho mọi body JSON.
  - Do giữ mọi schema trong `workers/validation/<feature>/*`.
  - Do dùng `toAppError + t()` để chuẩn hóa lỗi.
  - Do để service gọi repo và trả DTO đã mapping.
- Don’t
  - Don’t cast body trực tiếp sang type mà không validate.
  - Don’t trả text hard-coded cho lỗi; dùng code + i18n.
  - Don’t để logic DB lẫn vào route.

8) Ví dụ áp dụng nhanh
- Tạo resource mới “subjects”
  - Repo: `workers/repos/subjectRepository.ts` (CRUD).
  - Service: `workers/services/subjectService.ts`.
  - Schemas: `workers/validation/subject/subjectSchemas.ts` (CreateSubjectSchema, UpdateSubjectSchema,…).
  - Route: `workers/routes/subjectRoute.ts` dùng [parseBodyWithSchema](cci:1://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/validation/common/request.ts:4:0-14:1) và `toAppError`.
  - Mount: cập nhật [workers/app.ts](cci:7://file:///c:/Users/HUY/source/tuition-fee-calculation/tuition-fee-calculation/workers/app.ts:0:0-0:0) với prefix `/api/subjects`.
  - i18n: thêm mã vào `workers/i18n/messages.ts`.