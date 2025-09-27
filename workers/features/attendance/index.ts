// Attendance feature exports
export { AttendanceService } from './attendanceService';
export { AttendanceRepository } from './attendanceRepository';
export { createAttendanceRouter } from './attendanceRoute';
export { 
  CreateAttendanceSchema,
  UpdateAttendanceSchema,
  BulkAttendanceSchema,
  AttendanceQuerySchema,
  type CreateAttendanceInput,
  type UpdateAttendanceInput,
  type BulkAttendanceInput,
  type AttendanceQueryInput,
  type AttendanceDto,
  type AttendanceWithSessionDto,
  type BulkAttendanceResult,
  type AttendanceStats
} from './attendanceSchemas';
export type { 
  AttendanceRow, 
  AttendanceRepoDeps,
  CreateAttendanceRow,
  UpdateAttendanceRow,
  AttendanceWithStudentRow,
  AttendanceWithSessionRow
} from './attendanceRepository';