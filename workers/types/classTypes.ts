import type { ClassRow, ClassSort } from "../repos/classRepository";
import { CLASS_SORT } from "../repos/classRepository";

// OUTPUT DTO: dữ liệu trả về cho client khi thao tác với Class
export type ClassDTO = {
  id: string;
  name: string;
  subject: string | null;
  description: string | null;
  defaultFeePerSession: number | null;
  isActive: boolean;
  createdAt: string; // ISO text from DB
};

// INPUT DTO: payload từ client khi tạo Class
export type CreateClassInput = {
  name: string;
  subject?: string | null;
  description?: string | null;
  defaultFeePerSession?: number | null;
  isActive?: boolean;
};

// INPUT DTO: payload từ client khi cập nhật Class (partial)
export type UpdateClassInput = Partial<CreateClassInput>;

// Helpers for flag mapping
export function dbFlagToBool(n: number): boolean {
  return n === 1;
}
export function boolToDbFlag(b: boolean | undefined): number | null {
  if (b === undefined) return null;
  return b ? 1 : 0;
}

// Map DB row -> DTO
export function mapClassRowToDTO(row: ClassRow): ClassDTO {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    description: row.description,
    defaultFeePerSession: row.defaultFeePerSession,
    isActive: dbFlagToBool(row.isActive),
    createdAt: row.createdAt,
  };
}

// Validation helpers
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function isNullableString(v: unknown): v is string | null | undefined {
  return v === undefined || v === null || typeof v === "string";
}
function isNullableNonNegativeInt(v: unknown): v is number | null | undefined {
  if (v === undefined || v === null) return true;
  return Number.isInteger(v) && (v as number) >= 0;
}
function optionalBoolean(v: unknown): v is boolean | undefined {
  return v === undefined || typeof v === "boolean";
}

// Parse & validate create payload
export function parseCreateClassInput(payload: unknown): { ok: true; value: CreateClassInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const body = payload as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["INVALID_JSON_BODY"] };
  }

  // Validate: name
  const name = body.name;
  if (!isNonEmptyString(name)) {
    errors.push("NAME_REQUIRED");
  } else if (name.length > 100) {
    errors.push("NAME_TOO_LONG");
  }

  // Validate: subject
  const subject = body.subject;
  if (!isNullableString(subject)) errors.push("SUBJECT_INVALID");
  if (typeof subject === "string" && subject.length > 100) errors.push("SUBJECT_TOO_LONG");

  // Validate: description
  const description = body.description;
  if (!isNullableString(description)) errors.push("DESCRIPTION_INVALID");
  if (typeof description === "string" && description.length > 2000) errors.push("DESCRIPTION_TOO_LONG");

  // Validate: defaultFeePerSession
  const defaultFeePerSession = body.defaultFeePerSession;
  if (!isNullableNonNegativeInt(defaultFeePerSession)) errors.push("DEFAULT_FEE_INVALID");

  // Validate: isActive
  const isActive = body.isActive;
  if (!optionalBoolean(isActive)) errors.push("IS_ACTIVE_INVALID");

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name: name as string,
      subject: (subject as string | null | undefined) ?? undefined,
      description: (description as string | null | undefined) ?? undefined,
      defaultFeePerSession: (defaultFeePerSession as number | null | undefined) ?? undefined,
      isActive: (isActive as boolean | undefined) ?? true,
    },
  };
}

// Parse & validate update payload
export function parseUpdateClassInput(payload: unknown): { ok: true; value: UpdateClassInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const body = payload as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["INVALID_JSON_BODY"] };
  }

  const out: UpdateClassInput = {};

  // Validate: name (optional)
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim() === "") errors.push("NAME_INVALID");
    else if ((body.name as string).length > 100) errors.push("NAME_TOO_LONG");
    else out.name = body.name as string;
  }

  // Validate: subject (optional)
  if (body.subject !== undefined) {
    if (!isNullableString(body.subject)) errors.push("SUBJECT_INVALID");
    else if (typeof body.subject === "string" && (body.subject as string).length > 100) errors.push("SUBJECT_TOO_LONG");
    else out.subject = (body.subject as string | null) ?? null;
  }

  // Validate: description (optional)
  if (body.description !== undefined) {
    if (!isNullableString(body.description)) errors.push("DESCRIPTION_INVALID");
    else if (typeof body.description === "string" && (body.description as string).length > 2000)
      errors.push("DESCRIPTION_TOO_LONG");
    else out.description = (body.description as string | null) ?? null;
  }

  // Validate: defaultFeePerSession (optional)
  if (body.defaultFeePerSession !== undefined) {
    if (!isNullableNonNegativeInt(body.defaultFeePerSession)) errors.push("DEFAULT_FEE_INVALID");
    else out.defaultFeePerSession = (body.defaultFeePerSession as number | null) ?? null;
  }

  // Validate: isActive (optional)
  if (body.isActive !== undefined) {
    if (!optionalBoolean(body.isActive)) errors.push("IS_ACTIVE_INVALID");
    else out.isActive = body.isActive as boolean;
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: out };
}

// Parse & normalize list query (optional helper)
export function parseListQuery(searchParams: URLSearchParams): { isActive?: boolean; sort?: ClassSort } {
  const out: { isActive?: boolean; sort?: ClassSort } = {};
  const isActiveRaw = searchParams.get("isActive");
  if (isActiveRaw === "true") out.isActive = true;
  else if (isActiveRaw === "false") out.isActive = false;

  const sortRaw = searchParams.get("sort") as ClassSort | null;
  if (sortRaw && Object.values(CLASS_SORT).includes(sortRaw)) {
    out.sort = sortRaw;
  }
  return out;
}
