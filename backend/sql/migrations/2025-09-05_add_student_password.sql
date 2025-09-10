-- Migration: Add password fields for students to enable login
ALTER TABLE students
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER status,
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1 AFTER password_hash;
