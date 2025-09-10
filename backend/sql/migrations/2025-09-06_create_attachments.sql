-- Unified attachments table for all roles and submission types
-- Supports attaching documents to any submission entity (e.g., student_logs, staff_logs, announcements, etc.)
-- Storage strategy is deferred: store provider/key/url metadata only; actual file storage can be local/S3 later.

CREATE TABLE IF NOT EXISTS attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_type VARCHAR(50) NOT NULL,   -- e.g., 'student_log', 'staff_log', 'announcement'
  submission_id INT NOT NULL,
  uploader_role VARCHAR(20) NOT NULL,     -- 'STUDENT', 'STAFF', 'DEPT', 'ORG', 'MASTER'
  uploader_id INT NOT NULL,

  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT NOT NULL,

  storage_provider VARCHAR(30) NOT NULL DEFAULT 'local', -- 'local', 's3', 'gcs', etc.
  storage_key VARCHAR(512) NULL,                         -- path/key in provider
  url TEXT NULL,                                         -- optional signed/public URL

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_submission (submission_type, submission_id),
  INDEX idx_uploader (uploader_role, uploader_id)
);
