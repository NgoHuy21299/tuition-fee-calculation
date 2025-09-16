import { execute } from "../helpers/queryHelpers";

export type ParentRepoDeps = { db: D1Database };

export class ParentRepository {
  constructor(private readonly deps: ParentRepoDeps) {}

  async create(input: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    note?: string | null;
  }): Promise<void> {
    const sql = `
      INSERT INTO Parent (id, name, phone, email, note, createdAt)
      VALUES (?, ?, ?, ?, ?, COALESCE(datetime('now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')))
    `;
    await execute(this.deps.db, sql, [
      input.id,
      input.name,
      input.phone ?? null,
      input.email ?? null,
      input.note ?? null,
    ]);
  }
}
