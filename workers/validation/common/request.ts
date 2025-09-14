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
