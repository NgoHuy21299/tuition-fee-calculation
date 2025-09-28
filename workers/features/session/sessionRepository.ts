import type { D1Database } from "@cloudflare/workers-types";
import { selectAll, selectOne, execute } from "../../helpers/queryHelpers";

export interface SessionRow {
  id: string;
  classId: string | null;
  teacherId: string;
  startTime: string;
  durationMin: number;
  status: 'scheduled' | 'completed' | 'canceled';
  notes: string | null;
  feePerSession: number | null;
  type: 'class' | 'ad_hoc';
  seriesId: string | null;
  createdAt: string;
}

export interface CreateSessionRow {
  id: string;
  classId: string | null;
  teacherId: string;
  startTime: string;
  durationMin: number;
  status: 'scheduled' | 'completed' | 'canceled';
  notes: string | null;
  feePerSession: number | null;
  type: 'class' | 'ad_hoc';
  seriesId: string | null;
}

export class SessionRepository {
  constructor(private deps: { db: D1Database }) {}

  /**
   * List sessions by class for a teacher
   */
  async listByClass(options: { classId: string; teacherId: string; startTimeBegin?: string; startTimeEnd?: string; statusExclude?: string[] }): Promise<SessionRow[]> {
    const { classId, teacherId, startTimeBegin, startTimeEnd, statusExclude } = options;
    let query = `
      SELECT
        id, classId, teacherId, startTime, durationMin,
        status, notes, feePerSession, type, seriesId, createdAt
      FROM Session
      WHERE classId = ? AND teacherId = ?`;
    const params: any[] = [classId, teacherId];
    // Exclude given statuses if any
    if (statusExclude && statusExclude.length > 0) {
      const placeholders = statusExclude.map(() => '?').join(', ');
      query += ` AND status NOT IN (${placeholders})`;
      params.push(...statusExclude);
    }
    if (startTimeBegin) {
      query += ` AND startTime >= ?`;
      params.push(startTimeBegin);
    }
    if (startTimeEnd) {
      query += ` AND startTime <= ?`;
      params.push(startTimeEnd);
    }
    return await selectAll<SessionRow>(this.deps.db, query, params);
  }

  /**
   * Create a single session
   */
  async create(sessionRow: CreateSessionRow): Promise<SessionRow> {
    const query = `
      INSERT INTO Session (
        id, classId, teacherId, startTime, durationMin,
        status, notes, feePerSession, type, seriesId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING 
        id, classId, teacherId, startTime, durationMin,
        status, notes, feePerSession, type, seriesId, createdAt
    `;

    const result = await selectOne<SessionRow>(this.deps.db, query, [
      sessionRow.id,
      sessionRow.classId,
      sessionRow.teacherId,
      sessionRow.startTime,
      sessionRow.durationMin,
      sessionRow.status,
      sessionRow.notes,
      sessionRow.feePerSession,
      sessionRow.type,
      sessionRow.seriesId
    ]);

    if (!result) {
      throw new Error("Failed to create session");
    }

    return result;
  }

