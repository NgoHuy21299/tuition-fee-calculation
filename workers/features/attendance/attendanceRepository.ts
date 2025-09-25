import type { D1Database } from "@cloudflare/workers-types";
import { selectOne, selectAll } from "../../helpers/queryHelpers";

export type AttendanceRepoDeps = { db: D1Database };

/**
 * Attendance repository for managing attendance records
 * 
 * Provides methods for checking attendance records needed by:
 * - Student management (checking if student has any attendance before deletion)
 * - Session management (checking if session has attendance before deletion/cancellation)
 */
export class AttendanceRepository {
  constructor(private readonly deps: AttendanceRepoDeps) {}

  /**
   * Check if a student has any attendance record
   * Used by student service to prevent deletion of students with attendance history
   * 
   * @param studentId - ID of the student to check
   * @returns Promise<boolean> - true if student has attendance records
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
   * 
   * @param sessionId - ID of the session to check
   * @returns Promise<boolean> - true if session has attendance records
   */
  async hasAttendanceForSession(sessionId: string): Promise<boolean> {
    const sql = `SELECT 1 AS one FROM Attendance WHERE sessionId = ? LIMIT 1`;
    const row = await selectOne<{ one: number }>(this.deps.db, sql, [sessionId]);
    return row != null;
  }

  /**
   * Check if multiple sessions have attendance records
   * Used for batch operations on sessions
   * 
   * @param sessionIds - Array of session IDs to check
   * @returns Promise<string[]> - Array of session IDs that have attendance
   */
  async getSessionsWithAttendance(sessionIds: string[]): Promise<string[]> {
    if (sessionIds.length === 0) return [];
    
    const placeholders = sessionIds.map(() => '?').join(',');
    const sql = `SELECT DISTINCT sessionId FROM Attendance WHERE sessionId IN (${placeholders})`;
    const results = await selectAll<{ sessionId: string }>(this.deps.db, sql, sessionIds);
    return results.map(r => r.sessionId);
  }

  /**
   * Get all attendance records for a specific session
   * Useful for session details and attendance management
   * 
   * @param sessionId - ID of the session
   * @returns Promise<AttendanceRow[]> - Array of attendance records
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
   * Get all attendance records for a specific student
   * Useful for student attendance history
   * 
   * @param studentId - ID of the student
   * @returns Promise<AttendanceRow[]> - Array of attendance records
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

// Type definitions for attendance data
export type AttendanceRow = {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent' | 'late';
  note: string | null;
  markedBy: string | null;
  markedAt: string;
  feeOverride: number | null;
};