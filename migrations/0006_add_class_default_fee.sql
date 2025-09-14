-- 0006_add_class_default_fee.sql
-- Purpose: Add default fee configuration at Class level to prefill new sessions.
-- Notes: Existing rows will have NULL (no default); app can handle by requiring input or falling back.

PRAGMA foreign_keys=ON;

ALTER TABLE Class ADD COLUMN defaultFeePerSession INTEGER; -- nullable; currency minor units (e.g., VND as integer)

-- Optional: future index not necessary; it's used only on read when creating sessions.
