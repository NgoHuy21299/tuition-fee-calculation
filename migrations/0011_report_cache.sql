-- Migration: 0011_report_cache.sql
-- Description: Add ReportCache table for caching monthly reports

CREATE TABLE IF NOT EXISTS ReportCache (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    teacherId TEXT NOT NULL,
    classId TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    payload TEXT NOT NULL, -- JSON of the computed report
    computedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacherId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (classId) REFERENCES Class(id) ON DELETE CASCADE,
    UNIQUE(teacherId, classId, year, month)
);

-- Index for fast lookups
CREATE INDEX idx_report_cache_lookup ON ReportCache(teacherId, classId, year, month);
CREATE INDEX idx_report_cache_computed_at ON ReportCache(computedAt);