import {
  object,
  string,
  minLength,
  maxLength,
  email as emailRule,
  pipe,
} from "valibot";
import type { ValidationCode } from "../../validation/common/types";

// Keep messages as validation codes; translation is handled later via tv()
const MSG = {
  EMAIL_REQUIRED: "EMAIL_REQUIRED",
  EMAIL_INVALID: "EMAIL_INVALID",
  PASSWORD_REQUIRED: "PASSWORD_REQUIRED",
  PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
  NAME_INVALID: "NAME_INVALID",
  NAME_TOO_LONG: "NAME_TOO_LONG",
} as const;

export const LoginSchema = object({
  email: pipe(
    string(Msg(MSG.EMAIL_REQUIRED)),
    emailRule(Msg(MSG.EMAIL_INVALID))
  ),
  password: pipe(
    string(Msg(MSG.PASSWORD_REQUIRED)),
    minLength(1, Msg(MSG.PASSWORD_REQUIRED))
  ),
});

export const RegisterSchema = object({
  email: pipe(
    string(Msg(MSG.EMAIL_REQUIRED)),
    emailRule(Msg(MSG.EMAIL_INVALID))
  ),
  password: pipe(
    string(Msg(MSG.PASSWORD_REQUIRED)),
    minLength(8, Msg(MSG.PASSWORD_TOO_SHORT))
  ),
  name: pipe(
    string(Msg(MSG.NAME_INVALID)),
    maxLength(100, Msg(MSG.NAME_TOO_LONG))
  ),
});

export const ChangePasswordSchema = object({
  oldPassword: pipe(
    string(Msg(MSG.PASSWORD_REQUIRED)),
    minLength(1, Msg(MSG.PASSWORD_REQUIRED))
  ),
  newPassword: pipe(
    string(Msg(MSG.PASSWORD_REQUIRED)),
    minLength(8, Msg(MSG.PASSWORD_TOO_SHORT))
  ),
});

function Msg(code: ValidationCode) {
  return code;
}
