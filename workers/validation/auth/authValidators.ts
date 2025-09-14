import { safeParse } from "valibot";
import type { ValidationErrorDetail } from "../common/types";
import { mapValibotIssues } from "../common/mapIssues";
import { ChangePasswordSchema, LoginSchema, RegisterSchema } from "./authSchemas";

export function validateLogin(
  body: unknown
): { ok: true; value: { email: string; password: string } } | { ok: false; errors: ValidationErrorDetail[] } {
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
  const result = safeParse(LoginSchema, body);
  if (!result.success) return { ok: false, errors: mapValibotIssues(result.issues) };
  return { ok: true, value: result.output };
}

export function validateRegister(
  body: unknown
): { ok: true; value: { email: string; password: string; name: string } } | { ok: false; errors: ValidationErrorDetail[] } {
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
  const result = safeParse(RegisterSchema, body);
  if (!result.success) return { ok: false, errors: mapValibotIssues(result.issues) };
  return { ok: true, value: result.output };
}

export function validateChangePassword(
  body: unknown
): { ok: true; value: { oldPassword: string; newPassword: string } } | { ok: false; errors: ValidationErrorDetail[] } {
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
  const result = safeParse(ChangePasswordSchema, body);
  if (!result.success) return { ok: false, errors: mapValibotIssues(result.issues) };
  return { ok: true, value: result.output };
}
