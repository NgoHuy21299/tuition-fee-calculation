// Validation primitives used by route validators

export type ValidationCode =
  | "INVALID_JSON_BODY"
  | "NAME_REQUIRED"
  | "NAME_TOO_LONG"
  | "SUBJECT_INVALID"
  | "SUBJECT_TOO_LONG"
  | "DESCRIPTION_INVALID"
  | "DESCRIPTION_TOO_LONG"
  | "DEFAULT_FEE_INVALID"
  | "IS_ACTIVE_INVALID"
  | "SORT_INVALID"
  | "EMAIL_REQUIRED"
  | "EMAIL_INVALID"
  | "PASSWORD_REQUIRED"
  | "PASSWORD_TOO_SHORT"
  | "NAME_INVALID"
  | "NAME_TOO_LONG";

export type ValidationField =
  | "body"
  | "query"
  | "name"
  | "subject"
  | "description"
  | "defaultFeePerSession"
  | "isActive"
  | "sort"
  | "email"
  | "password"
  | "oldPassword"
  | "newPassword";

export type ValidationErrorDetail = {
  field: ValidationField;
  code: ValidationCode;
  message: string;
};
