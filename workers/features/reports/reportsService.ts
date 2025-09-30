import { AppError } from "../../errors";
import { t } from "../../i18n/errorMessages";
import { ReportsRepository, type ReportsRepoDeps } from "./reportsRepository";
import { ClassRepository } from "../class/classRepository";
import { SessionRepository } from "../session/sessionRepository";
import { AttendanceRepository } from "../attendance/attendanceRepository";
import { ClassStudentRepository } from "../class-student/classStudentRepository";
import { StudentRepository } from "../student/studentRepository";

// Types for business logic
export interface MonthlyReportSummary {
  totalSessions: number;
  totalParticipatingStudents: number;
  totalFees: number;
}

export interface StudentAttendanceDetail {
  sessionId: string;
  date: string; // ISO date string
  status: 'present' | 'late';
  calculatedFee: number;
  feeBreakdown: {
    baseFee: number;
    classOverride?: number;
    attendanceOverride?: number;
  };
}

export interface StudentReportData {
  studentId: string;
  studentName: string;
  totalSessionsAttended: number;
  totalFees: number;
  attendanceDetails?: StudentAttendanceDetail[];
}

export interface ClassInfo {
  id: string;
  name: string;
  subject: string;
}

export interface MonthlyReport {
  classInfo: ClassInfo;
  month: string; // YYYY-MM format
  summary: MonthlyReportSummary;
  students: StudentReportData[];
}

/**
 * Reports service for generating monthly fee reports
 */
export class ReportsService {
  private repo: ReportsRepository;
  private classRepo: ClassRepository;
  private sessionRepo: SessionRepository;
  private attendanceRepo: AttendanceRepository;
  private classStudentRepo: ClassStudentRepository;
  private studentRepo: StudentRepository;

  constructor(deps: ReportsRepoDeps) {
    this.repo = new ReportsRepository(deps);
    this.classRepo = new ClassRepository(deps);
    this.sessionRepo = new SessionRepository(deps);
    this.attendanceRepo = new AttendanceRepository(deps);
    this.classStudentRepo = new ClassStudentRepository(deps);
    this.studentRepo = new StudentRepository(deps);
  }

  /**
   * Generate monthly report for a class
   */
  async getMonthlyReport(params: {
    classId: string;
    teacherId: string;
    month: string; // YYYY-MM format
    includeStudentDetails?: boolean;
    forceRefresh?: boolean;
  }): Promise<MonthlyReport> {
    const { classId, teacherId, month, includeStudentDetails = false, forceRefresh = false } = params;

    // Parse month
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new AppError("REPORT_INVALID_MONTH_FORMAT", t("REPORT_INVALID_MONTH_FORMAT"), 400);
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await this.repo.getCachedReport({ teacherId, classId, year, month: monthNum });
      if (cached) {
        const report = JSON.parse(cached.payload) as MonthlyReport;
        // If cached report doesn't include details but user wants them, fall through to regenerate
        if (!includeStudentDetails || this.reportHasDetails(report)) {
          return report;
        }
      }
    }

    // Generate fresh report
    const report = await this.generateMonthlyReport({
      classId,
      teacherId,
      year,
      month: monthNum,
      includeStudentDetails
    });

    // Cache the result
    await this.cacheReport({ teacherId, classId, year, month: monthNum, report });

