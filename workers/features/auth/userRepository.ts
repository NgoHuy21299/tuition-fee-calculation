import { execute, selectAll, selectOne } from "../../helpers/queryHelpers";
import type { User } from "./userType";
import type { D1Database } from "@cloudflare/workers-types";

export type UserRepoDeps = { db: D1Database };

export class UserRepository {
  constructor(private readonly deps: UserRepoDeps) {}

  async isExistedNormalizedEmail(normalizedEmail: string): Promise<boolean> {
    const sql = "SELECT 1 AS one FROM User WHERE normalizedEmail = ? LIMIT 1";
    const row = await selectOne<{ one: number }>(this.deps.db, sql, [normalizedEmail]);
    return row != null;
  }

  async getByNormalizedEmail(normalizedEmail: string): Promise<User | null> {
    const sql =
      "SELECT id, email, normalizedEmail, password_hash, name FROM User WHERE normalizedEmail = ? LIMIT 1";
    const row = await selectOne<User>(this.deps.db, sql, [normalizedEmail]);
    return row ?? null;
  }

  async getById(id: string): Promise<User | null> {
    const sql =
      "SELECT id, email, normalizedEmail, password_hash, name FROM User WHERE id = ? LIMIT 1";
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

  /**
   * Fetch minimal user info for a list of IDs
   */
  async getByIds(ids: string[]): Promise<Array<Pick<User, "id" | "name">>> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const sql = `
      SELECT id, name
      FROM User
      WHERE id IN (${placeholders})
    `;
    return await selectAll<Pick<User, "id" | "name">>(this.deps.db, sql, ids);
  }
}
