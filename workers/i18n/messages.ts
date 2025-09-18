import type { ErrorCode } from "../errors";

export const viMessages: Record<ErrorCode, string> = {
  AUTH_MISSING_CREDENTIALS: "Thiếu thông tin đăng nhập",
  AUTH_INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng",
  AUTH_INVALID_JSON: "JSON không hợp lệ",
  AUTH_MISSING_FIELDS: "Thiếu trường bắt buộc",
  AUTH_UNAUTHORIZED: "Chưa xác thực",
  AUTH_PASSWORD_TOO_SHORT: "Mật khẩu mới phải có ít nhất 8 ký tự",
  AUTH_INVALID_OLD_PASSWORD: "Mật khẩu cũ không đúng",
  AUTH_EMAIL_EXISTS: "Email đã được đăng ký",
  AUTH_REGISTER_FAILED: "Đăng ký thất bại",
  SERVER_MISCONFIGURED: "Máy chủ cấu hình sai: JWT_SECRET thiếu",
  RESOURCE_NOT_FOUND: "Không tìm thấy tài nguyên",
  UNKNOWN: "Đã xảy ra lỗi",
  FORBIDDEN: "Không có quyền",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ",
  CLASS_HAS_DEPENDENCIES: "Lớp có phụ thuộc",
  CLASS_HAS_STUDENTS: "Lớp vẫn còn học sinh",
  CLASS_HAS_SESSIONS: "Lớp vẫn còn buổi học",
  DUPLICATE_STUDENT: "Học sinh đã tồn tại",
  ALREADY_MEMBER: "Học sinh đã được thêm vào lớp",
  STUDENT_HAS_ATTENDANCE: "Học sinh đã từng học, không thể xóa",
  STUDENT_HAS_MEMBERSHIP_HISTORY: "Học sinh đã từng học, không thể xóa"
};

export function t(code: ErrorCode, fallback?: string): string {
  return viMessages[code] ?? fallback ?? viMessages.UNKNOWN;
}
