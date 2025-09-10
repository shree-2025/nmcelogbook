-- Notifications for users (Org/Dept/Staff/Student)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(20) NOT NULL, -- ORG, DEPT, STAFF, STUDENT
  target_id INT NOT NULL,     -- points to org.id / departments.id / staff.id / students.id depending on role
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  read_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_role_target (role, target_id)
);
