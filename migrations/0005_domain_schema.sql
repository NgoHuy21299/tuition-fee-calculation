-- 0005_domain_schema.sql
-- Purpose: Introduce domain tables and support ad-hoc tutoring sessions.
-- Notes:
-- - D1 uses SQLite dialect. Enable foreign keys.
-- - Sessions can be tied to a Class (type = 'class') OR be ad-hoc without a Class (type = 'ad_hoc').
-- - feePerSession is stored at Session level; per-student override can be set at Attendance.feeOverride.

PRAGMA foreign_keys=ON;

-- Parent
CREATE TABLE IF NOT EXISTS Parent (
  id         TEXT PRIMARY KEY,
  email      TEXT,
  phone      TEXT,
  note       TEXT,
  createdAt  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Student
CREATE TABLE IF NOT EXISTS Student (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  studentPhone  TEXT,
  studentEmail  TEXT,
  parentId      TEXT REFERENCES Parent(id) ON DELETE SET NULL,
  note          TEXT,
  createdAt     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_student_parentId ON Student(parentId);

-- Class
CREATE TABLE IF NOT EXISTS Class (
  id          TEXT PRIMARY KEY,
  teacherId   TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  subject     TEXT,
  description TEXT,
  isActive    INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0,1)),
  createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_class_teacherId ON Class(teacherId);

-- ClassStudent (membership & optional unit price override)
CREATE TABLE IF NOT EXISTS ClassStudent (
  id                 TEXT PRIMARY KEY,
  classId            TEXT NOT NULL REFERENCES Class(id) ON DELETE CASCADE,
  studentId          TEXT NOT NULL REFERENCES Student(id) ON DELETE CASCADE,
  unitPriceOverride  INTEGER,
  joinedAt           TEXT NOT NULL DEFAULT (datetime('now')),
  leftAt             TEXT,
  UNIQUE (classId, studentId)
);
CREATE INDEX IF NOT EXISTS idx_classStudent_classId ON ClassStudent(classId);
CREATE INDEX IF NOT EXISTS idx_classStudent_studentId ON ClassStudent(studentId);

-- Session (can belong to a Class OR be ad-hoc; requires a teacher)
CREATE TABLE IF NOT EXISTS Session (
  id            TEXT PRIMARY KEY,
  classId       TEXT REFERENCES Class(id) ON DELETE SET NULL,
  teacherId     TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  startTime     TEXT NOT NULL,
  durationMin   INTEGER NOT NULL CHECK (durationMin > 0),
  status        TEXT NOT NULL CHECK (status IN ('scheduled','completed','canceled')),
  notes         TEXT,
  feePerSession INTEGER,
  type          TEXT NOT NULL DEFAULT 'class' CHECK (type IN ('class','ad_hoc')),
  createdAt     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_session_classId ON Session(classId);
CREATE INDEX IF NOT EXISTS idx_session_teacherId ON Session(teacherId);
CREATE INDEX IF NOT EXISTS idx_session_startTime ON Session(startTime);

-- Attendance (also holds per-student fee overrides for that session)
CREATE TABLE IF NOT EXISTS Attendance (
  id         TEXT PRIMARY KEY,
  sessionId  TEXT NOT NULL REFERENCES Session(id) ON DELETE CASCADE,
  studentId  TEXT NOT NULL REFERENCES Student(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('present','absent','late')),
  note       TEXT,
  markedBy   TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  markedAt   TEXT NOT NULL DEFAULT (datetime('now')),
  feeOverride INTEGER,
  UNIQUE (sessionId, studentId)
);
CREATE INDEX IF NOT EXISTS idx_attendance_sessionId ON Attendance(sessionId);
CREATE INDEX IF NOT EXISTS idx_attendance_studentId ON Attendance(studentId);

-- EmailJob / Notification queue
CREATE TABLE IF NOT EXISTS EmailJob (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL,
  target        TEXT NOT NULL,
  scheduleTime  TEXT,
  payload       TEXT, -- JSON blob
  status        TEXT NOT NULL CHECK (status IN ('pending','processing','sent','failed')),
  createdAt     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_emailjob_status ON EmailJob(status);
CREATE INDEX IF NOT EXISTS idx_emailjob_schedule ON EmailJob(scheduleTime);
