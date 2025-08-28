import type { User } from "../types/user";
import { selectOne, execute } from "../helpers/queryHelpers";

export type UserRepoDeps = { db: D1Database };

export class UserRepository {
  constructor(private readonly deps: UserRepoDeps) {}

  async getByNormalizedEmail(normalizedEmail: string): Promise<User | null> {
    const sql =
      "SELECT id, email, normalizedEmail, password_hash, name, createdAt FROM User WHERE normalizedEmail = ? LIMIT 1";
    const row = await selectOne<User>(this.deps.db, sql, [normalizedEmail]);
    return row ?? null;
  }

  async getById(id: string): Promise<User | null> {
    const sql =
      "SELECT id, email, normalizedEmail, password_hash, name, createdAt FROM User WHERE id = ? LIMIT 1";
    const row = await selectOne<User>(this.deps.db, sql, [id]);
    return row ?? null;
  }

  async insert(user: {
    id: string;
    email: string;
    normalizedEmail: string;
    password_hash: string;
    name: string | null;
  }): Promise<void> {
    const sql =
      "INSERT INTO User (id, email, normalizedEmail, password_hash, name) VALUES (?, ?, ?, ?, ?)";
    await execute(this.deps.db, sql, [
      user.id,
      user.email,
      user.normalizedEmail,
      user.password_hash,
      user.name,
    ]);
  }

  async updatePasswordHash(id: string, password_hash: string): Promise<void> {
    const sql = "UPDATE User SET password_hash = ? WHERE id = ?";
    await execute(this.deps.db, sql, [password_hash, id]);
  }
}
