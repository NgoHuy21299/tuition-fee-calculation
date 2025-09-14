import type { ValidationCode } from "../validation/common/types";

export const viValidationMessages: Record<ValidationCode, string> = {
  INVALID_JSON_BODY: "JSON không hợp lệ",
  NAME_REQUIRED: "Tên lớp là bắt buộc",
  NAME_TOO_LONG: "Tên lớp quá dài (tối đa 100 ký tự)",
  SUBJECT_INVALID: "Môn học không hợp lệ",
  SUBJECT_TOO_LONG: "Môn học quá dài (tối đa 100 ký tự)",
  DESCRIPTION_INVALID: "Mô tả không hợp lệ",
  DESCRIPTION_TOO_LONG: "Mô tả quá dài (tối đa 2000 ký tự)",
  DEFAULT_FEE_INVALID: "Học phí mặc định phải là số nguyên không âm",
  IS_ACTIVE_INVALID: "Trạng thái không hợp lệ",
  SORT_INVALID: "Giá trị sắp xếp không hợp lệ",
  EMAIL_REQUIRED: "Email là bắt buộc",
  EMAIL_INVALID: "Email không hợp lệ",
  PASSWORD_REQUIRED: "Mật khẩu là bắt buộc",
  PASSWORD_TOO_SHORT: "Mật khẩu phải có ít nhất 8 ký tự",
  NAME_INVALID: "Tên không hợp lệ",
};

export function tv(code: ValidationCode, fallback?: string): string {
  return viValidationMessages[code] ?? fallback ?? "Dữ liệu không hợp lệ";
}