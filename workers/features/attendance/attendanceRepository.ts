import type { D1Database } from "@cloudflare/workers-types";
import { selectOne, selectAll } from "../../helpers/queryHelpers";

export type AttendanceRepoDeps = { db: D1Database };

// Type definitions for attendance data
export type AttendanceRow = {
  id: string;
  sessionId: string;
  studentId: string;
  status: "present" | "absent" | "late";
  note: string | null;
  markedBy: string | null;
  markedAt: string;
  feeOverride: number | null;
};

export interface CreateAttendanceRow {
  id: string;
  sessionId: string;
  studentId: string;
  status: "present" | "absent" | "late";
  note: string | null;
  markedBy: string | null;
  feeOverride: number | null;
}

export interface UpdateAttendanceRow {
  status?: "present" | "absent" | "late";
  note?: string | null;
  feeOverride?: number | null;
  markedBy?: string | null;
}

export interface AttendanceWithStudentRow extends AttendanceRow {
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
}

export interface AttendanceWithSessionRow extends AttendanceRow {
  sessionStartTime: string;
  sessionDurationMin: number;
  className: string | null;
  classSubject: string | null;
}

/**
 * Attendance repository for managing attendance records
 *
 * Provides comprehensive attendance management including:
 * - CRUD operations for attendance records
 * - Bulk operations for session attendance
 * - Queries with student and session information
 * - Statistics and reporting data
 */
export class AttendanceRepository {
  constructor(private readonly deps: AttendanceRepoDeps) {}

  /**
   * Check if a student has any attendance record
   * Used by student service to prevent deletion of students with attendance history
   */
  async hasAnyAttendance(params: { studentId: string }): Promise<boolean> {
    const sql = `SELECT 1 AS one FROM Attendance WHERE studentId = ? LIMIT 1`;
    const row = await selectOne<{ one: number }>(this.deps.db, sql, [
      params.studentId,
    ]);
    return row != null;
  }

  /**
   * Check if a session has any attendance records
   * Used by session service to prevent deletion/cancellation of sessions with attendance
   */
  async hasAttendanceForSession(sessionId: string): Promise<boolean> {
    const sql = `SELECT 1 AS one FROM Attendance WHERE sessionId = ? LIMIT 1`;
    const row = await selectOne<{ one: number }>(this.deps.db, sql, [
      sessionId,
    ]);
    return row != null;
  }

  /**
   * Check if a session has any non-absent attendance records
   * This is used to determine whether a session is considered to have attendance
   * for cancellation rules (only block cancel if there exists any status other than 'absent').
   */
  async hasNonAbsentAttendanceForSession(sessionId: string): Promise<boolean> {
    const sql = `SELECT 1 AS one FROM Attendance WHERE sessionId = ? AND status != 'absent' LIMIT 1`;
    const row = await selectOne<{ one: number }>(this.deps.db, sql, [sessionId]);
    return row != null;
  }

  /**
   * Check if multiple sessions have attendance records
   * Used for batch operations on sessions
   */
  async getSessionsWithAttendance(sessionIds: string[]): Promise<string[]> {
    if (sessionIds.length === 0) return [];

    const placeholders = sessionIds.map(() => "?").join(",");
    const sql = `SELECT DISTINCT sessionId FROM Attendance WHERE sessionId IN (${placeholders})`;
    const results = await selectAll<{ sessionId: string }>(
      this.deps.db,
      sql,
      sessionIds
    );
    return results.map((r) => r.sessionId);
  }

  /**
   * Get attendance records for a session with student information
   * Used for attendance management UI
   */
  async findBySession({
    sessionId,
    teacherId,
  }: {
    sessionId: string;
    teacherId: string;
  }): Promise<AttendanceWithStudentRow[]> {
    const sql = `
      SELECT 
        a.id, a.sessionId, a.studentId, a.status, a.note, a.markedBy, a.markedAt, a.feeOverride,
        s.name as studentName, s.email as studentEmail, s.phone as studentPhone
      FROM Attendance a
      INNER JOIN Student s ON a.studentId = s.id
      INNER JOIN Session sess ON a.sessionId = sess.id
      WHERE a.sessionId = ? AND sess.teacherId = ?
      ORDER BY s.name ASC
    `;
    return await selectAll<AttendanceWithStudentRow>(this.deps.db, sql, [
      sessionId,
      teacherId,
    ]);
  }

