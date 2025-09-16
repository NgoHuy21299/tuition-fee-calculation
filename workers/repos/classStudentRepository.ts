import { selectAll, selectOne, execute } from "../helpers/queryHelpers";

export type ClassStudentRepoDeps = { db: D1Database };

export type ClassStudentRow = {
  id: string;
  classId: string;
  studentId: string;
  unitPriceOverride: number | null;
  joinedAt: string;
  leftAt: string | null;
};

export type ListByClassParams = {
  classId: string | null;
};

/**
 * ClassStudentRepository
 * Low-level data access for membership between Class and Student.
 *
 * Conventions:
 * - A membership row exists per (classId, studentId); uniqueness enforced at DB by UNIQUE(classId, studentId).
 * - `leftAt` indicates the student has left the class but history is preserved.
 * - `isMember` only considers rows with `leftAt IS NULL`.
 */
export class ClassStudentRepository {
  constructor(private readonly deps: ClassStudentRepoDeps) {}

  /**
   * Add a student to a class.
   *
   * Does not check uniqueness here; caller should handle 409 on UNIQUE violation
   * or pre-check via `isMember`.
   */
  async add(input: { id: string; classId: string; studentId: string; unitPriceOverride?: number | null }): Promise<void> {
    const sql = `
      INSERT INTO ClassStudent (id, classId, studentId, unitPriceOverride)
      VALUES (?, ?, ?, ?)
    `;
    await execute(this.deps.db, sql, [
      input.id,
      input.classId,
      input.studentId,
      input.unitPriceOverride ?? null,
    ]);
  }

  /**
   * Mark a membership as left by setting `leftAt`.
   */
  async leave(params: { classStudentId: string; leftAt: string }): Promise<void> {
    const sql = `UPDATE ClassStudent SET leftAt = ? WHERE id = ?`;
    await execute(this.deps.db, sql, [params.leftAt, params.classStudentId]);
  }

  /**
   * List memberships for a class.
   *
   * If `classId` is null, return all membership rows.
   * No pagination applied.
   */
  async listByClass(params: ListByClassParams): Promise<ClassStudentRow[]> {
    const where = params.classId ? "WHERE classId = ?" : "";
    const binds: unknown[] = params.classId ? [params.classId] : [];
    const sql = `
      SELECT id, classId, studentId, unitPriceOverride, joinedAt, leftAt
      FROM ClassStudent
      ${where}
    `;
    return await selectAll<ClassStudentRow>(this.deps.db, sql, binds);
  }

  /**
   * Check if a student is currently a member of a class (leftAt IS NULL).
   */
  async isMember(params: { classId: string; studentId: string }): Promise<boolean> {
    const sql = `SELECT 1 AS one FROM ClassStudent WHERE classId = ? AND studentId = ? AND leftAt IS NULL LIMIT 1`;
    const row = await selectOne<{ one: number }>(this.deps.db, sql, [params.classId, params.studentId]);
    return row != null;
  }

  /**
   * Check if a student has any membership history across classes.
   */
  async hasAnyMembership(params: { studentId: string }): Promise<boolean> {
    const sql = `SELECT 1 AS one FROM ClassStudent WHERE studentId = ? LIMIT 1`;
    const row = await selectOne<{ one: number }>(this.deps.db, sql, [params.studentId]);
    return row != null;
  }
}
