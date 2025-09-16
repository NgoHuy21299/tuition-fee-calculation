import {
  object,
  string,
  optional,
  nullable,
  maxLength,
  minLength,
  pipe,
  regex,
  union,
  literal,
} from "valibot";
import type { InferOutput } from "valibot";
import type { ValidationCode } from "../common/types";

// Base messages are codes; mapped to human text via i18n tv()
function Msg(code: ValidationCode) {
  return code;
}

// Simple email validation – rely on basic RFC-like regex via valibot's regex (or could add custom)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\- ]{6,20}$/;

export const ParentInlineSchema = object({
  relationship: union(
    [
      literal("father"),
      literal("mother"),
      literal("grandfather"),
      literal("grandmother"),
    ],
    Msg("RELATIONSHIP_INVALID")
  ),
  name: optional(
    nullable(
      pipe(
        string(Msg("PARENT_NAME_INVALID")),
        maxLength(100, Msg("PARENT_NAME_INVALID"))
      )
    )
  ),
  phone: optional(
    nullable(
      pipe(
        string(Msg("PARENT_PHONE_INVALID")),
        regex(PHONE_REGEX, Msg("PARENT_PHONE_INVALID"))
      )
    )
  ),
  email: optional(
    nullable(
      pipe(
        string(Msg("PARENT_EMAIL_INVALID")),
        regex(EMAIL_REGEX, Msg("PARENT_EMAIL_INVALID"))
      )
    )
  ),
  note: optional(
    nullable(
      pipe(
        string(Msg("PARENT_NOTE_TOO_LONG")),
        maxLength(1000, Msg("PARENT_NOTE_TOO_LONG"))
      )
    )
  ),
});

export const CreateStudentSchema = object({
  name: pipe(
    string(Msg("NAME_INVALID")),
    minLength(1, Msg("NAME_REQUIRED")),
    maxLength(100, Msg("NAME_TOO_LONG"))
  ),
  email: optional(
    nullable(
      pipe(
        string(Msg("EMAIL_INVALID")),
        regex(EMAIL_REGEX, Msg("EMAIL_INVALID"))
      )
    )
  ),
  phone: optional(
    nullable(
      pipe(
        string(Msg("PHONE_INVALID")),
        regex(PHONE_REGEX, Msg("PHONE_INVALID"))
      )
    )
  ),
  note: optional(
    nullable(
      pipe(string(Msg("NOTE_TOO_LONG")), maxLength(1000, Msg("NOTE_TOO_LONG")))
    )
  ),
  parentInline: optional(nullable(ParentInlineSchema)),
});

export const UpdateStudentSchema = object({
  name: optional(
    pipe(
      string(Msg("NAME_INVALID")),
      minLength(1, Msg("NAME_REQUIRED")),
      maxLength(100, Msg("NAME_TOO_LONG"))
    )
  ),
  email: optional(
    nullable(
      pipe(
        string(Msg("EMAIL_INVALID")),
        regex(EMAIL_REGEX, Msg("EMAIL_INVALID"))
      )
    )
  ),
  phone: optional(
    nullable(
      pipe(
        string(Msg("PHONE_INVALID")),
        regex(PHONE_REGEX, Msg("PHONE_INVALID"))
      )
    )
  ),
  note: optional(
    nullable(
      pipe(string(Msg("NOTE_TOO_LONG")), maxLength(1000, Msg("NOTE_TOO_LONG")))
    )
  ),
  parentInline: optional(nullable(ParentInlineSchema)),
});

export type ParentInlineInput = InferOutput<typeof ParentInlineSchema>;
export type CreateStudentInput = InferOutput<typeof CreateStudentSchema>;
export type UpdateStudentInput = InferOutput<typeof UpdateStudentSchema>;
