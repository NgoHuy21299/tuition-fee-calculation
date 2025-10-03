import type { D1Database } from "@cloudflare/workers-types";
import { selectOne, execute } from "../../helpers/queryHelpers";

export type ReportsRepoDeps = { db: D1Database };

// Type definitions for report cache
export interface ReportCacheRow {
  id: string;
  teacherId: string;
  classId: string | null;  // nullable for ad-hoc reports
  year: number;
  month: number;
  payload: string; // JSON string
  computedAt: string;
}

export interface CreateReportCacheRow {
  id: string;
  teacherId: string;
  classId: string | null;  // nullable for ad-hoc reports
  year: number;
  month: number;
  payload: string;
}

/**
 * Reports repository for managing monthly reports and cache
 */
export class ReportsRepository {
  constructor(private readonly deps: ReportsRepoDeps) {}

  // ============= CACHE MANAGEMENT =============

  /**
   * Get cached report if it exists and is within TTL (4 hours)
   */
  async getCachedReport(params: { 
    teacherId: string; 
    classId: string | null;  // nullable for ad-hoc reports
    year: number; 
    month: number 
  }): Promise<ReportCacheRow | null> {
    const sql = `
      SELECT id, teacherId, classId, year, month, payload, computedAt
      FROM ReportCache
      WHERE teacherId = ? AND classId = ? AND year = ? AND month = ?
        AND datetime(computedAt, '+4 hours') > datetime('now')
      LIMIT 1`;
    
    return selectOne<ReportCacheRow>(this.deps.db, sql, [
      params.teacherId,
      params.classId,
      params.year,
      params.month
    ]);
  }

  /**
   * Save report to cache
   */
  async saveReportCache(data: CreateReportCacheRow): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO ReportCache 
      (id, teacherId, classId, year, month, payload, computedAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`;
    
    await execute(this.deps.db, sql, [
      data.id,
      data.teacherId,
      data.classId,
      data.year,
      data.month,
      data.payload
    ]);
  }

  /**
   * Clear old cache entries (older than 24 hours)
   */
  async clearOldCache(): Promise<void> {
    const sql = `
      DELETE FROM ReportCache 
      WHERE datetime(computedAt, '+24 hours') < datetime('now')`;
    
    await execute(this.deps.db, sql, []);
  }
}