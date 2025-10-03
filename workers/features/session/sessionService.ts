import type { D1Database } from "@cloudflare/workers-types";
import {
  SessionRepository,
  type CreateSessionRow,
  type SessionRow,
} from "./sessionRepository";
import { ClassRepository, type ClassRow } from "../class/classRepository";
import { AttendanceRepository } from "../attendance/attendanceRepository";
import { ClassStudentRepository } from "../class-student/classStudentRepository";
import { CacheService } from "../../helpers/cacheService";
import type {
  SessionDto,
  CreateSessionInput,
  CreateSessionSeriesInput,
  CreatePrivateSessionInput,
  UpdateSessionInput,
} from "./sessionSchemas";
import { AppError } from "../../errors";
import { SESSION_STATUS, SESSION_TYPE } from "./sessionConst";
import { ATTENDANCE_STATUS } from "../attendance/attendanceConst";

/**
 * Session business logic layer
 *
 * Handles:
 * - Single session CRUD
 * - Session series creation (recurring sessions)
 * - Business rule validation
 * - Teacher ownership scoping
 * - Conflict detection
 */
export class SessionService {
  private sessionRepo: SessionRepository;
  private classRepo: ClassRepository;
  private attendanceRepo: AttendanceRepository;
  private classStudentRepo: ClassStudentRepository;
  private cache?: CacheService;

  constructor(private deps: { db: D1Database; kv?: KVNamespace }) {
    this.sessionRepo = new SessionRepository(deps);
    this.classRepo = new ClassRepository(deps);
    this.attendanceRepo = new AttendanceRepository(deps);
    this.classStudentRepo = new ClassStudentRepository(deps);
    this.cache = deps.kv ? new CacheService(deps.kv) : undefined;
  }

  /**
   * Create a single session
   */
  async createSession(
    input: CreateSessionInput,
    teacherId: string
  ): Promise<SessionDto> {
    // Validate class ownership if provided
    let classExists: ClassRow | null = null;
    if (input.classId) {
      classExists = await this.classRepo.getById(input.classId, teacherId);
      if (!classExists) {
        throw new AppError("CLASS_NOT_FOUND", "Class not found", 404);
      }
    }

    // Check for time conflicts
    const endTime = this.calculateEndTime(input.startTime, input.durationMin);
    const conflicts = await this.sessionRepo.findConflicts({
      teacherId,
      startTime: input.startTime,
      endTime,
      classId: input.classId ?? undefined,
    });

    if (conflicts.length > 0) {
      throw new AppError(
        "SESSION_CONFLICT",
        "Time conflict with existing session",
        409
      );
    }

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Create session row
    const sessionRow: CreateSessionRow = {
      id: sessionId,
      classId: input.classId ?? null,
      teacherId,
      startTime: input.startTime,
      durationMin: input.durationMin,
      status: SESSION_STATUS.SCHEDULED,
      notes: input.notes ?? null,
      feePerSession:
        input.feePerSession ?? classExists?.defaultFeePerSession ?? null,
      type: input.classId ? SESSION_TYPE.CLASS : SESSION_TYPE.AD_HOC,
      seriesId: null,
    };

    const created = await this.sessionRepo.create(sessionRow);

    // If this is a class session, create attendance records for all current students
    if (input.classId) {
      await this.createInitialAttendanceRecords(sessionId, input.classId);
    }

    // Invalidate caches related to this class/teacher
    await this.invalidateClassCaches(input.classId ?? null, teacherId);

    return this.mapToDto(created);
  }

  /**
   * Create a series of recurring sessions
   */
  async createSessionSeries(
    input: CreateSessionSeriesInput,
    teacherId: string
  ): Promise<SessionDto[]> {
    // Validate class ownership if provided
    if (input.classId) {
      const classExists = await this.classRepo.getById(
        input.classId,
        teacherId
      );
      if (!classExists) {
        throw new AppError("CLASS_NOT_FOUND", "Class not found", 404);
      }
    }

    // Generate dates from recurrence pattern
    const sessionDates = this.generateSessionDates(input.recurrence);

    // Validate series size
    if (sessionDates.length > 50) {
      throw new AppError(
        "SERIES_TOO_LARGE",
        "Cannot create more than 50 sessions at once",
        400
      );
    }

    if (sessionDates.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "At least one session required",
        400
      );
    }

    // Check all sessions for conflicts
    for (const sessionDate of sessionDates) {
      const endTime = this.calculateEndTime(sessionDate, input.durationMin);
      const conflicts = await this.sessionRepo.findConflicts({
        teacherId,
        startTime: sessionDate,
        endTime,
        classId: input.classId ?? undefined,
      });

      if (conflicts.length > 0) {
        throw new AppError(
          "SESSION_CONFLICT",
          `Time conflict on ${sessionDate}`,
          409
        );
      }
    }

    // Generate series ID
    const seriesId = crypto.randomUUID();

    // Create session rows
    const sessionRows: CreateSessionRow[] = sessionDates.map((startTime) => ({
      id: crypto.randomUUID(),
      classId: input.classId ?? null,
      teacherId,
      startTime,
      durationMin: input.durationMin,
      status: SESSION_STATUS.SCHEDULED,
      notes: input.notes ?? null,
      feePerSession: input.feePerSession ?? null,
      type: input.classId ? SESSION_TYPE.CLASS : SESSION_TYPE.AD_HOC,
      seriesId,
    }));

    const created = await this.sessionRepo.createMany(sessionRows);

    // If this is a class session series, create attendance records for all sessions
    if (input.classId) {
      for (const session of created) {
        await this.createInitialAttendanceRecords(session.id, input.classId);
      }
    }

    // Invalidate caches related to this class/teacher
    await this.invalidateClassCaches(input.classId ?? null, teacherId);

    return created.map((row) => this.mapToDto(row));
  }

  /**
   * List sessions by class
   */
  async listByClass(
    classId: string,
    teacherId: string,
    startTimeBegin?: string,
    startTimeEnd?: string
  ): Promise<SessionDto[]> {
    // Verify class ownership
    const classExists = await this.classRepo.getById(classId, teacherId);
    if (!classExists) {
      throw new AppError("CLASS_NOT_FOUND", "Class not found", 404);
    }
    let statusExclude: string[] = [];
    if (!!startTimeBegin && !!startTimeEnd) {
      statusExclude.push(`canceled`);
    }

    // Try cache
    let cacheKey: string | undefined;
    if (this.cache) {
      cacheKey = CacheService.buildKey("session", "listByClass", {
        classId,
        teacherId,
        startTimeBegin: startTimeBegin ?? null,
        startTimeEnd: startTimeEnd ?? null,
        statusExclude: statusExclude.join("|"),
      });
      const cached = await this.cache.get<SessionDto[]>(cacheKey);
      if (cached) return cached;
    }

    const sessions = await this.sessionRepo.listByClass({
      classId,
      teacherId,
      startTimeBegin,
      startTimeEnd,
      statusExclude,
    });
    const result = sessions.map((row) => this.mapToDto(row));

    if (this.cache && cacheKey) {
      await this.cache.set(cacheKey, result, { ttl: 300 });
    }
    return result;
  }

  /**
   * Get session by ID
   */
  async getById(
    sessionId: string,
    teacherId: string
  ): Promise<SessionDto | null> {
    const session = await this.sessionRepo.getById({
      id: sessionId,
      teacherId,
    });
    if (!session) return null;
    const dto = this.mapToDto(session);
    if (session.classId) {
      const cls = await this.classRepo.getById(session.classId, teacherId);
      return { ...dto, className: cls?.name ?? null };
    }
    return dto;
  }

  /**
   * Update session
   */
  async updateSession(
    sessionId: string,
    input: UpdateSessionInput,
    teacherId: string
  ): Promise<SessionDto | null> {
    // Check if session exists and is owned by teacher
    const existing = await this.sessionRepo.getById({
      id: sessionId,
      teacherId,
    });
    if (!existing) {
      throw new AppError("SESSION_NOT_FOUND", "Session not found", 404);
    }

    // If updating time, check for conflicts
    if (input.startTime !== undefined || input.durationMin !== undefined) {
      const newStartTime = input.startTime ?? existing.startTime;
      const newDuration = input.durationMin ?? existing.durationMin;
      const endTime = this.calculateEndTime(newStartTime, newDuration);

      const conflicts = await this.sessionRepo.findConflicts({
        teacherId,
        startTime: newStartTime,
        endTime,
        classId: existing.classId ?? undefined,
        excludeId: sessionId,
      });

      if (conflicts.length > 0) {
        throw new AppError(
          "SESSION_CONFLICT",
          "Time conflict with existing session",
          409
        );
      }
    }

    // Populate feePerSession from class default if not set and session is linked to a class
    if (existing.classId && !existing.feePerSession) {
      const classExists = await this.classRepo.getById(
        existing.classId,
        teacherId
      );
      if (classExists?.defaultFeePerSession) {
        input.feePerSession = classExists.defaultFeePerSession;
      }
    }

    const updated = await this.sessionRepo.update({
      id: sessionId,
      patch: input,
      teacherId,
    });

    // Invalidate caches
    await this.invalidateClassCaches(existing.classId ?? null, teacherId);

    return updated ? this.mapToDto(updated) : null;
  }

  /**
   * Mark session as completed
   */
  async completeSession(
    sessionId: string,
    teacherId: string
  ): Promise<SessionDto | null> {
    // Check if session exists and is owned by teacher
    const existing = await this.sessionRepo.getById({
      id: sessionId,
      teacherId,
    });
    if (!existing) {
      throw new AppError("SESSION_NOT_FOUND", "Session not found", 404);
    }

    // Business rule: Can only complete scheduled sessions
    if (existing.status === SESSION_STATUS.CANCELED) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Cannot complete a canceled session",
        400
      );
    }
    if (existing.status === SESSION_STATUS.COMPLETED) {
      // Idempotent behaviour: return the existing session without changes
      return this.mapToDto(existing);
    }

    const timestamp = this.formatVietnamTimestamp(new Date());
    const noteLine = `Đã hoàn thành và lúc ${timestamp}`;
    const newNotes = existing.notes
      ? `${noteLine}\n${existing.notes}}`
      : noteLine;

    const updated = await this.sessionRepo.update({
      id: sessionId,
      patch: { status: SESSION_STATUS.COMPLETED, notes: newNotes },
      teacherId,
    });

    // Invalidate caches
    await this.invalidateClassCaches(existing.classId ?? null, teacherId);

    return updated ? this.mapToDto(updated) : null;
  }

  /**
   * Unlock a completed session back to scheduled with a reason
   */
  async unlockSession(
    sessionId: string,
    reason: string,
    teacherId: string
  ): Promise<SessionDto | null> {
    const existing = await this.sessionRepo.getById({
      id: sessionId,
      teacherId,
    });
    if (!existing) {
      throw new AppError("SESSION_NOT_FOUND", "Session not found", 404);
    }
    if (existing.status === SESSION_STATUS.CANCELED) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Cannot unlock a canceled session",
        400
      );
    }
    if (existing.status === "scheduled") {
      // already unlocked
      return this.mapToDto(existing);
    }

    const timestamp = this.formatVietnamTimestamp(new Date());
    const noteLine = `Mở khoá điểm danh vào ${timestamp}: ${reason}`;
    const newNotes = existing.notes
      ? `${noteLine}\n${existing.notes}}`
      : noteLine;

    const updated = await this.sessionRepo.update({
      id: sessionId,
      patch: { status: SESSION_STATUS.SCHEDULED, notes: newNotes },
      teacherId,
    });

    // Invalidate caches
    await this.invalidateClassCaches(existing.classId ?? null, teacherId);

    return updated ? this.mapToDto(updated) : null;
  }

  /** Format timestamp as HH:mm:ss dd/MM/yyyy in Vietnamese locale */
  private formatVietnamTimestamp(d: Date): string {
    // Build custom format to ensure exact pattern
    const pad = (n: number) => n.toString().padStart(2, "0");
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
  }

  /**
   * Cancel session
   */
  async cancelSession(
    sessionId: string,
    teacherId: string
  ): Promise<SessionDto | null> {
    // Check if session exists and is owned by teacher
    const existing = await this.sessionRepo.getById({
      id: sessionId,
      teacherId,
    });
    if (!existing) {
      throw new AppError("SESSION_NOT_FOUND", "Session not found", 404);
    }

    // Business rule: Can only cancel scheduled sessions
    if (existing.status !== SESSION_STATUS.SCHEDULED) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Can only cancel scheduled sessions",
        400
      );
    }

    // Update status to canceled
    const updated = await this.sessionRepo.update({
      id: sessionId,
      patch: { status: SESSION_STATUS.CANCELED },
      teacherId,
    });

    // Invalidate caches
    await this.invalidateClassCaches(existing.classId ?? null, teacherId);

    return updated ? this.mapToDto(updated) : null;
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string, teacherId: string): Promise<void> {
    // Check if session exists and is owned by teacher
    const existing = await this.sessionRepo.getById({
      id: sessionId,
      teacherId,
    });
    if (!existing) {
      throw new AppError("SESSION_NOT_FOUND", "Session not found", 404);
    }

    // Business rule: Can only delete cancelled sessions
    if (existing.status !== SESSION_STATUS.CANCELED) {
      throw new AppError(
        "SESSION_HAS_ATTENDANCE",
        "Can only delete canceled sessions",
        400
      );
    }

    await this.sessionRepo.delete({ id: sessionId, teacherId });

    // Invalidate caches
    await this.invalidateClassCaches(existing.classId ?? null, teacherId);
  }

  /**
   * List upcoming sessions (for reminders/dashboard)
   */
  async listUpcoming(
    teacherId: string,
    options: { limit?: number; from?: string } = {}
  ): Promise<SessionDto[]> {
    const from = options.from ?? new Date().toISOString();
    const limit = options.limit ?? 50;

    const sessions = await this.sessionRepo.listUpcoming({
      teacherId,
      from,
      limit,
    });

    return sessions.map((row) => this.mapToDto(row));
  }

  /**
   * List all sessions for a teacher (for the teacher's session management page)
   */
  async listByTeacher(
    teacherId: string,
    options: {
      startTimeBegin?: string;
      startTimeEnd?: string;
      isExcludeCancelled?: boolean;
    } = {}
  ): Promise<SessionDto[]> {
    const statusExclude: string[] = [];
    if (options.isExcludeCancelled === true) {
      statusExclude.push(SESSION_STATUS.CANCELED);
    } else if (!!options.startTimeBegin && !!options.startTimeEnd) {
      statusExclude.push(SESSION_STATUS.CANCELED);
    }

    const sessions = await this.sessionRepo.listByTeacher({
      teacherId,
      startTimeBegin: options.startTimeBegin,
      startTimeEnd: options.startTimeEnd,
      statusExclude,
    });

    return sessions.map((row) => this.mapToDtoWithClassName(row));
  }

  /**
   * Generate session dates from recurrence pattern
   */
  private generateSessionDates(
    recurrence: CreateSessionSeriesInput["recurrence"]
  ): string[] {
    const dates: string[] = [];
    const startDate = new Date(recurrence.startDate);
    const endDate = recurrence.endDate ? new Date(recurrence.endDate) : null;
    const maxOccurrences = recurrence.maxOccurrences ?? 100; // Default limit
    const exclusionDates = new Set(recurrence.exclusionDates ?? []);

    let currentDate = new Date(startDate);
    let occurrenceCount = 0;

    // Iterate for up to 365 days or until we hit maxOccurrences
    for (
      let dayOffset = 0;
      dayOffset < 365 && occurrenceCount < maxOccurrences;
      dayOffset++
    ) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + dayOffset);

      // Stop if we've reached the end date
      if (endDate && checkDate > endDate) {
        break;
      }

      // Check if this day of week is in our recurrence pattern
      const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      if (!recurrence.daysOfWeek.includes(dayOfWeek)) {
        continue;
      }

      // Check if this date is excluded
      const dateString = checkDate.toISOString().split("T")[0];
      if (exclusionDates.has(dateString)) {
        continue;
      }

      // Create full datetime string with the specified time
      const fullDateTime = `${dateString}T${recurrence.time}:00.000Z`;
      dates.push(fullDateTime);
      occurrenceCount++;
    }

    return dates;
  }

  /**
   * Calculate end time from start time and duration
   */
  private calculateEndTime(startTime: string, durationMin: number): string {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMin * 60 * 1000);
    return end.toISOString();
  }

  /**
   * Create initial attendance records for all current students in a class
   */
  private async createInitialAttendanceRecords(
    sessionId: string,
    classId: string
  ): Promise<void> {
    try {
      // Get all current students in the class (leftAt IS NULL)
      const classStudents = await this.classStudentRepo.listByClass({
        classId,
      });
      const currentStudents = classStudents.filter((cs) => cs.leftAt === null);

      if (currentStudents.length === 0) {
        return; // No students to create attendance for
      }

      // Create attendance records for all current students with default status 'present'
      const attendanceRecords = currentStudents.map((cs) => ({
        id: crypto.randomUUID(),
        sessionId,
        studentId: cs.studentId,
        status: ATTENDANCE_STATUS.PRESENT, // Default status
        note: null,
        markedBy: null, // No one has marked it yet
        feeOverride: null, // Use default fee calculation
      }));

      // Bulk insert attendance records
      await this.attendanceRepo.bulkUpsert(attendanceRecords);
    } catch (error) {
      // Log error but don't fail session creation
      console.error(
        `Failed to create initial attendance records for session ${sessionId}:`,
        error
      );
      // Could throw error if business requires attendance creation to be mandatory
      // throw new AppError("ATTENDANCE_CREATION_FAILED", "Failed to create attendance records", 500);
    }
  }

  /**
   * Map database row to DTO
   */
  private mapToDto(row: SessionRow): SessionDto {
    return {
      id: row.id,
      classId: row.classId,
      teacherId: row.teacherId,
      startTime: row.startTime,
      durationMin: row.durationMin,
      status: row.status,
      notes: row.notes,
      feePerSession: row.feePerSession,
      type: row.type,
      seriesId: row.seriesId,
      createdAt: row.createdAt,
    };
  }

  /**
   * Create a private session for multiple students
   */
  async createPrivateSession(
    input: CreatePrivateSessionInput,
    teacherId: string
  ): Promise<SessionDto> {
    // Check for time conflicts
    const endTime = this.calculateEndTime(input.startTime, input.durationMin);
    const conflicts = await this.sessionRepo.findConflicts({
      teacherId,
      startTime: input.startTime,
      endTime,
    });

    if (conflicts.length > 0) {
      throw new AppError(
        "SESSION_CONFLICT",
        "Time conflict with existing session",
        409
      );
    }

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Create session row
    const sessionRow: CreateSessionRow = {
      id: sessionId,
      classId: null,
      teacherId,
      startTime: input.startTime,
      durationMin: input.durationMin,
      status: input.status ?? SESSION_STATUS.SCHEDULED,
      notes: input.notes ?? null,
      feePerSession: input.feePerSession,
      type: SESSION_TYPE.AD_HOC,
      seriesId: null,
    };

    const created = await this.sessionRepo.create(sessionRow);

    // Create attendance records for all selected students
    const attendanceRecords = input.studentIds.map((studentId: string) => ({
      id: crypto.randomUUID(),
      sessionId,
      studentId,
      status: ATTENDANCE_STATUS.PRESENT, // Default status
      note: null,
      markedBy: null,
      feeOverride: null,
    }));

    // Bulk insert attendance records
    await this.attendanceRepo.bulkUpsert(attendanceRecords);

    return this.mapToDto(created);
  }

  /**
   * Map database row with className to DTO
   */
  private mapToDtoWithClassName(
    row: SessionRow & { className: string | null }
  ): SessionDto {
    return {
      id: row.id,
      classId: row.classId,
      teacherId: row.teacherId,
      startTime: row.startTime,
      durationMin: row.durationMin,
      status: row.status,
      notes: row.notes,
      feePerSession: row.feePerSession,
      type: row.type,
      seriesId: row.seriesId,
      createdAt: row.createdAt,
      className: row.className,
    };
  }

  /** Invalidate caches related to a class and teacher */
  private async invalidateClassCaches(
    classId: string | null,
    teacherId: string
  ): Promise<void> {
    if (!this.cache) return;
    // Invalidate list-by-class caches
    if (classId) {
      await this.cache.deleteByPrefix(`session:listByClass:classId_${classId}`);
    }
    // Invalidate teacher-based lists (e.g., dashboard)
    await this.cache.deleteByPrefix(
      `session:listByTeacher:teacherId_${teacherId}`
    );
  }
}
