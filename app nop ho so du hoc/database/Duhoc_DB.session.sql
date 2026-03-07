CREATE DATABASE IF NOT EXISTS du_hoc_db;
USE du_hoc_db;
DROP TABLE IF EXISTS student_documents;
DROP TABLE IF EXISTS students;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    role_id INT NULL,
    account_status ENUM('pending', 'active', 'rejected') NOT NULL DEFAULT 'active',
    password_salt VARCHAR(64) NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    first_name VARCHAR(100) DEFAULT '',
    last_name VARCHAR(100) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    phone VARCHAR(30) DEFAULT '',
    birthday VARCHAR(50) DEFAULT '',
    nationality VARCHAR(100) DEFAULT '',
    current_level VARCHAR(150) DEFAULT '',
    target_label VARCHAR(255) DEFAULT '',
    address VARCHAR(255) DEFAULT '',
    is_completed TINYINT(1) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_profile_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    doc_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) DEFAULT '',
    file_size VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_docs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS security_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT '',
    color VARCHAR(40) DEFAULT 'blue',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_access_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    requested_role_id INT NOT NULL,
    request_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_role_id) REFERENCES security_roles(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS security_user_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resource VARCHAR(80) NOT NULL,
    can_view TINYINT(1) NOT NULL DEFAULT 0,
    can_edit TINYINT(1) NOT NULL DEFAULT 0,
    can_delete TINYINT(1) NOT NULL DEFAULT 0,
    can_approve TINYINT(1) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_resource (user_id, resource),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO security_roles (id, name, description, color) VALUES
    (1, 'Tư vấn viên', 'Tu van lo trinh va cham soc ho so du hoc.', 'blue'),
    (2, 'Kế tóan', 'Theo doi hoc phi, le phi va doi soat thanh toan.', 'purple'),
    (3, 'Xử lý hồ sơ', 'Quan ly giay to, visa va tien do ho so.', 'amber'),
    (4, 'Quản trị hệ thống', 'Toan quyen cau hinh va phe duyet nghiep vu bao mat.', 'slate'),
    (5, 'Sinh viên', 'Tai khoan hoc sinh can duoc kich hoat truoc khi su dung.', 'blue')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    color = VALUES(color);

-- Runtime seed in backend/server.js ensures this super admin always exists:
-- Email: admin@gmail.com
-- Password: 123456
