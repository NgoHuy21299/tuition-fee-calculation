import { safeParse } from "valibot";
import {
  CreateClassSchema,
  UpdateClassSchema,
  ListQuerySchema,
} from "./classSchemas";
import type { ValidationErrorDetail } from "../common/types";
import { mapValibotIssues } from "../common/mapIssues";
import { CLASS_SORT, type ClassSort } from "../../repos/classRepository";
import { validateWithSchema } from "../common/validate";

export function validateCreateClass(
  body: unknown
): { ok: true; value: any } | { ok: false; errors: ValidationErrorDetail[] } {
  return validateWithSchema(CreateClassSchema, body);
}

export function validateUpdateClass(
  body: unknown
): { ok: true; value: any } | { ok: false; errors: ValidationErrorDetail[] } {
  return validateWithSchema(UpdateClassSchema, body);
}

export function validateListQuery(
  searchParams: URLSearchParams
):
  | { ok: true; value: { isActive?: boolean; sort?: ClassSort } }
  | { ok: false; errors: ValidationErrorDetail[] } {
  const raw = {
    isActive: searchParams.get("isActive") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  };
  const result = safeParse(ListQuerySchema, raw);
  if (!result.success)
    return {
      ok: false,
      errors: mapValibotIssues(result.issues).map((d) => ({
        ...d,
        field: d.field === "body" ? "query" : d.field,
      })),
    };

  const out: { isActive?: boolean; sort?: ClassSort } = {};
  if (result.output.isActive === "true") out.isActive = true;
  if (result.output.isActive === "false") out.isActive = false;
  if (result.output.sort) {
    const allowed = Object.values(CLASS_SORT) as string[];
    if (!allowed.includes(result.output.sort)) {
      return {
        ok: false,
        errors: [
          {
            field: "sort",
            code: "SORT_INVALID",
            message: "Giá trị sắp xếp không hợp lệ",
          },
        ],
      };
    }
    out.sort = result.output.sort as ClassSort;
  }
  return { ok: true, value: out };
}
