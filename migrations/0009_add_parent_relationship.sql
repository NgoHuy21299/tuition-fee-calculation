-- 0009_add_parent_relationship.sql
-- Purpose: Add relationship column to Parent table to store the relationship between parent and student.
-- Context: Currently, the relationship is inferred from the parent's name prefix, but we want to store it explicitly.

PRAGMA foreign_keys=ON;

-- Add relationship column to Parent table
-- Note: SQLite doesn't support IF NOT EXISTS for ADD COLUMN, so we'll assume it doesn't exist
ALTER TABLE Parent ADD COLUMN relationship TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_parent_relationship ON Parent(relationship);

-- Add some sample data for existing parents (optional)
-- This is just for demonstration and may not be needed in production
UPDATE Parent SET relationship = 'father' WHERE name LIKE 'Bố %';
UPDATE Parent SET relationship = 'mother' WHERE name LIKE 'Mẹ %';
UPDATE Parent SET relationship = 'grandfather' WHERE name LIKE 'Ông %';
UPDATE Parent SET relationship = 'grandmother' WHERE name LIKE 'Bà %';
