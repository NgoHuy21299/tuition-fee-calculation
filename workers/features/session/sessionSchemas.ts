import {
  object,
  string,
  number,
  optional,
  nullable,
  pipe,
  minLength,
  maxLength,
  regex,
  array,
  minValue,
  maxValue,
  union,
  literal
} from 'valibot';
import type { InferOutput } from 'valibot';
import type { ValidationCode } from '../../validation/common/validationTypes';

function Msg(code: ValidationCode) {
  return code;
}

// Session status enum values
const StatusSchema = union([
  literal('scheduled'),
  literal('completed'),
  literal('canceled')
], Msg("STATUS_INVALID"));

const TypeSchema = union([
  literal('class'),
  literal('ad_hoc')
], Msg("TYPE_INVALID"));

// Create single session schema
export const CreateSessionSchema = object({
  classId: optional(nullable(
    pipe(string(), minLength(1))
  )),
  startTime: pipe(
    string(Msg("START_TIME_REQUIRED")),
    minLength(1, Msg("START_TIME_REQUIRED"))
  ),
  durationMin: pipe(
    number(Msg("DURATION_INVALID")),
    minValue(1, Msg("DURATION_TOO_SHORT"))
  ),
  feePerSession: optional(nullable(
    pipe(
      number(Msg("FEE_INVALID")),
      minValue(0, Msg("FEE_NEGATIVE"))
    )
  )),
  notes: optional(nullable(
    pipe(
      string(Msg("NOTES_INVALID")),
      maxLength(2000, Msg("NOTES_TOO_LONG"))
    )
  )),
  status: optional(StatusSchema, 'scheduled'),
  type: optional(TypeSchema, 'class')
});

// Create recurring session series schema
export const CreateSessionSeriesSchema = object({
  classId: optional(nullable(
    pipe(string(), minLength(1))
  )),
  recurrence: object({
    daysOfWeek: array(
      pipe(
        number(Msg("DAYS_OF_WEEK_INVALID")),
        minValue(0, Msg("DAYS_OF_WEEK_INVALID")),
        maxValue(6, Msg("DAYS_OF_WEEK_INVALID"))
      ),
      Msg("DAYS_OF_WEEK_REQUIRED")
    ),
    time: pipe(
      string(Msg("TIME_REQUIRED")),
      regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, Msg("TIME_FORMAT_INVALID"))
    ),
    startDate: pipe(
      string(Msg("START_DATE_REQUIRED")),
      regex(/^\d{4}-\d{2}-\d{2}$/, Msg("DATE_FORMAT_INVALID"))
    ),
    endDate: optional(nullable(
      pipe(
        string(Msg("END_DATE_INVALID")),
        regex(/^\d{4}-\d{2}-\d{2}$/, Msg("DATE_FORMAT_INVALID"))
      )
    )),
    maxOccurrences: optional(nullable(
      pipe(
        number(Msg("MAX_OCCURRENCES_INVALID")),
        minValue(1, Msg("MAX_OCCURRENCES_TOO_SMALL"))
      )
    )),
    timezone: optional(
      string(Msg("TIMEZONE_INVALID")),
      'UTC'
    ),
    exclusionDates: optional(
      array(
        pipe(
          string(Msg("EXCLUSION_DATE_INVALID")),
          regex(/^\d{4}-\d{2}-\d{2}$/, Msg("DATE_FORMAT_INVALID"))
        )
      ),
      []
    )
  }),
  durationMin: pipe(
    number(Msg("DURATION_INVALID")),
    minValue(1, Msg("DURATION_TOO_SHORT"))
  ),
  feePerSession: optional(nullable(
    pipe(
      number(Msg("FEE_INVALID")),
      minValue(0, Msg("FEE_NEGATIVE"))
    )
  )),
  notes: optional(nullable(
    pipe(
      string(Msg("NOTES_INVALID")),
      maxLength(2000, Msg("NOTES_TOO_LONG"))
    )
  )),
  status: optional(StatusSchema, 'scheduled'),
  type: optional(TypeSchema, 'class')
});

// Update session schema
export const UpdateSessionSchema = object({
  startTime: optional(
    pipe(
      string(Msg("START_TIME_REQUIRED")),
      minLength(1, Msg("START_TIME_REQUIRED"))
    )
  ),
  durationMin: optional(
    pipe(
      number(Msg("DURATION_INVALID")),
      minValue(1, Msg("DURATION_TOO_SHORT"))
    )
  ),
  feePerSession: optional(nullable(
    pipe(
      number(Msg("FEE_INVALID")),
      minValue(0, Msg("FEE_NEGATIVE"))
    )
  )),
  notes: optional(nullable(
    pipe(
      string(Msg("NOTES_INVALID")),
      maxLength(2000, Msg("NOTES_TOO_LONG"))
    )
  )),
  status: optional(StatusSchema)
});

// Unlock session schema (require a reason)
export const UnlockSessionSchema = object({
  reason: pipe(
    string(),
    minLength(3),
    maxLength(2000)
  )
});

export type CreateSessionInput = InferOutput<typeof CreateSessionSchema>;
export type CreateSessionSeriesInput = InferOutput<typeof CreateSessionSeriesSchema>;
export type UpdateSessionInput = InferOutput<typeof UpdateSessionSchema>;
export type UnlockSessionInput = InferOutput<typeof UnlockSessionSchema>;

// Session DTO
export interface SessionDto {
  id: string;
  classId: string | null;
  teacherId: string;
  startTime: string;
  durationMin: number;
  status: 'scheduled' | 'completed' | 'canceled';
  notes: string | null;
  feePerSession: number | null;
  type: 'class' | 'ad_hoc';
  seriesId: string | null;
  createdAt: string;
  // Optional denormalized info for convenience
  className?: string | null;
}