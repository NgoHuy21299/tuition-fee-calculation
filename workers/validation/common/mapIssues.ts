// Note: Valibot v0.34 does not export the Issue type. We only rely on
// the presence of `message` and `path`, so define a minimal local type.
type MinimalIssue = { message: unknown; path?: unknown };

import type {
  ValidationErrorDetail,
  ValidationField,
  ValidationCode,
} from "./types";
import { tv } from "../../i18n/validationMessages";

function getFieldFromPath(path: unknown): ValidationField {
  // Valibot path may be an array of primitives or array of objects with `{ key }`.
  let first: string | number | undefined;
  if (Array.isArray(path) && path.length > 0) {
    const head = path[0] as unknown;
    if (typeof head === "string" || typeof head === "number") {
      first = head;
    } else if (
      head &&
      typeof head === "object" &&
      "key" in (head as Record<string, unknown>)
    ) {
      const k = (head as Record<string, unknown>)["key"];
      if (typeof k === "string" || typeof k === "number") first = k;
    }
  }
  const p0 = first !== undefined ? String(first) : "body";
  // Narrow to known fields; fallback to 'body'
  const known: ValidationField[] = [
    // Class fields
    "body",
    "query",
    "name",
    "subject",
    "description",
    "defaultFeePerSession",
    "isActive",
    "sort",
    // Auth fields
    "email",
    "password",
    "oldPassword",
    "newPassword",
  ];
  return (known as string[]).includes(p0)
    ? (p0 as ValidationField)
    : ("body" as ValidationField);
}

export function mapValibotIssues(
  issues: MinimalIssue[]
): ValidationErrorDetail[] {
  const details: ValidationErrorDetail[] = [];
  for (const issue of issues) {
    const code = String(issue.message) as ValidationCode; // we pass code via schema messages
    const field = getFieldFromPath(issue.path);
    details.push({ field, code, message: tv(code) });
  }
  return details;
}
