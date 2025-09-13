# Database Documentation

This document describes the database schema used by the tuition fee calculation system, including ER model, table definitions, and example queries. The schema targets Cloudflare D1 (SQLite dialect).

## ER Overview

- User (teacher)
  - One user can own many classes.
  - One user can create sessions: either class sessions or ad-hoc sessions (no class).
- Parent
  - Each parent can have zero or more students.
- Student
  - Each student optionally links to one parent.
  - Students can join many classes via ClassStudent.
  - Students can attend many sessions via Attendance.
- Class
  - Each class belongs to one teacher (User).
  - Class has many students (ClassStudent) and many sessions (Session with type = 'class').
- Session
  - Two types: 'class' (belongs to a class) and 'ad_hoc' (no class, still belongs to a teacher).
  - Attendance rows link students to sessions, and can carry per-student fee overrides.
- EmailJob
  - Simple queue table for notifications.

```
User 1---* Class
User 1---* Session (both class and ad_hoc)
Parent 1---* Student
Class 1---* ClassStudent *---1 Student
Session 1---* Attendance *---1 Student
```

## Tables

### User
- id TEXT PRIMARY KEY
- email TEXT NOT NULL
- password_hash TEXT NOT NULL
- name TEXT
- createdAt TEXT NOT NULL DEFAULT now
- normalizedEmail TEXT NOT NULL UNIQUE

Notes: `User` is WITHOUT ROWID as of migration `0004_user_without_rowid.sql`. Uniqueness on `normalizedEmail`.

### Parent
- id TEXT PRIMARY KEY
- email TEXT
- phone TEXT
- note TEXT
- createdAt TEXT NOT NULL DEFAULT now

### Student
- id TEXT PRIMARY KEY
- name TEXT NOT NULL
- studentPhone TEXT
- studentEmail TEXT
- parentId TEXT REFERENCES Parent(id) ON DELETE SET NULL
- note TEXT
- createdAt TEXT NOT NULL DEFAULT now

Indexes:
- idx_student_parentId(parentId)

### Class
- id TEXT PRIMARY KEY
- teacherId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE
- name TEXT NOT NULL
- subject TEXT
- description TEXT
- isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0,1))
- createdAt TEXT NOT NULL DEFAULT now

Indexes:
- idx_class_teacherId(teacherId)

### ClassStudent
- id TEXT PRIMARY KEY
- classId TEXT NOT NULL REFERENCES Class(id) ON DELETE CASCADE
- studentId TEXT NOT NULL REFERENCES Student(id) ON DELETE CASCADE
- unitPriceOverride INTEGER NULL  (per-student price for this class)
- joinedAt TEXT NOT NULL DEFAULT now
- leftAt TEXT NULL
- UNIQUE(classId, studentId)

Indexes:
- idx_classStudent_classId(classId)
- idx_classStudent_studentId(studentId)

### Session
- id TEXT PRIMARY KEY
- classId TEXT NULL REFERENCES Class(id) ON DELETE SET NULL  (NULL for ad-hoc)
- teacherId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE
- startTime TEXT NOT NULL
- durationMin INTEGER NOT NULL CHECK (durationMin > 0)
- status TEXT NOT NULL CHECK (status IN ('scheduled','completed','canceled'))
- notes TEXT
- feePerSession INTEGER NULL  (default price for the session)
- type TEXT NOT NULL DEFAULT 'class' CHECK (type IN ('class','ad_hoc'))
- createdAt TEXT NOT NULL DEFAULT now

Indexes:
- idx_session_classId(classId)
- idx_session_teacherId(teacherId)
- idx_session_startTime(startTime)

Rationale for ad-hoc: allow a teacher to create 1-off or few-off sessions for one or multiple students without creating a formal class. These are tracked as `Session.type = 'ad_hoc'` and `Session.classId = NULL`.

### Attendance
- id TEXT PRIMARY KEY
- sessionId TEXT NOT NULL REFERENCES Session(id) ON DELETE CASCADE
- studentId TEXT NOT NULL REFERENCES Student(id) ON DELETE CASCADE
- status TEXT NOT NULL CHECK (status IN ('present','absent','late'))
- note TEXT
- markedBy TEXT NULL REFERENCES User(id) ON DELETE SET NULL
- markedAt TEXT NOT NULL DEFAULT now
- feeOverride INTEGER NULL  (per-student price override for this session)
- UNIQUE(sessionId, studentId)

Indexes:
- idx_attendance_sessionId(sessionId)
- idx_attendance_studentId(studentId)

Price resolution order for a given Attendance:
1) Attendance.feeOverride if not NULL.
2) If Session.type = 'class' and student is a member, use ClassStudent.unitPriceOverride if not NULL.
3) Otherwise use Session.feePerSession.

### EmailJob
- id TEXT PRIMARY KEY
- type TEXT NOT NULL
- target TEXT NOT NULL
- scheduleTime TEXT NULL
- payload TEXT NULL (JSON)
- status TEXT NOT NULL CHECK (status IN ('pending','processing','sent','failed'))
- createdAt TEXT NOT NULL DEFAULT now

Indexes:
- idx_emailjob_status(status)
- idx_emailjob_schedule(scheduleTime)

## Migration Notes
- Existing migrations (0001-0004) establish `User` and its normalized email.
- Migration `0005_domain_schema.sql` introduces domain tables and the ad-hoc session model.
- All foreign keys are enabled; cascading/SET NULL configured to preserve data integrity.
