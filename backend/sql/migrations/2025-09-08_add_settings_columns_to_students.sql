-- Add settings fields to existing students table (idempotent)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS email_opt_in TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notifications_muted TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_theme ENUM('light','dark') NOT NULL DEFAULT 'light';
