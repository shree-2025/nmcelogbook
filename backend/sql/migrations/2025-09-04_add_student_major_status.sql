-- Migration: Add major and status columns to students table
-- Run this against your active database (configured by DB_* in backend/.env)

ALTER TABLE students
  ADD COLUMN major VARCHAR(255) NULL AFTER email,
  ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Active' AFTER major;
