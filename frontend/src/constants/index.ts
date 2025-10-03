export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late",
} as const;

export type AttendanceStatus = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS];

export const SESSION_STATUS = {
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELED: "canceled",
} as const;

export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];

export const SESSION_TYPE = {
  CLASS: "class",
  AD_HOC: "ad_hoc",
} as const;

export type SessionType = typeof SESSION_TYPE[keyof typeof SESSION_TYPE];
