-- Create table to persist attachments for student logs
-- Idempotent: creates table if it does not exist
CREATE TABLE IF NOT EXISTS student_log_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id INT NOT NULL,
  url VARCHAR(512) NOT NULL,
  content_type VARCHAR(128) NULL,
  size BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_log_id (log_id),
  CONSTRAINT fk_student_log_files_log
    FOREIGN KEY (log_id) REFERENCES student_logs(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
