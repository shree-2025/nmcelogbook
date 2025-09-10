-- Create student_logs table for student activity submissions
CREATE TABLE IF NOT EXISTS student_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  staff_id INT NULL,
  department_id INT NOT NULL,
  organization_id INT NOT NULL,
  activity_date DATE NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  detailed_description TEXT NOT NULL,
  department VARCHAR(100) NOT NULL,
  level_of_involvement VARCHAR(50) NOT NULL,
  patient_id VARCHAR(100) NOT NULL,
  age_gender VARCHAR(50) NOT NULL,
  diagnosis VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  faculty_remark TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_logs_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
