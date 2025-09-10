-- Create student_settings table for notification/email/theme preferences
CREATE TABLE IF NOT EXISTS student_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  email_opt_in TINYINT(1) NOT NULL DEFAULT 1,
  notifications_muted TINYINT(1) NOT NULL DEFAULT 0,
  default_theme ENUM('light','dark') NOT NULL DEFAULT 'light',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_settings_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
