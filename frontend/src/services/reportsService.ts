import client from "../api/client";
import { toQueryString } from "../utils/paramUtils";
import type { AttendanceStatus } from '../constants';

// Types matching backend MonthlyReport interface
export interface MonthlyReportSummary {
  totalSessions: number;
  totalParticipatingStudents: number;
  totalFees: number;
}

export interface StudentAttendanceDetail {
  sessionId: string;
  date: string; // ISO date string
  status: AttendanceStatus;
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

export interface MonthlyReportSummaryResponse {
  classInfo: ClassInfo;
  month: string;
  summary: MonthlyReportSummary;
  studentCount: number;
}

export const reportsService = {
  /**
   * Get full monthly report with optional student details
   */
  async getMonthlyReport(
    classId: string, 
    month: string, 
    includeStudentDetails: boolean = false,
    forceRefresh: boolean = false
  ): Promise<MonthlyReport> {
    const params = {
      classId,
      month,
      includeStudentDetails,
      forceRefresh
    };
    const qs = toQueryString(params);
    const { data } = await client.get<MonthlyReport>(`/api/reports/monthly${qs}`);
    return data;
  },

  /**
   * Get lightweight monthly report summary
   */
  async getMonthlySummary(
    classId: string, 
    month: string,
    forceRefresh: boolean = false
  ): Promise<MonthlyReportSummaryResponse> {
    const params = {
      classId,
      month,
      forceRefresh
    };
    const qs = toQueryString(params);
    const { data } = await client.get<MonthlyReportSummaryResponse>(`/api/reports/monthly/summary${qs}`);
    return data;
  }
};