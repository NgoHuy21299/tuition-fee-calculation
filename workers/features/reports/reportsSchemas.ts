import { object, string, optional, boolean, pipe, regex } from 'valibot';

function Msg(code: string) {
  return code;
}

// Schema for monthly report query parameters
export const MonthlyReportQuerySchema = object({
  classId: pipe(
    string(Msg("CLASS_ID_REQUIRED")),
    regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, Msg("CLASS_ID_INVALID"))
  ),
  month: pipe(
    string(Msg("MONTH_REQUIRED")),
    regex(/^\d{4}-\d{2}$/, Msg("MONTH_FORMAT_INVALID"))
  ),
  includeStudentDetails: optional(boolean(Msg("INCLUDE_DETAILS_INVALID"))),
  forceRefresh: optional(boolean(Msg("FORCE_REFRESH_INVALID")))
});

export type MonthlyReportQuery = {
  classId: string;
  month: string;
  includeStudentDetails?: boolean;
  forceRefresh?: boolean;
};

// Schema for monthly report response (for documentation/validation)
export const MonthlyReportResponseSchema = object({
  classInfo: object({
    id: string(),
    name: string(),
    subject: string()
  }),
  month: string(),
  summary: object({
    totalSessions: string(),
    totalParticipatingStudents: string(),
    totalFees: string()
  }),
  students: string() // JSON string of student array
});