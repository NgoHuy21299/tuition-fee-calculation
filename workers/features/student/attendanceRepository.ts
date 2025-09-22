import { selectOne } from "../../helpers/queryHelpers";

export type AttendanceRepoDeps = { db: D1Database };

export class AttendanceRepository {
  constructor(private readonly deps: AttendanceRepoDeps) {}

  /**
   * Check if a student has any attendance record.
   */
  async hasAnyAttendance(params: { studentId: string }): Promise<boolean> {
    const sql = `SELECT 1 AS one FROM Attendance WHERE studentId = ? LIMIT 1`;
    const row = await selectOne<{ one: number }>(this.deps.db, sql, [
      params.studentId,
    ]);
    return row != null;
  }
}
