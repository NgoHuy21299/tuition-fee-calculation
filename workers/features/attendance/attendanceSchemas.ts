import {
  object,
  string,
  number,
  optional,
  nullable,
  pipe,
  minLength,
  maxLength,
  array,
  minValue,
  union,
  literal,
} from "valibot";
import type { InferOutput } from "valibot";
import type { ValidationCode } from "../../validation/common/validationTypes";

function Msg(code: ValidationCode) {
  return code;
}

// Attendance status enum values
const AttendanceStatusSchema = union(
  [literal("present"), literal("absent"), literal("late")],
  Msg("ATTENDANCE_STATUS_INVALID")
);

// Create single attendance record schema
export const CreateAttendanceSchema = object({
  sessionId: pipe(
    string(Msg("SESSION_ID_REQUIRED")),
    minLength(1, Msg("SESSION_ID_REQUIRED"))
  ),
  studentId: pipe(
    string(Msg("STUDENT_ID_REQUIRED")),
    minLength(1, Msg("STUDENT_ID_REQUIRED"))
  ),
  status: AttendanceStatusSchema,
  note: optional(
    nullable(
      pipe(string(Msg("NOTE_INVALID")), maxLength(1000, Msg("NOTE_TOO_LONG")))
    )
  ),
  feeOverride: optional(
    nullable(
      pipe(
        number(Msg("FEE_OVERRIDE_INVALID")),
        minValue(0, Msg("FEE_OVERRIDE_NEGATIVE"))
      )
    )
  ),
});

// Update attendance record schema
export const UpdateAttendanceSchema = object({
  status: optional(AttendanceStatusSchema),
  note: optional(
    nullable(
      pipe(string(Msg("NOTE_INVALID")), maxLength(1000, Msg("NOTE_TOO_LONG")))
    )
  ),
  feeOverride: optional(
    nullable(
      pipe(
        number(Msg("FEE_OVERRIDE_INVALID")),
        minValue(0, Msg("FEE_OVERRIDE_NEGATIVE"))
      )
    )
  ),
});

// Bulk attendance operation schema
export const BulkAttendanceSchema = object({
  sessionId: pipe(
    string(Msg("SESSION_ID_REQUIRED")),
    minLength(1, Msg("SESSION_ID_REQUIRED"))
  ),
  attendanceRecords: array(
    object({
      studentId: pipe(
        string(Msg("STUDENT_ID_REQUIRED")),
        minLength(1, Msg("STUDENT_ID_REQUIRED"))
      ),
      status: AttendanceStatusSchema,
      note: optional(
        nullable(
          pipe(
            string(Msg("NOTE_INVALID")),
            maxLength(1000, Msg("NOTE_TOO_LONG"))
          )
        )
      ),
      feeOverride: optional(
        nullable(
          pipe(
            number(Msg("FEE_OVERRIDE_INVALID")),
            minValue(0, Msg("FEE_OVERRIDE_NEGATIVE"))
          )
        )
      ),
    }),
    Msg("ATTENDANCE_RECORDS_REQUIRED")
  ),
});

// Attendance query/filter schema
export const AttendanceQuerySchema = object({
  studentId: optional(
    pipe(
      string(Msg("STUDENT_ID_INVALID")),
      minLength(1, Msg("STUDENT_ID_INVALID"))
    )
  ),
  classId: optional(
    pipe(string(Msg("CLASS_ID_INVALID")), minLength(1, Msg("CLASS_ID_INVALID")))
  ),
  fromDate: optional(
    nullable(
      pipe(
        string(Msg("FROM_DATE_INVALID")),
        minLength(1, Msg("FROM_DATE_INVALID"))
      )
    )
  ),
  toDate: optional(
    nullable(
      pipe(string(Msg("TO_DATE_INVALID")), minLength(1, Msg("TO_DATE_INVALID")))
    )
  ),
  status: optional(AttendanceStatusSchema),
});

// Types inferred from schemas
export type CreateAttendanceInput = InferOutput<typeof CreateAttendanceSchema>;
export type UpdateAttendanceInput = InferOutput<typeof UpdateAttendanceSchema>;
export type BulkAttendanceInput = InferOutput<typeof BulkAttendanceSchema>;
export type AttendanceQueryInput = InferOutput<typeof AttendanceQuerySchema>;

// Attendance DTO with student info
export interface AttendanceDto {
  id: string;
  sessionId: string;
  studentId: string;
  status: "present" | "absent" | "late";
  note: string | null;
  markedBy: string | null;
  markedAt: string;
  feeOverride: number | null;
  calculatedFee: number | null;
  // Student info
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
}

// Attendance with session info for student history
export interface AttendanceWithSessionDto extends AttendanceDto {
  sessionStartTime: string;
  sessionDurationMin: number;
  className: string | null;
  classSubject: string | null;
}

// Bulk operation result
export interface BulkAttendanceResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    studentId: string;
    success: boolean;
    attendanceId?: string;
    error?: string;
  }>;
}

// Attendance statistics
export interface AttendanceStats {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number; // percentage
  totalFees: number;
}
