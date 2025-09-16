import { selectAll, selectOne, execute } from "../helpers/queryHelpers";

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
};

export type ListStudentsParams = {
  teacherId: string;
  classId?: string; // optional class filter
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
  constructor(private readonly deps: StudentRepoDeps) {}

  /**
   * List students for a given teacher.
   *
   * Ownership scope: Only students who appear in any ClassStudent row for a class owned by `teacherId`.
   *
   * Optional filter:
   * - classId: limit to students who are/used-to-be in the specified class (regardless of leftAt state).
   *
   * Returns basic student fields with parent display fields (parentName, parentPhone).
   */
  async listByTeacher(params: ListStudentsParams): Promise<StudentRow[]> {
    const binds: unknown[] = [params.teacherId];
    let where = "WHERE c.teacherId = ?";
    if (params.classId) {
      where += " AND cs.classId = ?";
      binds.push(params.classId);
    }
    const sql = `
      SELECT DISTINCT
        s.id,
        s.name,
        s.phone AS phone,
        s.email AS email,
        s.note,
        s.createdAt,
        p.name AS parentName,
        p.phone AS parentPhone
      FROM Student s
      LEFT JOIN Parent p ON p.id = s.parentId
      INNER JOIN ClassStudent cs ON cs.studentId = s.id
      INNER JOIN Class c ON c.id = cs.classId
      ${where}
      ORDER BY s.createdAt DESC
    `;
    return await selectAll<StudentRow>(this.deps.db, sql, binds);
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
    // Parent linkage will be handled by service; repository focuses on Student row
    parentIdInternal?: string | null;
  }): Promise<void> {
    const sql = `
      INSERT INTO Student (id, name, phone, email, parentId, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await execute(this.deps.db, sql, [
      input.id,
      input.name,
      input.phone ?? null,
      input.email ?? null,
      input.parentIdInternal ?? null,
      input.note ?? null,
    ]);
  }

  /**
   * Get a student by id, scoped by teacher ownership.
   *
   * Returns null if the student does not exist or is not visible under the teacher's classes.
   */
  async getById(id: string, teacherId: string): Promise<StudentRow | null> {
    const sql = `
      SELECT s.id, s.name, s.phone AS phone, s.email AS email, s.note, s.createdAt,
             p.name AS parentName, p.phone AS parentPhone
      FROM Student s
      LEFT JOIN Parent p ON p.id = s.parentId
      WHERE s.id = ?
        AND EXISTS (
          SELECT 1 FROM ClassStudent cs
          JOIN Class c ON c.id = cs.classId
          WHERE cs.studentId = s.id AND c.teacherId = ?
        )
      LIMIT 1
    `;
    const row = await selectOne<StudentRow>(this.deps.db, sql, [id, teacherId]);
    return row ?? null;
  }

  /**
   * Update mutable fields on a Student row.
   *
   * Only applies the update if the student is visible under the teacher's classes (ownership scope).
   */
  async update(id: string, teacherId: string, patch: Partial<{ name: string; email: string | null; phone: string | null; note: string | null }>): Promise<void> {
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
      WHERE id = ?
        AND EXISTS (
          SELECT 1 FROM ClassStudent cs
          JOIN Class c ON c.id = cs.classId
          WHERE cs.studentId = Student.id AND c.teacherId = ?
        )
    `;
    binds.push(id, teacherId);
    await execute(this.deps.db, sql, binds);
  }

  /**
   * Delete a student row.
   *
   * Business rules enforced at repository level:
   * - Reject if any membership history exists in ClassStudent (ever joined any class).
   * - Reject if any Attendance exists for the student.
   * - Reject if the requester (teacherId) has no related class membership linked to the student.
   */
  async delete(id: string, teacherId: string): Promise<void> {
    // Only allow delete if the student has no membership history and no attendance
    const hasMembershipEver = await selectOne<{ one: number }>(
      this.deps.db,
      `SELECT 1 AS one FROM ClassStudent WHERE studentId = ? LIMIT 1`,
      [id]
    );
    if (hasMembershipEver) {
      throw new Error("STUDENT_HAS_MEMBERSHIP_HISTORY");
    }

    const hasAttendance = await selectOne<{ one: number }>(
      this.deps.db,
      `SELECT 1 AS one FROM Attendance WHERE studentId = ? LIMIT 1`,
      [id]
    );
    if (hasAttendance) {
      throw new Error("STUDENT_HAS_ATTENDANCE");
    }

    await execute(this.deps.db, `DELETE FROM Student WHERE id = ?`, [id]);
  }

  /**
   * Check if a duplicate student exists by `(name OR phone OR email)`.
   *
   * Caller should decide exact duplicate policy; this method exposes a simple presence check.
   */
  async existsDuplicate(params: { name: string; phone?: string | null; email?: string | null }): Promise<boolean> {
    const where: string[] = ["name = ?"]; const binds: unknown[] = [params.name];
    if (params.phone) { where.push(`phone = ?`); binds.push(params.phone); }
    if (params.email) { where.push(`email = ?`); binds.push(params.email); }
    const sql = `SELECT 1 AS one FROM Student WHERE ${where.join(" OR ")} LIMIT 1`;
    const row = await selectOne<{ one: number }>(this.deps.db, sql, binds);
    return row != null;
  }
}
