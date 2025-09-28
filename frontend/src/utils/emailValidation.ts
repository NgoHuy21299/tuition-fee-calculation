import bcrypt from 'bcryptjs';

/**
 * Kiểm tra xem email có được phép đăng nhập/đăng ký hay không
 * bằng cách so sánh hash bcrypt với danh sách cho phép trong env
 */
export class EmailValidator {
  private static allowedHashes: string[] | null = null;

  /**
   * Lấy danh sách hash được phép từ environment variable
   */
  private static getAllowedHashes(): string[] {
    if (this.allowedHashes === null) {
      const envHashes = import.meta.env.VITE_LOGIN_ACCEPT_ACCOUNTS as string;
      if (!envHashes) {
        console.warn('VITE_LOGIN_ACCEPT_ACCOUNTS không được cấu hình');
        this.allowedHashes = [];
      } else {
        this.allowedHashes = envHashes.split(';').filter((hash: string) => hash.trim());
      }
    }
    return this.allowedHashes || [];
  }

  /**
   * Kiểm tra email có hợp lệ để đăng nhập/đăng ký hay không
   * @param email - Email cần kiểm tra
   * @returns Promise<boolean> - true nếu email được phép, false nếu không
   */
  static async isEmailAllowed(email: string): Promise<boolean> {
    const allowedHashes = this.getAllowedHashes();
    
    // Nếu không có hash nào được cấu hình, cho phép tất cả (fallback)
    if (allowedHashes.length === 0) {
      console.warn('Không có hash email nào được cấu hình - cho phép tất cả email');
      return true;
    }

    // Kiểm tra email với từng hash trong danh sách
    for (const hash of allowedHashes) {
      try {
        const isMatch = await bcrypt.compare(email.toLowerCase().trim(), hash);
        if (isMatch) {
          return true;
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra hash bcrypt:', error);
      }
    }

    return false;
  }

  /**
   * Kiểm tra và throw error nếu email không được phép
   * @param email - Email cần kiểm tra
   * @throws Error - Nếu email không được phép
   */
  static async validateEmailOrThrow(email: string): Promise<void> {
    const isAllowed = await this.isEmailAllowed(email);
    if (!isAllowed) {
      throw new Error('Email này không được phép đăng nhập/đăng ký vào hệ thống');
    }
  }

  /**
   * Reset cache - hữu ích cho testing
   */
  static resetCache(): void {
    this.allowedHashes = null;
  }
}