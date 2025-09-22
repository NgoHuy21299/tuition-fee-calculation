import { selectAll, selectOne, execute } from "../../helpers/queryHelpers";
import { ParentRepository } from "./parentRepository";

export type StudentRepoDeps = { db: D1Database };

export type StudentRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  createdAt: string;
  parentName?: string | null;
  parentPhone?: string | null;
  currentClasses?: string | null;
};

export type ListStudentsParams = {
  teacherId: string;
  classId?: string; // optional class filter
};

export type StudentDetail = {
  student: StudentRow;
  parents: Array<{
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    note: string | null;
    relationship: string | null;
  }>;
  classes: Array<{
    id: string;
    name: string;
    subject: string | null;
    description: string | null;
    defaultFeePerSession: number | null;
    isActive: number;
    createdAt: string;
    classStudentId: string;
    joinedAt: string;
    leftAt: string | null;
    unitPriceOverride: number | null;
  }>;
};

/**
 * StudentRepository
 * Low-level data access for Student and related lookups.
 *
 * Important conventions:
 * - All read/update operations are scoped by teacher ownership via join to Class -> teacherId.
 * - Contact fields are standardized as `phone` and `email`.
 * - Parent linkage is handled by services; repository only accepts an internal `parentIdInternal` when inserting.
 */
export class StudentRepository {
  private readonly parentRepo: ParentRepository;

  constructor(private readonly deps: StudentRepoDeps) {
    this.parentRepo = new ParentRepository({ db: deps.db });
  }

  /**
   * Check if the given student belongs to the teacher (ownership).
   */
  async isOwner(id: string, teacherId: string): Promise<boolean> {
    const row = await selectOne<{ one: number }>(
      this.deps.db,
      `SELECT 1 AS one FROM Student WHERE id = ? AND createdByTeacher = ? LIMIT 1`,
      [id, teacherId]
    );
    return row != null;
  }

  /**
   * List students for a given teacher.
   *
   * Ownership scope: Only students who appear in any ClassStudent row for a class owned by `teacherId`.
   *
   * Optional filter:
   * - classId: limit to students who are/used-to-be in the specified class (regardless of leftAt state).
   *
   * Returns basic student fields (no parent fields). Parent/class details are provided by getDetailById().
   */
  async listByTeacher(params: ListStudentsParams): Promise<StudentRow[]> {
    if (!params.classId) {
      // Simple path: list by owner
      const sql = `
        SELECT s.id,
               s.name,
               s.phone AS phone,
               s.email AS email,
               s.note,
               s.createdAt,
               (
                 SELECT GROUP_CONCAT(c.name, ', ')
                 FROM ClassStudent cs
                 JOIN Class c ON c.id = cs.classId
                 WHERE cs.studentId = s.id
                   AND cs.leftAt IS NULL
                   AND c.teacherId = s.createdByTeacher
               ) AS currentClasses
        FROM Student s
        WHERE s.createdByTeacher = ?
        ORDER BY s.id DESC
      `;
      return await selectAll<StudentRow>(this.deps.db, sql, [params.teacherId]);
    } else {
      const sql = `
        SELECT DISTINCT s.id, s.name, s.phone AS phone, s.email AS email, s.note, s.createdAt
        FROM Student s
        JOIN ClassStudent cs ON cs.studentId = s.id
        WHERE s.createdByTeacher = ? AND cs.classId = ? AND cs.leftAt IS NULL
        ORDER BY s.id DESC
      `;
      return await selectAll<StudentRow>(this.deps.db, sql, [
        params.teacherId,
        params.classId,
      ]);
    }
  }

