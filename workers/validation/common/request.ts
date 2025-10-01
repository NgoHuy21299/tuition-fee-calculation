import type { BaseSchema } from "valibot";
import type { Context } from "hono";
import { validateWithSchema, type Validated } from "./validate";

/**
 * Parses JSON body from Hono Context and validates it against a Valibot schema.
 * Returns the same discriminated union as validateWithSchema.
 */
export async function parseBodyWithSchema<TSchema extends BaseSchema<any, any, any>>(
  c: Context,
  schema: TSchema
): Promise<Validated<TSchema>> {
  const body: unknown = await c.req.json().catch(() => null);
  return validateWithSchema(schema, body);
}

/**
 * Parses query parameters from Hono Context and validates it against a Valibot schema.
 * Query parameters are parsed with type conversion for booleans and numbers.
 * Returns the same discriminated union as validateWithSchema.
 */
export function parseQueryWithSchema<TSchema extends BaseSchema<any, any, any>>(
  c: Context,
  schema: TSchema
): Validated<TSchema> {
  const query: Record<string, any> = {};
  
  // Get all query parameters
  const url = new URL(c.req.url);
  for (const [key, value] of url.searchParams) {
    // Convert common types
    if (value === 'true') {
      query[key] = true;
    } else if (value === 'false') {
      query[key] = false;
    } else if (!isNaN(Number(value)) && value !== '') {
      query[key] = Number(value);
    } else {
      query[key] = value;
    }
  }
  
  return validateWithSchema(schema, query);
}
