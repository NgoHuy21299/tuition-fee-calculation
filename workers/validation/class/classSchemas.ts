import {
  object,
  string,
  number,
  boolean,
  nullable,
  optional,
  minLength,
  maxLength,
  integer,
  minValue,
  union,
  literal,
  pipe,
} from "valibot";
import type { InferOutput } from "valibot";
import type { ValidationCode } from "../common/types";

// Define base messages (we use i18n codes at mapping stage; here we set minimal messages for Valibot)
const MSG = {
  INVALID_JSON_BODY: "INVALID_JSON_BODY",
  NAME_REQUIRED: "NAME_REQUIRED",
  NAME_TOO_LONG: "NAME_TOO_LONG",
  SUBJECT_INVALID: "SUBJECT_INVALID",
  SUBJECT_TOO_LONG: "SUBJECT_TOO_LONG",
  DESCRIPTION_INVALID: "DESCRIPTION_INVALID",
  DESCRIPTION_TOO_LONG: "DESCRIPTION_TOO_LONG",
  DEFAULT_FEE_INVALID: "DEFAULT_FEE_INVALID",
  IS_ACTIVE_INVALID: "IS_ACTIVE_INVALID",
  SORT_INVALID: "SORT_INVALID",
} as const;

export const CreateClassSchema = object({
  name: pipe(
    string(Msg(MSG.NAME_REQUIRED)),
    minLength(1, Msg(MSG.NAME_REQUIRED)),
    maxLength(100, Msg(MSG.NAME_TOO_LONG))
  ),
  subject: optional(
    nullable(
      pipe(
        string(Msg(MSG.SUBJECT_INVALID)),
        maxLength(100, Msg(MSG.SUBJECT_TOO_LONG))
      )
    )
  ),
  description: optional(
    nullable(
      pipe(
        string(Msg(MSG.DESCRIPTION_INVALID)),
        maxLength(2000, Msg(MSG.DESCRIPTION_TOO_LONG))
      )
    )
  ),
  defaultFeePerSession: optional(
    nullable(
      pipe(
        number(Msg(MSG.DEFAULT_FEE_INVALID)),
        integer(Msg(MSG.DEFAULT_FEE_INVALID)),
        minValue(0, Msg(MSG.DEFAULT_FEE_INVALID))
      )
    )
  ),
  isActive: optional(boolean(Msg(MSG.IS_ACTIVE_INVALID))),
});

export const UpdateClassSchema = object({
  name: optional(
    pipe(
      string(Msg(MSG.NAME_REQUIRED)),
      minLength(1, Msg(MSG.NAME_REQUIRED)),
      maxLength(100, Msg(MSG.NAME_TOO_LONG))
    )
  ),
  subject: optional(
    nullable(
      pipe(
        string(Msg(MSG.SUBJECT_INVALID)),
        maxLength(100, Msg(MSG.SUBJECT_TOO_LONG))
      )
    )
  ),
  description: optional(
    nullable(
      pipe(
        string(Msg(MSG.DESCRIPTION_INVALID)),
        maxLength(2000, Msg(MSG.DESCRIPTION_TOO_LONG))
      )
    )
  ),
  defaultFeePerSession: optional(
    nullable(
      pipe(
        number(Msg(MSG.DEFAULT_FEE_INVALID)),
        integer(Msg(MSG.DEFAULT_FEE_INVALID)),
        minValue(0, Msg(MSG.DEFAULT_FEE_INVALID))
      )
    )
  ),
  isActive: optional(boolean(Msg(MSG.IS_ACTIVE_INVALID))),
});

// Allowed sort values should match CLASS_SORT keys/values
export const ListQuerySchema = object({
  isActive: optional(
    union([literal("true"), literal("false")], Msg(MSG.IS_ACTIVE_INVALID))
  ),
  sort: optional(string(Msg(MSG.SORT_INVALID))),
});

function Msg(code: ValidationCode) {
  return code; // we pass code as message and translate later via tv()
}

// Inferred types for reuse
export type CreateClassInput = InferOutput<typeof CreateClassSchema>;
export type UpdateClassInput = InferOutput<typeof UpdateClassSchema>;
export type ListQueryInput = InferOutput<typeof ListQuerySchema>;
