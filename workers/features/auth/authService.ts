// Auth service: separates domain logic from transport
// - Responsible for verifying credentials against D1
// - Issuing JWT payloads (actual signing handled by jwt.ts)

import type { JwtPayload } from "./jwtService";
import type { User } from "./userType";
import { AppError } from "../../errors";
import { uuidv7 } from "uuidv7";
import { UserRepository } from "./userRepository";
import { CacheService } from "../../helpers/cacheService";

export interface AuthDeps {
  db: D1Database;
  kv?: KVNamespace;
}

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly cache?: CacheService;
  constructor(private readonly deps: AuthDeps) {
    this.userRepository = new UserRepository({ db: deps.db });
    this.cache = deps.kv ? new CacheService(deps.kv) : undefined;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const normalized = normalizeEmail(email);
    // Try cache first
    let cacheKey: string | undefined;
    if (this.cache) {
      cacheKey = CacheService.buildKey("auth", "userByEmail", { normalized });
      const cached = await this.cache.get<User | null>(cacheKey);
      if (cached) return cached;
    }

    const user = await this.userRepository.getByNormalizedEmail(normalized);
    if (this.cache && cacheKey) {
      await this.cache.set(cacheKey, user, { ttl: 300 });
    }
    return user;
  }

  async verifyCredentials(
    email: string,
    password: string
  ): Promise<User | null> {
    const user = await this.findUserByEmail(email);
    if (!user) return null;

    const ok = await verifyPassword(password, user.password_hash);
    return ok ? user : null;
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userRepository.getById(userId);
    if (!user) throw new AppError("RESOURCE_NOT_FOUND", "User not found", 404);

    const ok = await verifyPassword(oldPassword, user.password_hash);
    if (!ok) throw new AppError("AUTH_INVALID_OLD_PASSWORD");

    const newHash = await hashPassword(newPassword);
    await this.userRepository.updatePasswordHash(userId, newHash);

    // Invalidate all auth-related caches
    await this.invalidateAllAuthCaches();
  }

  buildJwtPayload(u: User, maxAgeSec: number): JwtPayload {
    const now = Math.floor(Date.now() / 1000);
    return {
      sub: u.id,
      email: u.email,
      exp: now + maxAgeSec,
      name: u.name ?? undefined,
    } as JwtPayload;
  }

  async createUser(params: {
    id?: string;
    email: string;
    password: string;
    name?: string | null;
  }): Promise<User> {
    const normalizedEmail = normalizeEmail(params.email);
    const exists = await this.userRepository.isExistedNormalizedEmail(
      normalizedEmail
    );
    if (exists) throw new AppError("AUTH_EMAIL_EXISTS");

    const id = uuidv7();
    const password_hash = await hashPassword(params.password);
    const name = params.name ?? null;

    await this.userRepository.insert({
      id,
      email: params.email,
      normalizedEmail,
      password_hash,
      name,
    });

    const row = await this.userRepository.getById(id);
    if (!row)
      throw new AppError(
        "RESOURCE_NOT_FOUND",
        "Failed to load created user",
        500
      );
    // Invalidate all auth-related caches
    await this.invalidateAllAuthCaches();
    return row;
  }

  /** Invalidate all auth-related caches */
  private async invalidateAllAuthCaches(): Promise<void> {
    if (!this.cache) return;
    await this.cache.deleteByPrefix('auth');
  }
}

// Simple password verification strategy
// Supports either plain text (dev only) or sha256:<hex> format
async function verifyPassword(
  plaintext: string,
  stored: string
): Promise<boolean> {
  if (stored.startsWith("sha256:")) {
    const hex = stored.slice("sha256:".length);
    const hash = await sha256Hex(plaintext);
    return timingSafeEqual(hex, hash);
  }
  // Fallback dev-mode plain text match
  return timingSafeEqual(stored, plaintext);
}

async function sha256Hex(data: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(data));
  const bytes = new Uint8Array(buf);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// Exported to be used by registration flow
export async function hashPassword(plaintext: string): Promise<string> {
  const hex = await sha256Hex(plaintext);
  return `sha256:${hex}`;
}

// Email normalization utility (trim + lowercase)
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
