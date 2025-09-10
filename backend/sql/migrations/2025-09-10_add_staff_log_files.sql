-- Create table to store staff activity attachments
CREATE TABLE IF NOT EXISTS staff_log_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id INT NOT NULL,
  url TEXT NOT NULL,
  content_type VARCHAR(255) NULL,
  size BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (log_id),
  CONSTRAINT fk_staff_log_files_log
    FOREIGN KEY (log_id) REFERENCES staff_logs(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
