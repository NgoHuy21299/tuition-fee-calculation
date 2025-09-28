import bcrypt from 'bcryptjs';

export class ServerEmailValidator {
  /**
   * Validate email against allowed hashes from environment
   */
  static async validateEmailOrThrow(email: string, env: Env): Promise<void> {
    const allowedHashes = (env.WORKER_LOGIN_ACCEPT_ACCOUNTS ?? '').split(';').filter((hash: string) => hash.trim());
    
    if (allowedHashes.length === 0) {
      // No hashes configured - allow all (fallback)
      return;
    }

    const emailLower = email.toLowerCase().trim();
    
    for (const hash of allowedHashes) {
      try {
        const isMatch = await bcrypt.compare(emailLower, hash);
        if (isMatch) {
          return; // Email is allowed
        }
      } catch (error) {
        // Continue checking other hashes if one fails
        continue;
      }
    }

    // No hash matched - throw error
    throw new Error('EMAIL_NOT_ALLOWED');
  }
}