  /**
   * Bulk create multiple sessions (for series)
   */
  async createMany(sessions: CreateSessionRow[]): Promise<SessionRow[]> {
    if (sessions.length === 0) {
      return [];
    }

    // Use transaction for bulk insert
    const statements: D1PreparedStatement[] = [];

    for (const sessionRow of sessions) {
      const query = `
        INSERT INTO Session (
          id, classId, teacherId, startTime, durationMin,
          status, notes, feePerSession, type, seriesId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      statements.push(
        this.deps.db
          .prepare(query)
          .bind(
            sessionRow.id,
            sessionRow.classId,
            sessionRow.teacherId,
            sessionRow.startTime,
            sessionRow.durationMin,
            sessionRow.status,
            sessionRow.notes,
            sessionRow.feePerSession,
            sessionRow.type,
            sessionRow.seriesId
          )
      );
    }

    const results = await this.deps.db.batch(statements);

    // Verify all inserts succeeded
    for (const result of results) {
      if (!result.success) {
        throw new Error("Failed to create session series");
      }
    }

    // Return the created sessions by querying them back
    const seriesId = sessions[0].seriesId;
    if (seriesId) {
      return this.listBySeries(seriesId, sessions[0].teacherId);
    } else {
      // If no seriesId, return sessions by IDs
      const ids = sessions.map(s => s.id);
      return this.listByIds(ids, sessions[0].teacherId);
    }
  }

  /**
   * Get session by ID for a teacher
   */
  async getById({ id, teacherId }: { id: string; teacherId: string }): Promise<SessionRow | null> {
    const query = `
      SELECT 
        id, classId, teacherId, startTime, durationMin,
        status, notes, feePerSession, type, seriesId, createdAt
      FROM Session 
      WHERE id = ? AND teacherId = ?
    `;

    return await selectOne<SessionRow>(this.deps.db, query, [id, teacherId]);
  }

  /**
   * Update session
   */
  async update({ 
    id, 
    patch, 
    teacherId 
  }: { 
    id: string; 
    patch: Partial<Omit<SessionRow, 'id' | 'teacherId' | 'createdAt'>>; 
    teacherId: string; 
  }): Promise<SessionRow | null> {
    const updateFields: string[] = [];
    const values: any[] = [];

    // Build dynamic update query
    if (patch.startTime !== undefined) {
      updateFields.push("startTime = ?");
      values.push(patch.startTime);
    }
    if (patch.durationMin !== undefined) {
      updateFields.push("durationMin = ?");
      values.push(patch.durationMin);
    }
    if (patch.feePerSession !== undefined) {
      updateFields.push("feePerSession = ?");
      values.push(patch.feePerSession);
    }
    if (patch.notes !== undefined) {
      updateFields.push("notes = ?");
      values.push(patch.notes);
    }
    if (patch.status !== undefined) {
      updateFields.push("status = ?");
      values.push(patch.status);
    }

    if (updateFields.length === 0) {
      // No fields to update, just return the current session
      return this.getById({ id, teacherId });
    }

    values.push(id, teacherId);

    const query = `
      UPDATE Session 
      SET ${updateFields.join(", ")}
      WHERE id = ? AND teacherId = ?
      RETURNING 
        id, classId, teacherId, startTime, durationMin,
        status, notes, feePerSession, type, seriesId, createdAt
    `;

    return await selectOne<SessionRow>(this.deps.db, query, values);
  }

  /**
   * Cancel session (update status to canceled)
   */
  async cancel({ id, teacherId }: { id: string; teacherId: string }): Promise<SessionRow | null> {
    const query = `
      UPDATE Session 
      SET status = 'canceled'
      WHERE id = ? AND teacherId = ?
      RETURNING 
        id, classId, teacherId, startTime, durationMin,
        status, notes, feePerSession, type, seriesId, createdAt
    `;

    return await selectOne<SessionRow>(this.deps.db, query, [id, teacherId]);
  }

  /**
   * Delete session (hard delete)
   */
  async delete({ id, teacherId }: { id: string; teacherId: string }): Promise<void> {
    const query = `
      DELETE FROM Session 
      WHERE id = ? AND teacherId = ?
    `;

    await execute(this.deps.db, query, [id, teacherId]);
  }

  /**
   * Find conflicting sessions (overlapping time periods for same teacher)
   */
  async findConflicts({ 
    teacherId, 
    classId, 
    startTime, 
    endTime,
    excludeId 
  }: { 
    teacherId: string; 
    classId?: string; 
    startTime: string; 
    endTime: string;
    excludeId?: string;
  }): Promise<SessionRow[]> {
    // SQLite datetime comparison with string ISO dates should work for this use case
    // We check for overlapping periods: (start1 < end2) AND (start2 < end1)
    let query = `
      SELECT 
        id, classId, teacherId, startTime, durationMin,
        status, notes, feePerSession, type, seriesId, createdAt
      FROM Session 
      WHERE teacherId = ? 
        AND status IN ('scheduled', 'completed')
        AND (
          (startTime < ? AND datetime(startTime, '+' || durationMin || ' minutes') > ?)
        )
    `;

    const params: any[] = [teacherId, endTime, startTime];

    if (classId) {
      query += " AND classId = ?";
      params.push(classId);
    }

    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }

    return await selectAll<SessionRow>(this.deps.db, query, params);
  }

  /**
   * List upcoming sessions for reminders (used by UC-05)
   */
  async listUpcoming({ 
    teacherId, 
    limit = 50, 
    from 
  }: { 
    teacherId: string; 
    limit?: number; 
    from: string; 
  }): Promise<SessionRow[]> {
    const query = `
      SELECT 
        id, classId, teacherId, startTime, durationMin,
        status, notes, feePerSession, type, seriesId, createdAt
      FROM Session 
      WHERE teacherId = ? 
        AND status = 'scheduled'
        AND startTime >= ?
      LIMIT ?
    `;

    return await selectAll<SessionRow>(this.deps.db, query, [teacherId, from, limit]);
  }

  /**
   * List sessions by series ID
   */
  private async listBySeries(seriesId: string, teacherId: string): Promise<SessionRow[]> {
    const query = `
      SELECT 
        id, classId, teacherId, startTime, durationMin,
        status, notes, feePerSession, type, seriesId, createdAt
      FROM Session 
      WHERE seriesId = ? AND teacherId = ?
    `;

    return await selectAll<SessionRow>(this.deps.db, query, [seriesId, teacherId]);
  }

  /**
   * List sessions by IDs
   */
  private async listByIds(ids: string[], teacherId: string): Promise<SessionRow[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    const query = `
      SELECT 
        id, classId, teacherId, startTime, durationMin,
        status, notes, feePerSession, type, seriesId, createdAt
      FROM Session 
      WHERE id IN (${placeholders}) AND teacherId = ?
    `;

    return await selectAll<SessionRow>(this.deps.db, query, [...ids, teacherId]);
  }
}