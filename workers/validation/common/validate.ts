import { safeParse } from "valibot";
import type { BaseSchema, InferOutput } from "valibot";
import type { ValidationErrorDetail } from "./validationTypes";
import { mapValibotIssues } from "./mapIssues";

export type Validated<TSchema extends BaseSchema<any, any, any>> =
  | { ok: true; value: InferOutput<TSchema> }
  | { ok: false; errors: ValidationErrorDetail[] };

export function validateWithSchema<TSchema extends BaseSchema<any, any, any>>(
  schema: TSchema,
  body: unknown
): { ok: true; value: InferOutput<TSchema> } | { ok: false; errors: ValidationErrorDetail[] } {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      errors: [
        {
          field: "body",
          code: "INVALID_JSON_BODY",
          message: "JSON không hợp lệ",
        },
      ],
    };
  }
  const result = safeParse(schema, body);
  if (!result.success)
    return { ok: false, errors: mapValibotIssues(result.issues) };
  return { ok: true, value: result.output };
}
