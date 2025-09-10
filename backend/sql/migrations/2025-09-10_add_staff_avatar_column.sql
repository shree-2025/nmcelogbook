-- Add avatar_url column to staff if it does not exist
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) NULL;
