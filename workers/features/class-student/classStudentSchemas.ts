import {
  object,
  string,
  optional,
  nullable,
  number,
  integer,
  minValue,
  pipe,
} from "valibot";
import type { InferOutput } from "valibot";
import type { ValidationCode } from "../../validation/common/types";

function Msg(code: ValidationCode) {
  return code;
}

export const AddClassStudentSchema = object({
  studentId: string(Msg("STUDENT_ID_REQUIRED")),
  unitPriceOverride: optional(
    nullable(
      pipe(
        number(Msg("UNIT_PRICE_INVALID")),
        integer(Msg("UNIT_PRICE_INVALID")),
        minValue(0, Msg("UNIT_PRICE_INVALID"))
      )
    )
  ),
});

export const LeaveClassStudentSchema = object({
  leftAt: string(Msg("DEFAULT_FEE_INVALID")), // reuse generic invalid message; service may override to now()
});

export type AddClassStudentInput = InferOutput<typeof AddClassStudentSchema>;
export type LeaveClassStudentInput = InferOutput<
  typeof LeaveClassStudentSchema
>;
