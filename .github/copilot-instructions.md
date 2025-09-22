# GitHub Copilot Instructions

This document provides essential context for AI agents working in this codebase. Read this first to understand key patterns and workflows.

## Project Overview

A full-stack tuition fee management system built with:
- Frontend: React + React Router + ShadCN UI (Tailwind)
- Backend: Cloudflare Workers + Hono + D1 Database
- Authentication: JWT-based with HttpOnly cookies

## Key Architecture Patterns

### Backend (workers/)

1. Feature-based Structure:
```
features/
├─ <feature>/
   ├─ <feature>Route.ts    # HTTP endpoints, input validation
   ├─ <feature>Service.ts  # Business logic, DB operations
   ├─ <feature>Schemas.ts  # Valibot validation schemas
```

2. Data Flow Pattern:
- Route → Service → Repository
- Routes handle HTTP concerns (validation, responses)
- Services contain business logic and data transformation
- Repositories handle raw D1 Database operations

3. Common Patterns:
- Input Validation: Use Valibot schemas in `<feature>Schemas.ts`
- Error Handling: Throw native errors, map to AppError in routes
- i18n: Use message keys from `i18n/messages.ts`
- Auth: JWT verification via `middleware/authMiddleware.ts`

### Frontend (frontend/)

1. Component Organization:
```
src/
├─ components/         # Reusable UI components
├─ routes/            # Page components and routing
├─ services/          # API client wrappers
├─ utils/            # Helper functions
```

2. UI Patterns:
- Use ShadCN UI components for consistent styling
- Form validation with react-hook-form + Valibot
- API calls through service layer abstractions

## Development Workflow

1. Database Changes:
- Add migrations in `migrations/` with sequential naming
- Update corresponding repository types and queries

2. Adding New Features:
```typescript
// 1. Define validation schema (features/<feature>Schemas.ts)
export const CreateItemSchema = object({
  name: string([minLength(1)]),
  // ...
});

// 2. Create repository (features/<feature>Repository.ts)
export class ItemRepository {
  constructor(private deps: { db: D1Database }) {}
  async create(data: CreateItemRow): Promise<ItemRow> {
    // ...
  }
}

// 3. Add service logic (features/<feature>Service.ts)
export class ItemService {
  constructor(private deps: { db: D1Database }) {}
  async create(data: CreateItemInput): Promise<ItemDto> {
    // Validation, business logic, mapping
  }
}

// 4. Define routes (features/<feature>Route.ts)
router.post("/items", async (c) => {
  const parsed = await parseBodyWithSchema(c, CreateItemSchema);
  // Handle validation, call service, map response
});
```

## Common Tasks

1. Local Development:
```bash
# Start frontend dev server
npm run dev 

# Start worker with D1 logging
npm run dev:worker
```

2. Debug Database Queries:
- Check `logs/query_*.txt` for D1 query logs
- Use `scripts/d1-log-server.cjs` for local query monitoring

## Best Practices

1. Error Handling:
- Use typed errors from `errors.ts`
- Always map service errors to AppError in routes
- Include i18n message keys for user-facing errors

2. Validation:
- Define schemas in dedicated schema files
- Use `parseBodyWithSchema` in routes
- Keep validation close to route handlers

3. Data Access:
- Use repositories for all database operations
- Keep SQL queries in repository methods
- Use query helpers for common operations

4. Security:
- All routes require authentication by default
- Use HttpOnly cookies for JWT storage
- Validate user permissions in services