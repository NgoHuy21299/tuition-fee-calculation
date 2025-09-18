-- Migration to support multiple parents per student

-- Add studentId column to Parent table
ALTER TABLE Parent ADD COLUMN studentId TEXT;

-- Add name column to Parent table (if not exists)
-- Note: SQLite doesn't support IF NOT EXISTS for ADD COLUMN, so we'll assume it doesn't exist
ALTER TABLE Parent ADD COLUMN name TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_parent_studentId ON Parent(studentId);

-- Update existing parents with studentId from Student table
UPDATE Parent 
SET studentId = (SELECT id FROM Student WHERE parentId = Parent.id)
WHERE EXISTS (SELECT 1 FROM Student WHERE parentId = Parent.id);

-- Remove parentId column from Student table
-- Note: SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
CREATE TABLE Student_new (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    note TEXT,
    createdAt TEXT NOT NULL,
    createdByTeacher TEXT NOT NULL,
    FOREIGN KEY (createdByTeacher) REFERENCES User(id)
);

-- Copy data from old table to new table
INSERT INTO Student_new (id, name, email, phone, note, createdAt, createdByTeacher)
SELECT id, name, email, phone, note, createdAt, createdByTeacher FROM Student;

-- Drop old table and rename new table
DROP TABLE Student;
ALTER TABLE Student_new RENAME TO Student;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_createdByTeacher ON Student(createdByTeacher);
CREATE INDEX IF NOT EXISTS idx_student_name ON Student(name);
