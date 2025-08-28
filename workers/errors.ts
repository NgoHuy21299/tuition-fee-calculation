export type ErrorCode =
  | "AUTH_MISSING_CREDENTIALS"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_INVALID_JSON"
  | "AUTH_MISSING_FIELDS"
  | "AUTH_UNAUTHORIZED"
  | "AUTH_PASSWORD_TOO_SHORT"
  | "AUTH_INVALID_OLD_PASSWORD"
  | "AUTH_EMAIL_EXISTS"
  | "AUTH_REGISTER_FAILED"
  | "SERVER_MISCONFIGURED"
  | "RESOURCE_NOT_FOUND"
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
  if (err instanceof AppError) return err;
  const e = err as Error | undefined;
  return new AppError(fallback.code, e?.message, fallback.status ?? 400);
}
