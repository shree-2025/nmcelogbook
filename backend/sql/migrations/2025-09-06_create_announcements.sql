-- Announcements table for dashboards
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(20) NOT NULL,         -- 'STUDENT' or 'STAFF' (or 'ALL')
  department_id INT NULL,
  organization_id INT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_role_dept_org (role, department_id, organization_id),
  INDEX idx_created (created_at)
);
