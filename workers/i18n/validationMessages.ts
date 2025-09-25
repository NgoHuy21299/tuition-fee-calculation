import type { ValidationCode } from "../validation/common/validationTypes";

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
  // NAME_TOO_LONG already defined above for classes; reuse that entry for students
  // Student-specific
  PHONE_INVALID: "Số điện thoại không hợp lệ",
  NOTE_TOO_LONG: "Ghi chú quá dài",
  RELATIONSHIP_INVALID: "Mối quan hệ không hợp lệ",
  PARENT_NAME_INVALID: "Tên phụ huynh không hợp lệ hoặc quá dài",
  PARENT_EMAIL_INVALID: "Email phụ huynh không hợp lệ",
  PARENT_PHONE_INVALID: "Số điện thoại phụ huynh không hợp lệ",
  PARENT_NOTE_TOO_LONG: "Ghi chú phụ huynh quá dài",
  // ClassStudent-specific
  STUDENT_ID_REQUIRED: "Thiếu mã học sinh",
  UNIT_PRICE_INVALID: "Đơn giá không hợp lệ",
  // Session-specific
  START_TIME_REQUIRED: "Thời gian bắt đầu là bắt buộc",
  DURATION_INVALID: "Thời lượng không hợp lệ",
  DURATION_TOO_SHORT: "Thời lượng phải ít nhất 1 phút",
  FEE_INVALID: "Học phí không hợp lệ",
  FEE_NEGATIVE: "Học phí không được âm",
  NOTES_INVALID: "Ghi chú không hợp lệ",
  NOTES_TOO_LONG: "Ghi chú quá dài (tối đa 2000 ký tự)",
  STATUS_INVALID: "Trạng thái không hợp lệ",
  TYPE_INVALID: "Loại buổi học không hợp lệ",
  DAYS_OF_WEEK_INVALID: "Ngày trong tuần không hợp lệ",
  DAYS_OF_WEEK_REQUIRED: "Cần chọn ít nhất một ngày trong tuần",
  TIME_REQUIRED: "Giờ học là bắt buộc",
  TIME_FORMAT_INVALID: "Định dạng giờ không hợp lệ (HH:MM)",
  START_DATE_REQUIRED: "Ngày bắt đầu là bắt buộc",
  END_DATE_INVALID: "Ngày kết thúc không hợp lệ",
  DATE_FORMAT_INVALID: "Định dạng ngày không hợp lệ (YYYY-MM-DD)",
  MAX_OCCURRENCES_INVALID: "Số buổi tối đa không hợp lệ",
  MAX_OCCURRENCES_TOO_SMALL: "Số buổi tối đa phải ít nhất 1",
  TIMEZONE_INVALID: "Múi giờ không hợp lệ",
  EXCLUSION_DATE_INVALID: "Ngày loại trừ không hợp lệ",
};

export function tv(code: ValidationCode, fallback?: string): string {
  return viValidationMessages[code] ?? fallback ?? "Dữ liệu không hợp lệ";
}
