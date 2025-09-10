-- Add avatar URL field to existing students table (idempotent)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) NULL;
