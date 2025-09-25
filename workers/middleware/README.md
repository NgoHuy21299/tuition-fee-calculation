# Middleware Pattern Usage Guide

## Authentication Middleware

### 1. requireTeacher Middleware
Middleware này tự động extract `teacherId` từ JWT token và lưu vào context.

**Usage:**
```typescript
import { requireTeacher, getTeacherId } from '../../middleware/authMiddleware';

const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload; teacherId: string } }>();

// Apply cho tất cả routes
router.use('*', requireTeacher);

// Trong route handler
router.get('/', async (c) => {
  const teacherId = getTeacherId(c); // Không cần kiểm tra null
  // ... business logic
});
```

**Trước khi có middleware:**
```typescript
router.get('/', async (c) => {
  const user = c.get("user");
  const teacherId = String(user.sub);
  if (!teacherId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  // ... business logic
});
```

**Sau khi có middleware:**
```typescript
router.use('*', requireTeacher);

router.get('/', async (c) => {
  const teacherId = getTeacherId(c); // Clean & safe
  // ... business logic
});
```

## Validation Middleware

### 2. validateBody Middleware
Middleware này tự động validate request body và lưu validated data vào context.

**Usage:**
```typescript
import { validateBody, getValidatedData } from '../../middleware/validationMiddleware';
import { CreateSessionSchema } from './schemas';
import type { InferOutput } from 'valibot';

// Apply middleware với schema cho route cụ thể
router.post('/', validateBody(CreateSessionSchema), async (c) => {
  const data = getValidatedData<InferOutput<typeof CreateSessionSchema>>(c);
  // data đã được validate và có đúng type
});
```

**Trước khi có middleware:**
```typescript
router.post('/', async (c) => {
  try {
    const parsed = await parseBodyWithSchema(c, CreateSessionSchema);
    if (!parsed.ok) {
      return c.json(
        { 
          error: 'Validation error', 
          code: "VALIDATION_ERROR", 
          details: parsed.errors 
        },
        400 as 400
      );
    }
    const data = parsed.value;
    // ... business logic
  } catch (err) {
    // ... error handling
  }
});
```

**Sau khi có middleware:**
```typescript
router.post('/', validateBody(CreateSessionSchema), async (c) => {
  try {
    const data = getValidatedData<InferOutput<typeof CreateSessionSchema>>(c);
    // ... business logic (validation errors đã được handle tự động)
  } catch (err) {
    // ... chỉ cần handle business logic errors
  }
});
```

## Complete Example

```typescript
import { Hono } from 'hono';
import { requireTeacher, getTeacherId } from '../../middleware/authMiddleware';
import { validateBody, getValidatedData } from '../../middleware/validationMiddleware';
import { CreateItemSchema, UpdateItemSchema } from './schemas';
import type { InferOutput } from 'valibot';

export function createItemRouter() {
  const router = new Hono<{ 
    Bindings: Env; 
    Variables: { user: JwtPayload; teacherId: string } 
  }>();

  // Apply authentication middleware cho tất cả routes
  router.use('*', requireTeacher);

  // GET route - chỉ cần authentication
  router.get('/', async (c) => {
    const teacherId = getTeacherId(c);
    // ... business logic
  });

  // POST route - cần cả authentication và validation
  router.post('/', validateBody(CreateItemSchema), async (c) => {
    const teacherId = getTeacherId(c);
    const itemData = getValidatedData<InferOutput<typeof CreateItemSchema>>(c);
    // ... business logic
  });

  // PATCH route - cần cả authentication và validation
  router.patch('/:id', validateBody(UpdateItemSchema), async (c) => {
    const itemId = c.req.param('id');
    const teacherId = getTeacherId(c);
    const updateData = getValidatedData<InferOutput<typeof UpdateItemSchema>>(c);
    // ... business logic
  });

  return router;
}
```

## Benefits

1. **Code reusability**: Logic authentication và validation được tái sử dụng
2. **Type safety**: InferOutput đảm bảo type safety cho validated data
3. **Consistency**: Tất cả routes có cùng pattern xử lý
4. **Cleaner code**: Route handlers chỉ tập trung vào business logic
5. **Error handling**: Centralized error responses cho auth và validation
6. **Maintainability**: Dễ maintain và update logic chung

## Migration Guide

Để migrate existing routes:

1. Add middleware imports
2. Update Hono type definition để include Variables
3. Apply `router.use('*', requireTeacher)` 
4. Replace authentication logic với `getTeacherId(c)`
5. Replace validation logic với `validateBody()` middleware và `getValidatedData()`
6. Add proper TypeScript types với `InferOutput<typeof Schema>`