  /**
   * Find attendance records by multiple session IDs (for reports)
   */
  async findBySessionIds({
    sessionIds,
    teacherId,
  }: {
    sessionIds: string[];
    teacherId: string;
  }): Promise<AttendanceRow[]> {
    if (sessionIds.length === 0) {
      return [];
    }

    const placeholders = sessionIds.map(() => '?').join(', ');
    const sql = `
      SELECT a.id, a.sessionId, a.studentId, a.status, a.note, a.markedBy, a.markedAt, a.feeOverride
      FROM Attendance a
      INNER JOIN Session s ON a.sessionId = s.id
      WHERE a.sessionId IN (${placeholders})
        AND s.teacherId = ?
        AND s.status = 'completed'
        AND a.status IN ('present', 'late')`;

    return await selectAll<AttendanceRow>(this.deps.db, sql, [
      ...sessionIds,
      teacherId,
    ]);
  }

  /**
   * Get attendance history for a student with session information
   * Used for student attendance reports
   */
  async findByStudent({
    studentId,
    teacherId,
    classId,
    fromDate,
    toDate,
  }: {
    studentId: string;
    teacherId: string;
    classId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<AttendanceWithSessionRow[]> {
    let sql = `
      SELECT 
        a.id, a.sessionId, a.studentId, a.status, a.note, a.markedBy, a.markedAt, a.feeOverride,
        sess.startTime as sessionStartTime, sess.durationMin as sessionDurationMin,
        c.name as className, c.subject as classSubject
      FROM Attendance a
      INNER JOIN Session sess ON a.sessionId = sess.id
      LEFT JOIN Class c ON sess.classId = c.id
      WHERE a.studentId = ? AND sess.teacherId = ?
    `;

    const params: any[] = [studentId, teacherId];

    if (classId) {
      sql += ` AND sess.classId = ?`;
      params.push(classId);
    }

    if (fromDate) {
      sql += ` AND sess.startTime >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      sql += ` AND sess.startTime <= ?`;
      params.push(toDate);
    }

    sql += ` ORDER BY sess.startTime DESC`;

    return await selectAll<AttendanceWithSessionRow>(this.deps.db, sql, params);
  }

  /**
   * Create a single attendance record
   */
  async create(attendance: CreateAttendanceRow): Promise<void> {
    const sql = `
      INSERT INTO Attendance (id, sessionId, studentId, status, note, markedBy, feeOverride)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.deps.db
      .prepare(sql)
      .bind(
        attendance.id,
        attendance.sessionId,
        attendance.studentId,
        attendance.status,
        attendance.note,
        attendance.markedBy,
        attendance.feeOverride
      )
      .run();
  }

  /**
   * Bulk upsert attendance records for a session
   * Uses INSERT OR REPLACE to handle both create and update scenarios
   */
  async bulkUpsert(attendanceRecords: CreateAttendanceRow[]): Promise<void> {
    if (attendanceRecords.length === 0) return;

    const sql = `
      INSERT OR REPLACE INTO Attendance (id, sessionId, studentId, status, note, markedBy, feeOverride, markedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    // Execute all inserts in a transaction-like manner
    for (const record of attendanceRecords) {
      await this.deps.db
        .prepare(sql)
        .bind(
          record.id,
          record.sessionId,
          record.studentId,
          record.status,
          record.note,
          record.markedBy,
          record.feeOverride
        )
        .run();
    }
  }

  /**
   * Update an existing attendance record
   */
  async update({
    id,
    updates,
    teacherId,
  }: {
    id: string;
    updates: UpdateAttendanceRow;
    teacherId: string;
  }): Promise<boolean> {
    const setParts: string[] = [];
    const params: any[] = [];

    if (updates.status !== undefined) {
      setParts.push("status = ?");
      params.push(updates.status);
    }

    if (updates.note !== undefined) {
      setParts.push("note = ?");
      params.push(updates.note);
    }

    if (updates.feeOverride !== undefined) {
      setParts.push("feeOverride = ?");
      params.push(updates.feeOverride);
    }

    if (updates.markedBy !== undefined) {
      setParts.push("markedBy = ?");
      params.push(updates.markedBy);
    }

    if (setParts.length === 0) return false;

    setParts.push("markedAt = datetime('now')");

    const sql = `
      UPDATE Attendance 
      SET ${setParts.join(", ")}
      WHERE id = ? 
        AND EXISTS (
          SELECT 1 FROM Session s 
          WHERE s.id = Attendance.sessionId AND s.teacherId = ?
        )
    `;

    params.push(id, teacherId);

    const res = await this.deps.db
      .prepare(sql)
      .bind(...params)
      .run();
    return (res.meta?.changes || 0) > 0;
  }

  /**
   * Delete an attendance record (with ownership check)
   */
  async delete({
    id,
    teacherId,
  }: {
    id: string;
    teacherId: string;
  }): Promise<boolean> {
    const sql = `
      DELETE FROM Attendance 
      WHERE id = ? 
        AND EXISTS (
          SELECT 1 FROM Session s 
          WHERE s.id = Attendance.sessionId AND s.teacherId = ?
        )
    `;

    const res = await this.deps.db.prepare(sql).bind(id, teacherId).run();
    return (res.meta?.changes || 0) > 0;
  }

  /**
   * Get attendance by ID with ownership check
   */
  async findById({
    id,
    teacherId,
  }: {
    id: string;
    teacherId: string;
  }): Promise<AttendanceRow | null> {
    const sql = `
      SELECT a.id, a.sessionId, a.studentId, a.status, a.note, a.markedBy, a.markedAt, a.feeOverride
      FROM Attendance a
      INNER JOIN Session s ON a.sessionId = s.id
      WHERE a.id = ? AND s.teacherId = ?
    `;

    return await selectOne<AttendanceRow>(this.deps.db, sql, [id, teacherId]);
  }

  /**
   * Get attendance statistics for reporting
   */
  async getAttendanceStats({
    classId,
    studentId,
    teacherId,
    fromDate,
    toDate,
  }: {
    classId?: string;
    studentId?: string;
    teacherId: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    totalSessions: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
  }> {
    let sql = `
      SELECT 
        COUNT(*) as totalSessions,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as presentCount,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absentCount,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as lateCount
      FROM Attendance a
      INNER JOIN Session s ON a.sessionId = s.id
      WHERE s.teacherId = ? AND s.status = 'completed'
    `;

    const params: any[] = [teacherId];

    if (studentId) {
      sql += ` AND a.studentId = ?`;
      params.push(studentId);
    }

    if (classId) {
      sql += ` AND s.classId = ?`;
      params.push(classId);
    }

    if (fromDate) {
      sql += ` AND s.startTime >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      sql += ` AND s.startTime <= ?`;
      params.push(toDate);
    }

    const result = await selectOne<{
      totalSessions: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
    }>(this.deps.db, sql, params);

    return (
      result || {
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
      }
    );
  }

  /**
   * Get all attendance records for a specific session (basic version)
   * Useful for session details and attendance management
   */
  async getAttendanceBySession(sessionId: string): Promise<AttendanceRow[]> {
    const sql = `
      SELECT 
        id, sessionId, studentId, status, note, markedBy, markedAt, feeOverride
      FROM Attendance 
      WHERE sessionId = ?
      ORDER BY markedAt DESC
    `;
    return await selectAll<AttendanceRow>(this.deps.db, sql, [sessionId]);
  }

  /**
   * Get all attendance records for a specific student (basic version)
   * Useful for student attendance history
   */
  async getAttendanceByStudent(studentId: string): Promise<AttendanceRow[]> {
    const sql = `
      SELECT 
        id, sessionId, studentId, status, note, markedBy, markedAt, feeOverride
      FROM Attendance 
      WHERE studentId = ?
      ORDER BY markedAt DESC
    `;
    return await selectAll<AttendanceRow>(this.deps.db, sql, [studentId]);
  }
}
