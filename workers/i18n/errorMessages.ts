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
  EMAIL_NOT_ALLOWED: "Email này không được phép đăng nhập/đăng ký vào hệ thống",
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
  STUDENT_HAS_MEMBERSHIP_HISTORY: "Học sinh đã từng học, không thể xóa",
  // Session-specific error messages
  SESSION_NOT_FOUND: "Không tìm thấy buổi học",
  SESSION_CONFLICT: "Buổi học trùng lịch với một buổi đã tồn tại",
  SESSION_HAS_ATTENDANCE: "Không thể xoá buổi vì đã có điểm danh/attendance",
  SERIES_TOO_LARGE: "Yêu cầu tạo chuỗi buổi quá lớn, vui lòng thu hẹp khoảng thời gian hoặc giảm số lượng",
  CLASS_NOT_FOUND: "Không tìm thấy lớp học",
  STUDENT_NOT_FOUND: "Không tìm thấy học sinh",
  // Attendance-specific error messages
  ATTENDANCE_ALREADY_EXISTS: "Điểm danh cho học sinh này đã tồn tại",
  ATTENDANCE_NOT_FOUND: "Không tìm thấy bản ghi điểm danh",
  ATTENDANCE_SESSION_COMPLETED: "Không thể sửa điểm danh cho buổi học đã hoàn thành",
  ATTENDANCE_STUDENT_NOT_IN_CLASS: "Học sinh không thuộc lớp học này",
  ATTENDANCE_UPDATE_FAILED: "Cập nhật điểm danh thất bại",
  ATTENDANCE_DELETE_FAILED: "Xóa điểm danh thất bại"
};

export function t(code: ErrorCode, fallback?: string): string {
  return viMessages[code] ?? fallback ?? viMessages.UNKNOWN;
}
