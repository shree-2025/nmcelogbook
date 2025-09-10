-- Add avatar_url columns to organizations and departments if not exist
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) NULL;

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) NULL;