    return report;
  }

  private reportHasDetails(report: MonthlyReport): boolean {
    return report.students.some(s => s.attendanceDetails && s.attendanceDetails.length > 0);
  }

  private async generateMonthlyReport(params: {
    classId: string;
    teacherId: string;
    year: number;
    month: number;
    includeStudentDetails: boolean;
  }): Promise<MonthlyReport> {
    const { classId, teacherId, year, month, includeStudentDetails } = params;

    // 1. Get class info
    const classInfo = await this.classRepo.getById(classId, teacherId);
    if (!classInfo) {
      throw new AppError("REPORT_CLASS_NOT_FOUND", t("REPORT_CLASS_NOT_FOUND"), 404);
    }

    // 2. Get sessions for the month
    const sessions = await this.sessionRepo.listByClassAndMonth({ classId, teacherId, year, month });
    if (sessions.length === 0) {
      throw new AppError("REPORT_NO_DATA", t("REPORT_NO_DATA"), 404);
    }

    // 3. Get attendance for all sessions
    const sessionIds = sessions.map(s => s.id);
    const attendances = await this.attendanceRepo.findBySessionIds({ sessionIds, teacherId });

    // 4. Get class student memberships
    const memberships = await this.classStudentRepo.listByClass({ classId });

    // 5. Get student info
    const studentIds = [...new Set(attendances.map(a => a.studentId))];
    const students = await this.studentRepo.getByIds(studentIds);

    // 6. Build fee calculation map
    const membershipMap = new Map(memberships.map(m => [m.studentId, m]));
    const sessionMap = new Map(sessions.map(s => [s.id, s]));
    const studentMap = new Map(students.map(s => [s.id, s]));

    // 7. Calculate fees and build report
    const studentReports = this.calculateStudentReports({
      attendances,
      sessionMap,
      membershipMap,
      studentMap,
      includeStudentDetails
    });

    // 8. Calculate summary
    const summary = this.calculateSummary(studentReports, sessions.length);

    return {
      classInfo: {
        id: classInfo.id,
        name: classInfo.name,
        subject: classInfo.subject || ''
      },
      month: `${year}-${month.toString().padStart(2, '0')}`,
      summary,
      students: studentReports
    };
  }

  private calculateStudentReports(params: {
    attendances: any[];
    sessionMap: Map<string, any>;
    membershipMap: Map<string, any>;
    studentMap: Map<string, any>;
    includeStudentDetails: boolean;
  }): StudentReportData[] {
    const { attendances, sessionMap, membershipMap, studentMap, includeStudentDetails } = params;

    // Group attendances by student
    const studentAttendanceMap = new Map<string, any[]>();
    for (const attendance of attendances) {
      const studentId = attendance.studentId;
      if (!studentAttendanceMap.has(studentId)) {
        studentAttendanceMap.set(studentId, []);
      }
      studentAttendanceMap.get(studentId)!.push(attendance);
    }

    const studentReports: StudentReportData[] = [];

    for (const [studentId, studentAttendances] of studentAttendanceMap) {
      const student = studentMap.get(studentId);
      const membership = membershipMap.get(studentId);
      
      if (!student) continue; // Skip if student not found

      let totalFees = 0;
      const attendanceDetails: StudentAttendanceDetail[] = [];

      for (const attendance of studentAttendances) {
        const session = sessionMap.get(attendance.sessionId);
        if (!session) continue;

        // Calculate fee according to priority:
        // 1. Attendance.feeOverride
        // 2. ClassStudent.unitPriceOverride  
        // 3. Session.feePerSession
        const calculatedFee = this.calculateAttendanceFee({
          attendance,
          session,
          membership
        });

        totalFees += calculatedFee.amount;

        if (includeStudentDetails) {
          attendanceDetails.push({
            sessionId: attendance.sessionId,
            date: new Date(attendance.markedAt || session.startTime).toISOString().split('T')[0],
            status: attendance.status,
            calculatedFee: calculatedFee.amount,
            feeBreakdown: {
              baseFee: session.feePerSession || 0,
              classOverride: membership?.unitPriceOverride || undefined,
              attendanceOverride: attendance.feeOverride || undefined
            }
          });
        }
      }

      studentReports.push({
        studentId,
        studentName: student.name,
        totalSessionsAttended: studentAttendances.length,
        totalFees,
        attendanceDetails: includeStudentDetails ? attendanceDetails : undefined
      });
    }

    // Sort by student name
    return studentReports.sort((a, b) => a.studentName.localeCompare(b.studentName));
  }

  private calculateAttendanceFee(params: {
    attendance: any;
    session: any;
    membership: any;
  }): { amount: number; source: 'attendance' | 'class' | 'session' } {
    const { attendance, session, membership } = params;

    // Priority 1: Attendance fee override
    if (attendance.feeOverride !== null && attendance.feeOverride !== undefined) {
      return { amount: attendance.feeOverride, source: 'attendance' };
    }

    // Priority 2: Class student unit price override
    if (membership?.unitPriceOverride !== null && membership?.unitPriceOverride !== undefined) {
      return { amount: membership.unitPriceOverride, source: 'class' };
    }

    // Priority 3: Session fee per session
    if (session.feePerSession !== null && session.feePerSession !== undefined) {
      return { amount: session.feePerSession, source: 'session' };
    }

    // Fallback: 0 if no fee specified
    return { amount: 0, source: 'session' };
  }

  private calculateSummary(studentReports: StudentReportData[], totalSessions: number): MonthlyReportSummary {
    const totalParticipatingStudents = studentReports.length;
    const totalFees = studentReports.reduce((sum, student) => sum + student.totalFees, 0);

    return {
      totalSessions,
      totalParticipatingStudents,
      totalFees
    };
  }

  private async cacheReport(params: {
    teacherId: string;
    classId: string;
    year: number;
    month: number;
    report: MonthlyReport;
  }): Promise<void> {
    const { teacherId, classId, year, month, report } = params;
    
    // Generate cache ID
    const cacheId = `${teacherId}-${classId}-${year}-${month}`;
    
    await this.repo.saveReportCache({
      id: cacheId,
      teacherId,
      classId,
      year,
      month,
      payload: JSON.stringify(report)
    });
  }

  /**
   * Clear old cache entries
   */
  async cleanupCache(): Promise<void> {
    await this.repo.clearOldCache();
  }
}