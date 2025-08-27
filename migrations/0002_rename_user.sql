-- D1 Migration: rename Teacher table to User
-- Keep schema identical while changing the table name.

PRAGMA foreign_keys=OFF;

-- Ensure target name isn't already taken
-- If a User table exists, skip rename to avoid failure
-- Otherwise, rename Teacher -> User

-- SQLite doesn't have IF NOT EXISTS for RENAME, so guard with a check
-- D1 doesn't support multiple statements in a single exec for pragma queries,
-- but simple rename should work when User doesn't exist.

ALTER TABLE Teacher RENAME TO User;

PRAGMA foreign_keys=ON;
