// Auth service: separates domain logic from transport
// - Responsible for verifying credentials against D1
// - Issuing JWT payloads (actual signing handled by jwt.ts)

import type { JwtPayload } from "./jwt";

export type User = {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  createdAt: string;
};

export interface AuthDeps {
  db: D1Database;
}

export class AuthService {
  constructor(private readonly deps: AuthDeps) {}

  async findUserByEmail(email: string): Promise<User | null> {
    const stmt = this.deps.db.prepare(
      "SELECT id, email, password_hash, name, createdAt FROM User WHERE email = ? LIMIT 1"
    );
    const row = await stmt.bind(email).first<User>();
    return row ?? null;
  }

  async verifyCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.findUserByEmail(email);
    if (!user) return null;

    const ok = await verifyPassword(password, user.password_hash);
    return ok ? user : null;
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

  async createUser(params: { id?: string; email: string; password: string; name?: string | null }): Promise<User> {
    const exists = await this.findUserByEmail(params.email);
    if (exists) throw new Error("Email already registered");

    const id = params.id ?? crypto.randomUUID();
    const password_hash = await hashPassword(params.password);
    const name = params.name ?? null;

    await this.deps.db
      .prepare("INSERT INTO User (id, email, password_hash, name) VALUES (?, ?, ?, ?)")
      .bind(id, params.email, password_hash, name)
      .run();

    const row = await this.deps.db
      .prepare("SELECT id, email, password_hash, name, createdAt FROM User WHERE id = ?")
      .bind(id)
      .first<User>();
    if (!row) throw new Error("Failed to load created user");
    return row;
  }
}

// Simple password verification strategy
// Supports either plain text (dev only) or sha256:<hex> format
async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
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
