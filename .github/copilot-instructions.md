# GitHub Copilot Instructions

This document provides essential context for AI agents working in this codebase. Read this first to understand key patterns and workflows.

## Project Overview

A full-stack tuition fee management system built with:
- **Frontend**: React + React Router + ShadCN UI + Tailwind CSS + react-hook-form
- **Backend**: Cloudflare Workers + Hono + D1 Database + Valibot validation
- **Authentication**: JWT-based with HttpOnly cookies
- **Database**: SQLite via Cloudflare D1 with migration system

## Project Structure

```
├─ frontend/                    # React frontend application
│  ├─ src/
│  │  ├─ components/           # Feature-organized UI components
│  │  │  ├─ ui/               # ShadCN UI base components
│  │  │  ├─ commons/          # Shared components (layout, navigation)
│  │  │  ├─ classes/          # Class management components
│  │  │  ├─ students/         # Student management components
│  │  │  └─ dashboard/        # Dashboard-specific components
│  │  ├─ routes/              # Page components and route definitions
│  │  ├─ services/            # API client services
│  │  ├─ utils/               # Utility functions and helpers
│  │  └─ api/                 # API client configuration
├─ workers/                     # Cloudflare Workers backend
│  ├─ features/               # Feature-based backend modules
│  │  ├─ <feature>/
│  │  │  ├─ <feature>Route.ts    # HTTP endpoints & input validation
│  │  │  ├─ <feature>Service.ts  # Business logic & data transformation
│  │  │  ├─ <feature>Repository.ts  # Database operations
│  │  │  └─ <feature>Schemas.ts    # Valibot validation schemas
│  ├─ i18n/                   # Internationalization messages
│  │  ├─ errorMessages.ts     # Business error messages (Vietnamese)
│  │  └─ validationMessages.ts # Validation error messages (Vietnamese)
│  ├─ validation/             # Validation infrastructure
│  │  └─ common/
│  │     ├─ validationTypes.ts  # Validation codes & field types
│  │     └─ validate.ts         # Validation utilities
│  ├─ middleware/             # HTTP middleware
│  └─ errors.ts               # Error codes and AppError class
├─ migrations/                  # Database migration files
└─ logs/                       # Database query logs (development)
```

## Architecture Patterns

### Backend (workers/)

#### 1. Feature-based Organization
Each feature follows the same structure:
```
features/<feature>/
├─ <feature>Route.ts      # HTTP endpoints, request/response handling
├─ <feature>Service.ts    # Business logic, data transformation
├─ <feature>Repository.ts # Database operations, SQL queries
└─ <feature>Schemas.ts    # Valibot validation schemas
```

#### 2. Data Flow Pattern
**Request Flow**: Route → Validation → Service → Repository → Database
**Response Flow**: Database → Repository → Service → Route → Response

- **Routes**: Handle HTTP concerns (parsing, validation, response formatting)
- **Services**: Contain business logic, data transformation, and error handling
- **Repositories**: Handle raw database operations and SQL queries
- **Schemas**: Define input/output validation using Valibot

#### 3. Error Handling System

**Error Types & Locations**:
```typescript
// workers/errors.ts - Define error codes
export type ErrorCode = 
  | "AUTH_INVALID_CREDENTIALS"  // Business errors
  | "VALIDATION_ERROR"          // Validation errors
  | "RESOURCE_NOT_FOUND"        // Not found errors
  // ... more codes

// workers/i18n/errorMessages.ts - Vietnamese messages for business errors
export const viMessages: Record<ErrorCode, string> = {
  AUTH_INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng",
  // ... more messages
};
```

**Validation Error System**:
```typescript
// workers/validation/common/validationTypes.ts - Validation codes
export type ValidationCode =
  | "EMAIL_INVALID"
  | "PASSWORD_TOO_SHORT"
  | "NAME_REQUIRED"
  // ... more codes

// workers/i18n/validationMessages.ts - Vietnamese validation messages
export const viValidationMessages: Record<ValidationCode, string> = {
  EMAIL_INVALID: "Email không hợp lệ",
  // ... more messages
};
```

#### 4. Adding New Business Errors
When services need new error types:

1. **Add error code** to `workers/errors.ts`:
```typescript
export type ErrorCode = 
  | "EXISTING_CODE"
  | "NEW_BUSINESS_ERROR"  // Add here
```

2. **Add Vietnamese message** to `workers/i18n/errorMessages.ts`:
```typescript
export const viMessages: Record<ErrorCode, string> = {
  // ... existing messages
  NEW_BUSINESS_ERROR: "Thông báo lỗi bằng tiếng Việt",
};
```

