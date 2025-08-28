-- Add normalizedEmail column to User table
ALTER TABLE User ADD COLUMN normalizedEmail TEXT;

-- Create a unique index on normalizedEmail to ensure no duplicates
CREATE UNIQUE INDEX idx_user_normalized_email ON User(normalizedEmail);

-- Populate normalizedEmail with existing data
UPDATE User SET normalizedEmail = LOWER(TRIM(email));