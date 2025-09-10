-- Create staff_logs table for staff activity submissions
CREATE TABLE IF NOT EXISTS staff_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL,
  department_id INT NOT NULL,
  organization_id INT NOT NULL,

  activity_date DATE NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  contribution VARCHAR(100) NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  admin_remark TEXT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_staff (staff_id, department_id, organization_id),
  INDEX idx_date (activity_date)
);
