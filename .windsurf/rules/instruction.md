---
trigger: always_on
---


## 1. Project Overview

Full-stack **tuition fee management system**:

* **Frontend**: React, React Router, ShadCN UI, Tailwind CSS, react-hook-form
* **Backend**: Cloudflare Workers, Hono, D1 (SQLite), Valibot
* **Auth**: JWT với HttpOnly cookie
* **DB**: SQLite với migration

---

## 2. Structure

```
frontend/
  src/
    components/     # UI, feature-based
    routes/         # Pages & routing
    services/       # API services
    utils/          # Helpers
    api/            # API config

workers/
  features/<feature>/
    <feature>Route.ts      # HTTP endpoints
    <feature>Service.ts    # Business logic
    <feature>Repository.ts # DB queries
    <feature>Schemas.ts    # Validation schemas
  i18n/                    # Error & validation messages (VN)
  validation/common/       # Validation types & utils
  middleware/              # HTTP middleware
  errors.ts                 # Error codes & AppError

migrations/                # SQL schema changes
logs/                       # Dev query logs
```

---

## 3. Backend Patterns

### Data Flow

`Route → Validation → Service → Repository → Database`
`Database → Repository → Service → Route → Response`

* **Routes**: HTTP request & response
* **Services**: Business logic, error handling
* **Repositories**: SQL queries
* **Schemas**: Input validation with Valibot

---

### 3.1 Feature Folder

```
workers/features/student/
├─ StudentRoute.ts
├─ StudentService.ts
├─ StudentRepository.ts
└─ StudentSchemas.ts
```

---

### 3.2 Error Handling

**File locations:**

* `workers/errors.ts` - Error codes & `AppError`
* `workers/i18n/errorMessages.ts` - Business error messages
* `workers/validation/common/validationTypes.ts` - Validation codes
* `workers/i18n/validationMessages.ts` - Validation messages

**Example - Define & Throw Error:**

```ts
// errors.ts
export type ErrorCode = "AUTH_INVALID_CREDENTIALS" | "DUPLICATE_STUDENT";

// errorMessages.ts
export const viMessages = {
  AUTH_INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng",
  DUPLICATE_STUDENT: "Học sinh đã tồn tại",
};

// Service
if (existing) {
  throw new AppError("DUPLICATE_STUDENT", t("DUPLICATE_STUDENT"), 409);
}
```

---

### 3.3 Validation

```ts
// validationTypes.ts
export type ValidationCode = "EMAIL_INVALID" | "NAME_REQUIRED";
export type ValidationField = "email" | "name";

// validationMessages.ts
export const viValidationMessages = {
  EMAIL_INVALID: "Email không hợp lệ",
  NAME_REQUIRED: "Tên không được bỏ trống",
};
```

**Schema Example:**

```ts

function Msg(code: ValidationCode) {
  return code;
}

export const CreateStudentSchema = object({
  name: pipe(
    string("NAME_INVALID"),
    minLength(1, "NAME_REQUIRED"),
    maxLength(100, "NAME_TOO_LONG")
  ),
  email: optional(
    nullable(
      pipe(
        string("EMAIL_INVALID"),
        regex(EMAIL_REGEX, "EMAIL_INVALID")
      )
    )
  ),
});
```

---

## 4. Frontend Patterns

### 4.1 Components

```
components/
  ui/         # Base UI
  commons/    # Shared layout, auth guards
  students/   # Student management
```

**Example:**

```tsx
// StudentCard.tsx
export function StudentCard({ student }) {
  return <div>{student.name}</div>;
}
```

---

### 4.2 Service Layer

```ts
// services/studentService.ts
export class StudentService {
  static baseUrl = '/api/students';
  
  static async getAll() {
    const res = await apiClient.get(this.baseUrl);
    return res.data;
  }

  static async create(data) {
    const res = await apiClient.post(this.baseUrl, data);
    return res.data;
  }
}
```

---

### 4.3 Form Handling

```tsx
export function StudentForm() {
  const form = useForm({ resolver: valibotResolver(CreateStudentSchema) });

  const onSubmit = async (data) => {
    try {
      await StudentService.create(data);
    } catch (e) {
      console.error(e);
    }
  };

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

---

## 5. Adding a New Feature

### 5.1 Backend Steps

1. Create migration:

```sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

2. Create feature folder:

```
workers/features/student/
  ├─ StudentSchemas.ts
  ├─ StudentRepository.ts
  ├─ StudentService.ts
  └─ StudentRoute.ts
```

**Repository Example:**

```ts
export class StudentRepository {
  constructor(private db: D1Database) {}
  
  async findAll() {
    return this.db.prepare('SELECT * FROM students').all();
  }
}
```

**Service Example:**

```ts
export class StudentService {
  constructor(private repo: StudentRepository) {}

  async create(data) {
    const existing = await this.repo.findByEmail(data.email);
    if (existing) throw new AppError("DUPLICATE_STUDENT", t("DUPLICATE_STUDENT"), 409);
    return this.repo.create(data);
  }
}
```

**Route Example:**

```ts
router.post('/students', async (c) => {
  const parsed = await parseBodyWithSchema(c, CreateStudentSchema);
  const service = new StudentService(new StudentRepository(c.env.DB));
  const result = await service.create(parsed);
  return c.json(result);
});
```

---

### 5.2 Frontend Steps

1. Add service file: `services/studentService.ts`
2. Add form: `components/students/StudentForm.tsx`
3. Integrate API using `StudentService.create()`

---

## 6. Dev Commands

```bash
npm run dev          # Frontend dev server
npm run dev:worker   # Backend dev server
npm run db:migrate   # Apply migrations
npm run db:reset     # Reset DB (dev only)
```

---

## 7. Quick Reference

| Area             | Key Files                                                                            |
| ---------------- | ------------------------------------------------------------------------------------ |
| **Errors**       | `workers/errors.ts`, `workers/i18n/errorMessages.ts`                                 |
| **Validation**   | `workers/validation/common/validationTypes.ts`, `workers/i18n/validationMessages.ts` |
| **Auth**         | `workers/middleware/authMiddleware.ts`                                               |
| **Frontend API** | `frontend/src/api/client.ts`, `frontend/src/services/`                               |

---

## 8. Summary

* Keep **feature-based structure** for both FE & BE
* Follow strict flow: **Route → Validation → Service → Repository → DB**
* Centralize error & validation messages
* Include **code samples** for quick understanding and consistent implementation
