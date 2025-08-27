-- D1 Migration: initial schema
-- Create Teacher table for UC-01 authentication

PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS Teacher (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
