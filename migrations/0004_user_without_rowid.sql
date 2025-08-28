-- 0004_user_without_rowid.sql
-- Goal:
-- - Convert "User" table to WITHOUT ROWID to reduce rows_written on INSERT.
-- - Use UNIQUE(normalizedEmail) as the uniqueness constraint for normalized emails.
-- - Drop UNIQUE(email) (saves one index).
-- Note: Migration will FAIL if there are duplicate normalizedEmail values.

PRAGMA foreign_keys = OFF;

-- 1) Backfill normalizedEmail if it is NULL/empty.
UPDATE "User"
SET normalizedEmail = lower(trim(email))
WHERE (normalizedEmail IS NULL OR normalizedEmail = '');

-- 2) Create a temporary UNIQUE INDEX to ensure no duplicates before copying.
--    If duplicates exist, the statement will fail and ROLLBACK the whole migration.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_normalized_temp ON "User"(normalizedEmail);

-- 3) Create the new table WITHOUT ROWID.
--    - email: NOT NULL (no UNIQUE constraint)
--    - normalizedEmail: NOT NULL UNIQUE
--    - id: TEXT PRIMARY KEY (UUID) -> becomes the main B-tree (no extra rowid tree)
CREATE TABLE "User_new" (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  name            TEXT,
  createdAt       TEXT NOT NULL DEFAULT (datetime('now')),
  normalizedEmail TEXT NOT NULL UNIQUE
) WITHOUT ROWID;

-- 4) Copy data.
INSERT INTO "User_new"(id, email, password_hash, name, createdAt, normalizedEmail)
SELECT id, email, password_hash, name, createdAt, normalizedEmail
FROM "User";

-- 5) Rename the old table and replace it with the new one.
ALTER TABLE "User" RENAME TO "User_old";
ALTER TABLE "User_new" RENAME TO "User";

-- 6) (Optional) Drop the old table.
DROP TABLE "User_old";

PRAGMA foreign_keys = ON;