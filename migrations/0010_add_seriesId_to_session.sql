-- Migration: Add seriesId column to Session table for grouping recurring sessions
-- UC-04: Sessions management - lightweight grouping approach

ALTER TABLE Session ADD COLUMN seriesId TEXT NULL;

-- Add index for efficient queries on seriesId
CREATE INDEX IF NOT EXISTS idx_session_seriesId ON Session(seriesId);