3. **Use in service**:
```typescript
// In service method
throw new AppError("NEW_BUSINESS_ERROR", t("NEW_BUSINESS_ERROR"), 400);
```

#### 5. Adding New Validation Rules
When routes need new validation:

1. **Add validation code** to `workers/validation/common/validationTypes.ts`:
```typescript
export type ValidationCode =
  | "EXISTING_CODE"
  | "NEW_VALIDATION_RULE"  // Add here

export type ValidationField =
  | "existing_field"
  | "newField"  // Add corresponding field
```

2. **Add Vietnamese message** to `workers/i18n/validationMessages.ts`:
```typescript
export const viValidationMessages: Record<ValidationCode, string> = {
  // ... existing messages
  NEW_VALIDATION_RULE: "Thông báo validation bằng tiếng Việt",
};
```

3. **Use in schema validation**:
```typescript
// In <feature>Schemas.ts
export const CreateStudentSchema = object({
  name: pipe(
    string(Msg("NAME_INVALID")),
    minLength(1, Msg("NAME_REQUIRED")),
    maxLength(100, Msg("NAME_TOO_LONG"))
  ),
  ...
```

### Frontend (frontend/)

#### 1. Component Organization
```
src/components/
├─ ui/                    # ShadCN UI base components (Button, Input, etc.)
├─ commons/               # Shared components
│  ├─ Layout.tsx         # Main layout wrapper
│  ├─ Navbar.tsx         # Navigation bar
│  └─ ProtectedRoute.tsx # Authentication guard
├─ <feature>/            # Feature-specific components
│  ├─ <Feature>List.tsx     # List/table view
│  ├─ <Feature>Form.tsx     # Create/edit form
│  ├─ <Feature>Detail.tsx   # Detail view
│  └─ <Feature>Card.tsx     # Card component
```

#### 2. Service Layer Pattern
```typescript
// src/services/<feature>Service.ts
export class FeatureService {
  private static baseUrl = '/api/<feature>';
  
  static async getAll(): Promise<FeatureDto[]> {
    // API call logic
  }
  
  static async create(data: CreateFeatureRequest): Promise<FeatureDto> {
    // API call logic with error handling
  }
}
```

#### 3. Form Handling Pattern
```typescript
// Using react-hook-form + Valibot
import { useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { CreateFeatureSchema } from './schemas';

export function FeatureForm() {
  const form = useForm({
    resolver: valibotResolver(CreateFeatureSchema),
  });
  
  // Form submission with service layer
}
```

#### 4. Route Organization
```
src/routes/
├─ Dashboard.tsx          # Main dashboard
├─ Login.tsx             # Authentication pages
├─ Register.tsx
└─ dashboard/            # Protected dashboard routes
   ├─ ClassesPage.tsx
   ├─ StudentsPage.tsx
   └─ ReportsPage.tsx
```

## Development Workflow

### 1. Adding a New Feature

#### Backend Steps:
1. **Database Schema** (if needed):
   - Add migration file: `migrations/00XX_feature_name.sql`
   - Run migration: `npm run db:migrate`

2. **Create Feature Directory**:
   ```
   workers/features/<feature>/
   ├─ <feature>Schemas.ts    # Valibot validation schemas
   ├─ <feature>Repository.ts # Database operations
   ├─ <feature>Service.ts    # Business logic
   └─ <feature>Route.ts      # HTTP endpoints
   ```

3. **Repository Pattern**:
   ```typescript
   // <feature>Repository.ts
   export class FeatureRepository {
     constructor(private deps: { db: D1Database }) {}
     
     async findAll(): Promise<FeatureRow[]> {
       // SQL query
     }
     
     async create(data: CreateFeatureRow): Promise<FeatureRow> {
       // Insert query
     }
   }
   ```

4. **Service Pattern**:
   ```typescript
   // <feature>Service.ts
   export class FeatureService {
     constructor(private deps: { db: D1Database }) {}
     
     async create(data: CreateFeatureInput): Promise<FeatureDto> {
       try {
         // Business logic
         const repository = new FeatureRepository(this.deps);
         const result = await repository.create(mappedData);
         return mapToDto(result);
       } catch (error) {
         throw toAppError(error, { code: "SPECIFIC_ERROR_CODE" });
       }
     }
   }
   ```

5. **Route Pattern**:
   ```typescript
   // <feature>Route.ts
   import { parseBodyWithSchema } from '../validation/common/validate';
   
   router.post('/features', async (c) => {
     try {
       const parsed = await parseBodyWithSchema(c, CreateFeatureSchema);
       const service = new FeatureService({ db: c.env.DB });
       const result = await service.create(parsed);
       return c.json(result);
     } catch (error) {
       const appError = toAppError(error);
       return c.json({ error: t(appError.code) }, appError.status);
     }
   });
   ```

