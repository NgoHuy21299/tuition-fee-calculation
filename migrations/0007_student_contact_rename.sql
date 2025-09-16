-- 0007_student_contact_rename.sql
-- Purpose: Standardize Student contact fields to `phone` and `email`.
-- Context: In 0005_domain_schema.sql the columns were created as `studentPhone` and `studentEmail`.
-- This migration renames them to `phone` and `email` for consistency with API and docs.
--
-- Notes:
-- - Cloudflare D1 (SQLite) supports `ALTER TABLE ... RENAME COLUMN ...`.
-- - If your database was initialized after this rename was already applied, running this migration will error.
--   In that case, you can mark it as applied manually, or adjust it to no-op for your environment.

PRAGMA foreign_keys=ON;

-- Rename columns (will fail if legacy columns do not exist)
ALTER TABLE Student RENAME COLUMN studentPhone TO phone;
ALTER TABLE Student RENAME COLUMN studentEmail TO email;
