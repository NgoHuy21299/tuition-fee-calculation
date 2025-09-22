import { execute, selectAll } from "../../helpers/queryHelpers";

export type ParentRepoDeps = { db: D1Database };

export type ParentInput = {
  id: string;
  studentId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
  relationship?: string | null;
};

export class ParentRepository {
  constructor(private readonly deps: ParentRepoDeps) {}

  async create(input: ParentInput): Promise<void> {
    const sql = `
      INSERT INTO Parent (id, studentId, name, phone, email, note, relationship, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(datetime('now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')))
    `;
    await execute(this.deps.db, sql, [
      input.id,
      input.studentId,
      input.name,
      input.phone ?? null,
      input.email ?? null,
      input.note ?? null,
      input.relationship ?? null,
    ]);
  }

  async bulkCreate(inputs: ParentInput[]): Promise<void> {
    if (inputs.length === 0) return;
    
    const placeholders = inputs.map(() => `(?, ?, ?, ?, ?, ?, ?, COALESCE(datetime('now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')))`).join(', ');
    const sql = `
      INSERT INTO Parent (id, studentId, name, phone, email, note, relationship, createdAt)
      VALUES ${placeholders}
    `;
    
    const values: any[] = [];
    for (const input of inputs) {
      values.push(input.id, input.studentId, input.name, input.phone ?? null, input.email ?? null, input.note ?? null, input.relationship ?? null);
    }
    
    // Multi-row insert can report rows_written > number of logical rows (indexes also count).
    // Bump the per-run limit proportionally to the batch size to satisfy our dev guard.
    await execute(this.deps.db, sql, values, { maxRowsWritten: Math.max(10, inputs.length * 7) });
  }

  async getByStudentId(studentId: string): Promise<ParentInput[]> {
    const sql = `
      SELECT id, studentId, name, phone, email, note, relationship
      FROM Parent
      WHERE studentId = ?
    `;
    const results = await selectAll(this.deps.db, sql, [studentId]);
    return results.map((row: any) => ({
      id: row.id,
      studentId: row.studentId,
      name: row.name,
      phone: row.phone,
      email: row.email,
      note: row.note,
      relationship: row.relationship
    }));
  }

  async update(input: ParentInput): Promise<void> {
    const sql = `
      UPDATE Parent
      SET studentId = ?, name = ?, phone = ?, email = ?, note = ?, relationship = ?
      WHERE id = ?
    `;
    await execute(this.deps.db, sql, [
      input.studentId,
      input.name,
      input.phone ?? null,
      input.email ?? null,
      input.note ?? null,
      input.relationship ?? null,
      input.id
    ]);
  }

  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM Parent WHERE id = ?`;
    await execute(this.deps.db, sql, [id]);
  }
}
