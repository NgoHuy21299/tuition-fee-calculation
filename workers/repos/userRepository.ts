import type { User } from "../types/user";

export type UserRepoDeps = { db: D1Database };

export class UserRepository {
  constructor(private readonly deps: UserRepoDeps) {}

  async getByNormalizedEmail(normalizedEmail: string): Promise<User | null> {
    const stmt = this.deps.db.prepare(
      "SELECT id, email, normalizedEmail, password_hash, name, createdAt FROM User WHERE normalizedEmail = ? LIMIT 1",
    );
    const row = await stmt.bind(normalizedEmail).first<User>();
    return row ?? null;
  }

  async getById(id: string): Promise<User | null> {
    const row = await this.deps.db
      .prepare(
        "SELECT id, email, normalizedEmail, password_hash, name, createdAt FROM User WHERE id = ? LIMIT 1",
      )
      .bind(id)
      .first<User>();
    return row ?? null;
  }

  async insert(user: {
    id: string;
    email: string;
    normalizedEmail: string;
    password_hash: string;
    name: string | null;
  }): Promise<void> {
    await this.deps.db
      .prepare(
        "INSERT INTO User (id, email, normalizedEmail, password_hash, name) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(user.id, user.email, user.normalizedEmail, user.password_hash, user.name)
      .run();
  }

  async updatePasswordHash(id: string, password_hash: string): Promise<void> {
    await this.deps.db
      .prepare("UPDATE User SET password_hash = ? WHERE id = ?")
      .bind(password_hash, id)
      .run();
  }
}
