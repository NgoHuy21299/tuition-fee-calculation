-- Migration: 0012_fix_report_cache_adhoc.sql
-- Description: Fix ReportCache to support NULL classId for ad-hoc reports

-- Drop the existing foreign key constraint and recreate the table
-- SQLite doesn't support ALTER TABLE to drop constraints, so we need to recreate

-- Create backup table
CREATE TABLE ReportCache_backup AS SELECT * FROM ReportCache;

-- Drop original table
DROP TABLE ReportCache;

-- Recreate table with nullable classId and modified foreign key
CREATE TABLE ReportCache (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    teacherId TEXT NOT NULL,
    classId TEXT,  -- Now nullable for ad-hoc reports
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    payload TEXT NOT NULL, -- JSON of the computed report
    computedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacherId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (classId) REFERENCES Class(id) ON DELETE CASCADE,
    UNIQUE(teacherId, classId, year, month)
);

-- Restore data
INSERT INTO ReportCache (id, teacherId, classId, year, month, payload, computedAt)
SELECT id, teacherId, classId, year, month, payload, computedAt FROM ReportCache_backup;

-- Drop backup table
DROP TABLE ReportCache_backup;

-- Recreate indexes
CREATE INDEX idx_report_cache_lookup ON ReportCache(teacherId, classId, year, month);
CREATE INDEX idx_report_cache_computed_at ON ReportCache(computedAt);