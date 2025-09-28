export type ErrorCode =
  // Authentication errors
  | "AUTH_MISSING_CREDENTIALS"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_INVALID_JSON"
  | "AUTH_MISSING_FIELDS"
  | "AUTH_UNAUTHORIZED"
  | "AUTH_PASSWORD_TOO_SHORT"
  | "AUTH_INVALID_OLD_PASSWORD"
  | "AUTH_EMAIL_EXISTS"
  | "AUTH_REGISTER_FAILED"
  // Server errors
  | "SERVER_MISCONFIGURED"
  | "RESOURCE_NOT_FOUND"
  // Client errors
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  // Business rules for Class CRUD operations
  | "CLASS_HAS_DEPENDENCIES"
  | "CLASS_HAS_STUDENTS"
  | "CLASS_HAS_SESSIONS"
  // Business rules for Student & Membership
  | "DUPLICATE_STUDENT"
  | "STUDENT_NOT_FOUND"
  | "ALREADY_MEMBER"
  | "STUDENT_HAS_ATTENDANCE"
  | "STUDENT_HAS_MEMBERSHIP_HISTORY"
  // Session business rules
  | "SESSION_NOT_FOUND"
  | "SESSION_CONFLICT"
  | "SESSION_HAS_ATTENDANCE"
  | "SERIES_TOO_LARGE"
  | "CLASS_NOT_FOUND"
  // Attendance business rules
  | "ATTENDANCE_ALREADY_EXISTS"
  | "ATTENDANCE_NOT_FOUND"
  | "ATTENDANCE_SESSION_COMPLETED"
  | "ATTENDANCE_STUDENT_NOT_IN_CLASS"
  | "ATTENDANCE_UPDATE_FAILED"
  | "ATTENDANCE_DELETE_FAILED"
  // Unknown
  | "UNKNOWN";

export class AppError extends Error {
  code: ErrorCode;
  status: number;
  constructor(code: ErrorCode, message?: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function toAppError(err: unknown, fallback: { code: ErrorCode; status?: number } = { code: "UNKNOWN" }): AppError {
  console.log("Error: ", err);
  if (err instanceof AppError) return err;
  const e = err as Error | undefined;
  return new AppError(fallback.code, e?.message, fallback.status ?? 400);
}
