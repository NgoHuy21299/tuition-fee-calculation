import type { ValidationErrorDetail } from "../common/types";
import { ChangePasswordSchema, LoginSchema, RegisterSchema } from "./authSchemas";
import { validateWithSchema } from "../common/validate";

export function validateLogin(body: unknown) {
  return validateWithSchema(LoginSchema, body);
}

export function validateRegister(body: unknown) {
  return validateWithSchema(RegisterSchema, body);
}

export function validateChangePassword(body: unknown) {
  return validateWithSchema(ChangePasswordSchema, body);
}
