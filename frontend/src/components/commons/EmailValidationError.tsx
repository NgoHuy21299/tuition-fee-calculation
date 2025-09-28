import { AlertCircle } from 'lucide-react';

interface EmailValidationErrorProps {
  error?: string | null;
  email?: string;
}

/**
 * Component hiển thị thông báo lỗi email validation
 * với thông tin chi tiết và hướng dẫn giải quyết
 */
export function EmailValidationError({ error, email }: EmailValidationErrorProps) {
  if (!error) return null;

  const isEmailValidationError = error.includes('Email này không được phép') || 
                                 error.includes('không được phép đăng nhập') ||
                                 error.includes('không được phép đăng ký');

  if (!isEmailValidationError) {
    // Hiển thị lỗi thông thường
    return (
      <div className="mb-4 p-3 rounded-md bg-red-900/20 border border-red-800/30">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  // Hiển thị lỗi email validation với thông tin chi tiết hơn
  return (
    <div className="mb-4 p-4 rounded-md bg-red-900/20 border border-red-800/30">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-2">
          <div className="font-medium text-red-400">
            Email không được phép truy cập
          </div>
          <div className="text-sm text-red-300">
            {email && (
              <p className="mb-2">
                Email <span className="font-mono bg-red-900/30 px-1 rounded">{email}</span> không có trong danh sách được phê duyệt.
              </p>
            )}
            <p>
              Hệ thống chỉ cho phép các email đã được đăng ký trước. 
              Vui lòng liên hệ quản trị viên để được cấp quyền truy cập.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailValidationError;