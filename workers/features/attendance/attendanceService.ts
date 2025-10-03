import type { D1Database } from "@cloudflare/workers-types";
import {
  AttendanceRepository,
  type CreateAttendanceRow,
  type AttendanceRow,
  type AttendanceWithStudentRow,
  type AttendanceWithSessionRow,
} from "./attendanceRepository";
import { SessionRepository } from "../session/sessionRepository";
import type { SessionRow } from "../session/sessionRepository";
import { StudentRepository } from "../student/studentRepository";
import { ClassRepository } from "../class/classRepository";
import { UserRepository } from "../auth/userRepository";
import type {
  AttendanceDto,
  AttendanceWithSessionDto,
  CreateAttendanceInput,
  UpdateAttendanceInput,
  BulkAttendanceInput,
  BulkAttendanceResult,
  AttendanceStats,
  AttendanceQueryInput,
} from "./attendanceSchemas";
import { AppError } from "../../errors";

/**
 * Attendance business logic layer
 *
 * Handles:
 * - Attendance CRUD operations with business rules
 * - Bulk attendance operations for sessions
 * - Fee calculation with override hierarchy
 * - Teacher ownership validation
 * - Student enrollment validation
 * - Attendance statistics and reporting
 */
export class AttendanceService {
  private attendanceRepo: AttendanceRepository;
  private sessionRepo: SessionRepository;
  private studentRepo: StudentRepository;
  private classRepo: ClassRepository;
  private userRepo: UserRepository;

  constructor(private deps: { db: D1Database }) {
    this.attendanceRepo = new AttendanceRepository(deps);
    this.sessionRepo = new SessionRepository(deps);
    this.studentRepo = new StudentRepository(deps);
    this.classRepo = new ClassRepository(deps);
    this.userRepo = new UserRepository(deps);
  }

  /**
   * Get attendance list for a session with student info and calculated fees
   */
  async getSessionAttendance({
    sessionId,
    teacherId,
  }: {
    sessionId: string;
    teacherId: string;
  }): Promise<AttendanceDto[]> {
    // Verify session ownership
    const session = await this.sessionRepo.getById({
      id: sessionId,
      teacherId,
    });
    if (!session) {
      throw new AppError("SESSION_NOT_FOUND", "Session not found", 404);
    }

    // Get attendance records with student info
    const attendanceRecords = await this.attendanceRepo.findBySession({
      sessionId,
      teacherId,
    });

    // Calculate fees for each attendance record
    const attendanceDtos: AttendanceDto[] = [];
    for (const record of attendanceRecords) {
      const calculatedFee = await this.calculateAttendanceFee(record, session);
      attendanceDtos.push({
        ...record,
        calculatedFee,
      });
    }

    // Resolve markedBy names in batch
    const markedByIds = Array.from(
      new Set(
        attendanceDtos
          .map((a) => a.markedBy)
          .filter((v): v is string => v != null)
      )
    );
    if (markedByIds.length > 0) {
      const users = await this.userRepo.getByIds(markedByIds);
      const idToName = new Map(users.map((u) => [u.id, u.name ?? null]));
      for (const dto of attendanceDtos) {
        dto.markedByName = dto.markedBy ? (idToName.get(dto.markedBy) ?? null) : null;
      }
    }

    return attendanceDtos;
  }

  /**
   * Bulk mark attendance for a session
   */
  async markAttendance({
    sessionId,
    attendanceRecords,
    teacherId,
  }: {
    sessionId: string;
    attendanceRecords: BulkAttendanceInput["attendanceRecords"];
    teacherId: string;
  }): Promise<BulkAttendanceResult> {
    // Verify session ownership
    const session = await this.sessionRepo.getById({
      id: sessionId,
      teacherId,
    });
    if (!session) {
      throw new AppError("SESSION_NOT_FOUND", "Session not found", 404);
    }

    // Validate session is not completed (business rule)
    if (session.status === "completed") {
      throw new AppError(
        "ATTENDANCE_SESSION_COMPLETED",
        "Cannot modify attendance for completed sessions",
        400
      );
    }

    // For class sessions, validate all students are enrolled
    if (session.classId) {
      await this.validateStudentsInClass(
        attendanceRecords.map((r) => r.studentId),
        session.classId,
        teacherId
      );
    }

    const results: BulkAttendanceResult["results"] = [];
    const createRecords: CreateAttendanceRow[] = [];

    // Prepare attendance records
    for (const record of attendanceRecords) {
      try {
        // Validate student exists and belongs to teacher
        const student = await this.studentRepo.getById(
          record.studentId,
          teacherId
        );
        if (!student) {
          results.push({
            studentId: record.studentId,
            success: false,
            error: "Student not found",
          });
          continue;
        }

        const attendanceId = crypto.randomUUID();
        createRecords.push({
          id: attendanceId,
          sessionId,
          studentId: record.studentId,
          status: record.status,
          note: record.note ?? null,
          markedBy: teacherId,
          feeOverride: record.feeOverride ?? null,
        });

        results.push({
          studentId: record.studentId,
          success: true,
          attendanceId,
        });
      } catch (error) {
        results.push({
          studentId: record.studentId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Bulk upsert attendance records
    if (createRecords.length > 0) {
      await this.attendanceRepo.bulkUpsert(createRecords);
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return {
      success: failureCount === 0,
      totalRecords: results.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Update individual attendance record
   */
  async updateAttendance({
    id,
    updates,
    teacherId,
  }: {
    id: string;
    updates: UpdateAttendanceInput;
    teacherId: string;
  }): Promise<AttendanceDto> {
    // Verify attendance exists and teacher owns it
    const existing = await this.attendanceRepo.findById({ id, teacherId });
    if (!existing) {
      throw new AppError(
        "ATTENDANCE_NOT_FOUND",
        "Attendance record not found",
        404
      );
    }

    // Get session to check status
    const session = await this.sessionRepo.getById({
      id: existing.sessionId,
      teacherId,
    });
    if (!session) {
      throw new AppError("SESSION_NOT_FOUND", "Session not found", 404);
    }

    // Validate session is not completed
    if (session.status === "completed") {
      throw new AppError(
        "ATTENDANCE_SESSION_COMPLETED",
        "Cannot modify attendance for completed sessions",
        400
      );
    }

    // Update attendance record
    const updateData = {
      ...updates,
      markedBy: teacherId,
    };

    const updated = await this.attendanceRepo.update({
      id,
      updates: updateData,
      teacherId,
    });
    if (!updated) {
      throw new AppError(
        "ATTENDANCE_UPDATE_FAILED",
        "Failed to update attendance",
        500
      );
    }

    // Get updated record with student info
    const updatedRecord = await this.attendanceRepo.findById({ id, teacherId });
    if (!updatedRecord) {
      throw new AppError(
        "ATTENDANCE_NOT_FOUND",
        "Updated attendance record not found",
        404
      );
    }

    // Get student info
    const student = await this.studentRepo.getById(
      updatedRecord.studentId,
      teacherId
    );
    if (!student) {
      throw new AppError("STUDENT_NOT_FOUND", "Student not found", 404);
    }

    // Calculate fee
    const calculatedFee = await this.calculateAttendanceFee(
      updatedRecord,
      session
    );

    return {
      ...updatedRecord,
      studentName: student.name,
      studentEmail: student.email,
      studentPhone: student.phone,
      calculatedFee,
    };
  }

  /**
   * Delete attendance record
   */
  async deleteAttendance({
    id,
    teacherId,
  }: {
    id: string;
    teacherId: string;
  }): Promise<void> {
    // Verify attendance exists and teacher owns it
    const existing = await this.attendanceRepo.findById({ id, teacherId });
    if (!existing) {
      throw new AppError(
        "ATTENDANCE_NOT_FOUND",
        "Attendance record not found",
        404
      );
    }

    // Get session to check status
    const session = await this.sessionRepo.getById({
      id: existing.sessionId,
      teacherId,
    });
    if (!session) {
      throw new AppError("SESSION_NOT_FOUND", "Session not found", 404);
    }

    // Validate session is not completed
    if (session.status === "completed") {
      throw new AppError(
        "ATTENDANCE_SESSION_COMPLETED",
        "Cannot modify attendance for completed sessions",
        400
      );
    }

    const deleted = await this.attendanceRepo.delete({ id, teacherId });
    if (!deleted) {
      throw new AppError(
        "ATTENDANCE_DELETE_FAILED",
        "Failed to delete attendance",
        500
      );
    }
  }

  /**
   * Get student attendance history with statistics
   */
  async getStudentAttendanceHistory({
    studentId,
    teacherId,
    filters,
  }: {
    studentId: string;
    teacherId: string;
    filters?: AttendanceQueryInput;
  }): Promise<{
    attendance: AttendanceWithSessionDto[];
    stats: AttendanceStats;
  }> {
    // Verify student exists and belongs to teacher
    const student = await this.studentRepo.getById(studentId, teacherId);
    if (!student) {
      throw new AppError("STUDENT_NOT_FOUND", "Student not found", 404);
    }

    // Get attendance history
    const attendanceRecords = await this.attendanceRepo.findByStudent({
      studentId,
      teacherId,
      classId: filters?.classId || undefined,
      fromDate: filters?.fromDate || undefined,
      toDate: filters?.toDate || undefined,
    });

    // Map to DTOs with calculated fees
    const attendanceDtos: AttendanceWithSessionDto[] = [];
    for (const record of attendanceRecords) {
      // Get session for fee calculation
      const session = await this.sessionRepo.getById({
        id: record.sessionId,
        teacherId,
      });
      const calculatedFee = session
        ? await this.calculateAttendanceFee(record, session)
        : null;

      attendanceDtos.push({
        ...record,
        studentName: student.name,
        studentEmail: student.email,
        studentPhone: student.phone,
        calculatedFee,
      });
    }

    // Resolve markedByName
    const markedByIds = Array.from(
      new Set(
        attendanceDtos
          .map((a) => a.markedBy)
          .filter((v): v is string => v != null)
      )
    );
    if (markedByIds.length > 0) {
      const users = await this.userRepo.getByIds(markedByIds);
      const idToName = new Map(users.map((u) => [u.id, u.name ?? null]));
      for (const dto of attendanceDtos) {
        dto.markedByName = dto.markedBy ? (idToName.get(dto.markedBy) ?? null) : null;
      }
    }

    // Calculate statistics
    const stats = await this.getAttendanceStats({
      studentId,
      teacherId,
      classId: filters?.classId || undefined,
      fromDate: filters?.fromDate || undefined,
      toDate: filters?.toDate || undefined,
    });

    return {
      attendance: attendanceDtos,
      stats,
    };
  }

  /**
   * Calculate fees for all students in a session based on attendance and overrides
   */
  async calculateSessionFees({
    sessionId,
    teacherId,
  }: {
    sessionId: string;
    teacherId: string;
  }): Promise<{
    sessionId: string;
    totalFees: number;
    attendanceFees: Array<{
      studentId: string;
      studentName: string;
      status: "present" | "absent" | "late";
      fee: number;
      feeSource: "attendance_override" | "student_override" | "session_default";
    }>;
  }> {
    // Get session
    const session = await this.sessionRepo.getById({
      id: sessionId,
      teacherId,
    });
    if (!session) {
      throw new AppError("SESSION_NOT_FOUND", "Session not found", 404);
    }

    // Only include fees if the session is completed
    if (session.status !== "completed") {
      return { sessionId, totalFees: 0, attendanceFees: [] };
    }

    // Get attendance records and filter to present only for fee calculation
    const attendanceRecords = await this.attendanceRepo.findBySession({
      sessionId,
      teacherId,
    });

    const attendanceFees = [];
    let totalFees = 0;

    for (const record of attendanceRecords) {
      if (record.status === "absent") continue;
      const calculatedFee = await this.calculateAttendanceFee(record, session);
      const feeSource = await this.getFeeSource(record, session);

      attendanceFees.push({
        studentId: record.studentId,
        studentName: record.studentName,
        status: record.status,
        fee: calculatedFee || 0,
        feeSource,
      });

      totalFees += calculatedFee || 0;
    }

    return {
      sessionId,
      totalFees,
      attendanceFees,
    };
  }

  /**
   * Get attendance statistics
   */
  private async getAttendanceStats({
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
  }): Promise<AttendanceStats> {
    const stats = await this.attendanceRepo.getAttendanceStats({
      classId,
      studentId,
      teacherId,
      fromDate,
      toDate,
    });

    const attendanceRate =
      stats.totalSessions > 0
        ? ((stats.presentCount + stats.lateCount) / stats.totalSessions) * 100
        : 0;

    // Calculate total fees across all matching records
    // Note: Currently supports per-student stats (primary use case). If studentId is not provided,
    // this will iterate over potentially many records; consider adding a repository method for
    // teacher-wide filtered attendance summaries if needed.
    let totalFees = 0;
    if (studentId) {
      const attendanceRecords = await this.attendanceRepo.findByStudent({
        studentId,
        teacherId,
        classId: classId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      for (const record of attendanceRecords) {
        const session = await this.sessionRepo.getById({
          id: record.sessionId,
          teacherId,
        });
        // Only count fees for completed sessions and present attendance
        if (session && session.status === "completed" && ["present", "late"].includes(record.status)) {
          const fee = await this.calculateAttendanceFee(record, session);
          if (fee !== null) totalFees += fee;
        }
      }
    } else {
      // Without a studentId, we cannot reuse an existing repository method that includes
      // session fee info; keep total fees as 0 for now. This path is not currently used.
      totalFees = 0;
    }

    return {
      totalSessions: stats.totalSessions,
      presentCount: stats.presentCount,
      absentCount: stats.absentCount,
      lateCount: stats.lateCount,
      attendanceRate: Math.round(attendanceRate * 100) / 100, // Round to 2 decimal places
      totalFees,
    };
  }

  /**
   * Calculate fee for an attendance record using the fee resolution hierarchy
   * Order: Attendance.feeOverride → ClassStudent.unitPriceOverride → Session.feePerSession
   */
  private async calculateAttendanceFee(
    attendance: AttendanceRow | AttendanceWithStudentRow,
    session: SessionRow
  ): Promise<number | null> {
    // 1. Check attendance fee override
    if (attendance.feeOverride !== null) {
      return attendance.feeOverride;
    }

    // 2. Check class student unit price override (if it's a class session)
    if (session.classId) {
      const unitPriceOverride = await this.classRepo.getClassStudentUnitPriceOverride(
        session.classId,
        attendance.studentId,
        session.teacherId
      );
      if (unitPriceOverride !== null) {
        return unitPriceOverride;
      }
    }

    // 3. Use session fee per session
    return session.feePerSession;
  }

  /**
   * Determine the source of the fee for reporting
   */
  private async getFeeSource(
    attendance: AttendanceRow | AttendanceWithStudentRow,
    session: SessionRow
  ): Promise<"attendance_override" | "student_override" | "session_default"> {
    if (attendance.feeOverride !== null) {
      return "attendance_override";
    }

    if (session.classId) {
      const unitPriceOverride = await this.classRepo.getClassStudentUnitPriceOverride(
        session.classId,
        attendance.studentId,
        session.teacherId
      );
      if (unitPriceOverride !== null) {
        return "student_override";
      }
    }

    return "session_default";
  }

  /**
   * Validate that all students are enrolled in the class
   */
  private async validateStudentsInClass(
    studentIds: string[],
    classId: string,
    teacherId: string
  ): Promise<void> {
    for (const studentId of studentIds) {
      // Validate student exists and belongs to teacher
      const student = await this.studentRepo.getById(studentId, teacherId);
      if (!student) {
        throw new AppError(
          "ATTENDANCE_STUDENT_NOT_IN_CLASS",
          `Student ${studentId} not found or not accessible`,
          400
        );
      }

      // Validate membership in class
      const isMember = await this.classRepo.isStudentInClass(classId, studentId, teacherId);
      if (!isMember) {
        throw new AppError(
          "ATTENDANCE_STUDENT_NOT_IN_CLASS",
          `Student ${studentId} is not enrolled in class ${classId}`,
          400
        );
      }
    }
  }
}
