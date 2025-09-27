import apiClient from '../api/client';

// Types matching backend DTOs
export interface AttendanceDto {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent' | 'late';
  note: string | null;
  markedBy: string | null;
  markedByName?: string | null;
  markedAt: string;
  feeOverride: number | null;
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
  calculatedFee: number | null;
}

export interface AttendanceWithSessionDto extends AttendanceDto {
  sessionStartTime: string;
  sessionDurationMin: number;
  className: string | null;
  classSubject: string | null;
}

export interface CreateAttendanceRequest {
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent' | 'late';
  note?: string | null;
  feeOverride?: number | null;
}

export interface UpdateAttendanceRequest {
  status?: 'present' | 'absent' | 'late';
  note?: string | null;
  feeOverride?: number | null;
}

export interface BulkAttendanceRequest {
  attendanceRecords: Array<{
    studentId: string;
    status: 'present' | 'absent' | 'late';
    note?: string | null;
    feeOverride?: number | null;
  }>;
}

export interface BulkAttendanceResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    studentId: string;
    success: boolean;
    attendanceId?: string;
    error?: string;
  }>;
}

export interface AttendanceStats {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
  totalFees: number;
}

export interface SessionFeesResponse {
  sessionId: string;
  totalFees: number;
  attendanceFees: Array<{
    studentId: string;
    studentName: string;
    status: 'present' | 'absent' | 'late';
    fee: number;
    feeSource: 'attendance_override' | 'student_override' | 'session_default';
  }>;
}

export interface AttendanceQueryParams {
  classId?: string;
  fromDate?: string;
  toDate?: string;
}

export class AttendanceService {
  private static baseUrl = '/api';

  /**
   * Get attendance list for a session with student info and calculated fees
   */
  static async getSessionAttendance(sessionId: string): Promise<AttendanceDto[]> {
    const response = await apiClient.get(`${this.baseUrl}/sessions/${sessionId}/attendance`);
    return response.data;
  }

  /**
   * Bulk mark attendance for a session
   */
  static async markAttendance(sessionId: string, payload: BulkAttendanceRequest): Promise<BulkAttendanceResult> {
    const response = await apiClient.post(`${this.baseUrl}/sessions/${sessionId}/attendance`, payload);
    return response.data;
  }

  /**
   * Create single attendance record
   */
  static async createAttendance(payload: CreateAttendanceRequest): Promise<AttendanceDto> {
    const response = await apiClient.post(`${this.baseUrl}/attendance`, payload);
    return response.data;
  }

  /**
   * Update individual attendance record
   */
  static async updateAttendance(id: string, payload: UpdateAttendanceRequest): Promise<AttendanceDto> {
    const response = await apiClient.put(`${this.baseUrl}/attendance/${id}`, payload);
    return response.data;
  }

  /**
   * Delete attendance record
   */
  static async deleteAttendance(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/attendance/${id}`);
  }

  /**
   * Get student attendance history with statistics
   */
  static async getStudentAttendance(
    studentId: string, 
    filters?: AttendanceQueryParams
  ): Promise<{
    attendance: AttendanceWithSessionDto[];
    stats: AttendanceStats;
  }> {
    const params = new URLSearchParams();
    if (filters?.classId) {
      params.append('classId', filters.classId);
    }
    if (filters?.fromDate) {
      params.append('fromDate', filters.fromDate);
    }
    if (filters?.toDate) {
      params.append('toDate', filters.toDate);
    }

    const queryString = params.toString();
    const url = queryString 
      ? `${this.baseUrl}/students/${studentId}/attendance?${queryString}`
      : `${this.baseUrl}/students/${studentId}/attendance`;
    
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Calculate fees for all students in a session based on attendance and overrides
   */
  static async calculateSessionFees(sessionId: string): Promise<SessionFeesResponse> {
    const response = await apiClient.get(`${this.baseUrl}/sessions/${sessionId}/fees`);
    return response.data;
  }
}