  /**
   * Create a Student row.
   *
   * Notes:
   * - `parentIdInternal` should be supplied by service layer if inline Parent creation occurs first.
   * - No ownership check at repo layer; caller must ensure authorization.
   */
  async create(input: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    note?: string | null;
    createdByTeacher: string;
  }): Promise<void> {
    const sql = `
      INSERT INTO Student (id, name, phone, email, note, createdAt, createdByTeacher)
      VALUES (?, ?, ?, ?, ?, COALESCE(datetime('now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')), ?)
    `;
    await execute(this.deps.db, sql, [
      input.id,
      input.name,
      input.phone ?? null,
      input.email ?? null,
      input.note ?? null,
      input.createdByTeacher,
    ]);
  }

  /**
   * Get a student by id, scoped by teacher ownership.
   *
   * Returns null if the student does not exist or is not visible under the teacher's classes.
   */
  async getById(id: string, teacherId: string): Promise<StudentRow | null> {
    const sql = `
      SELECT s.id, s.name, s.phone AS phone, s.email AS email, s.note, s.createdAt
      FROM Student s
      WHERE s.id = ? AND s.createdByTeacher = ?
      LIMIT 1
    `;
    const row = await selectOne<StudentRow>(this.deps.db, sql, [id, teacherId]);
    return row ?? null;
  }

  /**
   * Detailed student fetch: includes basic student row, parent details, and classes this student has (past and present).
   */
  async getDetailById(
    id: string,
    teacherId: string
  ): Promise<StudentDetail | null> {
    // Ensure visibility by teacher ownership (via createdByTeacher)
    const base = await this.getById(id, teacherId);
    if (!base) return null;

    // Parent details (multiple parents relation in new schema)
    const parents = await this.parentRepo.getByStudentId(id);

    // Classes list for this student (ownership already verified via createdByTeacher)
    const classes = await selectAll<{
      id: string;
      name: string;
      subject: string | null;
      description: string | null;
      defaultFeePerSession: number | null;
      isActive: number;
      createdAt: string;
      classStudentId: string;
      joinedAt: string;
      leftAt: string | null;
      unitPriceOverride: number | null;
    }>(
      this.deps.db,
      `SELECT c.id, c.name, c.subject, c.description, c.defaultFeePerSession, c.isActive, c.createdAt,
              cs.id AS classStudentId, cs.joinedAt, cs.leftAt, cs.unitPriceOverride
       FROM ClassStudent cs
       JOIN Class c ON c.id = cs.classId
       WHERE cs.studentId = ?
       ORDER BY cs.joinedAt DESC`,
      [id]
    );

    const parentDtos = (parents ?? []).map((p: any) => ({
      id: p.id,
      name: p.name ?? null,
      phone: p.phone ?? null,
      email: p.email ?? null,
      note: p.note ?? null,
      relationship: p.relationship ?? null,
    }));

    return { student: base, parents: parentDtos, classes: classes ?? null };
  }

  /**
   * Update mutable fields on a Student row.
   *
   * Only applies the update if the student is visible under the teacher's classes (ownership scope).
   */
  async update(
    id: string,
    teacherId: string,
    patch: Partial<{
      name: string;
      email: string | null;
      phone: string | null;
      note: string | null;
    }>
  ): Promise<void> {
    const sets: string[] = [];
    const binds: unknown[] = [];

    if (patch.name !== undefined) {
      sets.push("name = ?");
      binds.push(patch.name);
    }
    if (patch.phone !== undefined) {
      sets.push(`phone = ?`);
      binds.push(patch.phone);
    }
    if (patch.email !== undefined) {
      sets.push(`email = ?`);
      binds.push(patch.email);
    }
    if (patch.note !== undefined) {
      sets.push("note = ?");
      binds.push(patch.note);
    }

    if (sets.length === 0) return;

    const sql = `
      UPDATE Student SET ${sets.join(", ")}
      WHERE id = ? AND createdByTeacher = ?
    `;
    binds.push(id, teacherId);
    await execute(this.deps.db, sql, binds);
  }

  /**
   * Delete a student row scoped by teacher ownership.
   *
   * Note: Caller (service layer) must perform any business-rule checks and authorization.
   */
  async delete(id: string, teacherId: string): Promise<void> {
    await execute(
      this.deps.db,
      `DELETE FROM Student WHERE id = ? AND createdByTeacher = ?`,
      [id, teacherId]
    );
  }

  /**
   * Check if a duplicate student exists by `(name OR phone OR email)`.
   *
   * Caller should decide exact duplicate policy; this method exposes a simple presence check.
   */
  async existsDuplicate(params: {
    teacherId: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  }): Promise<boolean> {
    const conds: string[] = [];
    const binds: unknown[] = [params.teacherId];
    conds.push("name = ?");
    binds.push(params.name);
    if (params.phone) {
      conds.push(`phone = ?`);
      binds.push(params.phone);
    }
    if (params.email) {
      conds.push(`email = ?`);
      binds.push(params.email);
    }
    const where = conds.length ? ` AND (${conds.join(" OR ")})` : "";
    const sql = `SELECT 1 AS one FROM Student WHERE createdByTeacher = ?${where} LIMIT 1`;
    const row = await selectOne<{ one: number }>(this.deps.db, sql, binds);
    return row != null;
  }
}
