-- Run this on your smartpermit_db database to apply RBAC changes

USE smartpermit_db;

-- 1. Temporarily change the role column to VARCHAR to safely migrate existing data
ALTER TABLE users MODIFY COLUMN role VARCHAR(50);

-- 2. Update all existing users to use the new role format
UPDATE users SET role = 'business_owner' WHERE role = 'Business Owner' OR role = '' OR role IS NULL;

-- 3. Enforce the strict ENUM constraints
ALTER TABLE users 
  MODIFY COLUMN role ENUM('business_owner', 'lgu_admin', 'system_admin') DEFAULT 'business_owner',
  MODIFY COLUMN status ENUM('active', 'inactive') DEFAULT 'active';

-- Create a default System Administrator account (password must be set via environment variable or secure provisioning)
-- INSERT IGNORE INTO users (full_name, email, contact_number, password, role, status)
-- VALUES (
--   'System Administrator',
--   'admin@bizcheckpermit.gov.ph',
--   '09000000000',
--   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: Admin@12345 (bcrypt hash)
--   'system_admin',
--   'active'
-- );

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  action VARCHAR(255) NOT NULL,
  details TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