#### Frontend Steps:
1. **Service Layer**:
   ```typescript
   // src/services/<feature>Service.ts
   export class FeatureService {
     private static baseUrl = '/api/features';
     
     static async create(data: CreateFeatureRequest): Promise<FeatureDto> {
       const response = await apiClient.post(this.baseUrl, data);
       return response.data;
     }
   }
   ```

2. **Components**:
   ```typescript
   // src/components/<feature>/<Feature>Form.tsx
   export function FeatureForm() {
     const form = useForm({
       resolver: valibotResolver(CreateFeatureSchema),
     });
     
     const onSubmit = async (data: CreateFeatureRequest) => {
       try {
         await FeatureService.create(data);
         // Success handling
       } catch (error) {
         // Error handling
       }
     };
   }
   ```

### 2. Database Operations

**Migration Pattern**:
```sql
-- migrations/000X_feature_name.sql
CREATE TABLE features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Query Logging**: 
- Development queries logged to `logs/query_*.txt`
- Use `scripts/d1-log-server.cjs` for real-time monitoring

### 3. Local Development

**Frontend**:
```bash
cd frontend
npm run dev          # Start React dev server (port 5173)
```

**Backend**:
```bash
npm run dev:worker   # Start Cloudflare Workers with D1 logging
```

**Database**:
```bash
npm run db:migrate   # Apply new migrations
npm run db:reset     # Reset database (development only)
```

## Common Patterns & Examples

### Error Handling in Services
```typescript
// Pattern for service methods
async createStudent(data: CreateStudentInput): Promise<StudentDto> {
  try {
    // Check business rules
    const existing = await this.repository.findByEmail(data.email);
    if (existing) {
      throw new AppError("DUPLICATE_STUDENT", t("DUPLICATE_STUDENT"), 409);
    }
    
    // Perform operation
    const result = await this.repository.create(data);
    return mapStudentToDto(result);
  } catch (error) {
    throw toAppError(error, { code: "UNKNOWN", status: 500 });
  }
}
```

### Validation Schema Pattern
```typescript
// <feature>Schemas.ts
import { object, string, number, minLength, email } from 'valibot';

export const CreateStudentSchema = object({
  name: pipe(
    string(Msg("NAME_INVALID")),
    minLength(1, Msg("NAME_REQUIRED")),
    maxLength(100, Msg("NAME_TOO_LONG"))
  ),
  email: optional(
    nullable(
      pipe(
        string(Msg("EMAIL_INVALID")),
        regex(EMAIL_REGEX, Msg("EMAIL_INVALID"))
      )
    )
  ),
  phone: optional(
    nullable(
      pipe(
        string(Msg("PHONE_INVALID")),
        regex(PHONE_REGEX, Msg("PHONE_INVALID"))
      )
    )
  ),
  note: optional(
    nullable(
      pipe(string(Msg("NOTE_TOO_LONG")), maxLength(1000, Msg("NOTE_TOO_LONG")))
    )
  ),
  parents: optional(nullable(array(ParentSchema))),
});
```

### Frontend Form with Error Handling
```typescript
// Component with comprehensive error handling
export function FeatureForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const form = useForm({
    resolver: valibotResolver(CreateFeatureSchema),
  });
  
  const onSubmit = async (data: CreateFeatureRequest) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      await FeatureService.create(data);
      // Success: redirect or show success message
    } catch (error) {
      // Handle API errors
      const errorMessage = error.response?.data?.error || 'Có lỗi xảy ra';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
}
```

## Key Files for Quick Reference

**Error Management**:
- `workers/errors.ts` - Error codes and AppError class
- `workers/i18n/errorMessages.ts` - Business error messages (Vietnamese)
- `workers/validation/common/validationTypes.ts` - Validation codes
- `workers/i18n/validationMessages.ts` - Validation messages (Vietnamese)

**Authentication**:
- `workers/middleware/authMiddleware.ts` - JWT verification
- `workers/features/auth/` - Authentication endpoints
- `frontend/src/utils/auth.ts` - Frontend auth utilities

**Database**:
- `migrations/` - Database schema changes
- `workers/helpers/queryHelpers.ts` - Database query utilities

**Frontend Core**:
- `frontend/src/api/client.ts` - API client configuration
- `frontend/src/components/commons/` - Shared layout components
- `frontend/src/services/` - API service classes

This structure ensures consistency, maintainability, and clear separation of concerns across the entire application.