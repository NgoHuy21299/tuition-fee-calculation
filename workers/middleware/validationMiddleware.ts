import type { Context, Next } from 'hono';
import type { BaseSchema } from 'valibot';
import { parseBodyWithSchema, parseQueryWithSchema } from '../validation/common/request';

/**
 * Middleware để validate request body với schema
 * Sử dụng: router.post('/', validateBody(CreateSchema), async (c) => { ... })
 */
export function validateBody<T>(schema: BaseSchema<any, T, any>) {
  return async (c: Context, next: Next) => {
    try {
      const parsed = await parseBodyWithSchema(c, schema);
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
      
      // Lưu validated data vào context để route handler sử dụng
      c.set('validatedData', parsed.value);
      await next();
    } catch (error) {
      return c.json(
        { 
          error: 'Invalid request body', 
          code: "VALIDATION_ERROR" 
        },
        400 as 400
      );
    }
  };
}

/**
 * Middleware để validate query parameters với schema
 * Sử dụng: router.get('/', validateQuery(QuerySchema), async (c) => { ... })
 */
export function validateQuery<T>(schema: BaseSchema<any, T, any>) {
  return async (c: Context, next: Next) => {
    try {
      const parsed = parseQueryWithSchema(c, schema);
      if (!parsed.ok) {
        return c.json(
          { 
            error: 'Query validation error', 
            code: "VALIDATION_ERROR", 
            details: parsed.errors 
          },
          400 as 400
        );
      }
      
      // Lưu validated data vào context để route handler sử dụng
      c.set('validatedData', parsed.value);
      await next();
    } catch (error) {
      return c.json(
        { 
          error: 'Invalid query parameters', 
          code: "VALIDATION_ERROR" 
        },
        400 as 400
      );
    }
  };
}

/**
 * Helper function để lấy validated data từ context
 */
export function getValidatedData<T>(c: Context): T {
  return c.get('validatedData') as T;
}