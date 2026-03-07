const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const SUPER_ADMIN = {
    fullName: 'System Super Admin',
    email: 'admin@gmail.com',
    password: '123456',
    role: 'admin',
    roleId: 4,
    accountStatus: 'active'
};

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'du_hoc_db'
});

db.connect((err) => {
    if (err) {
        console.error('MySQL connection error:', err.message);
        return;
    }

    console.log('Connected to database: du_hoc_db');
    const ensureUsersTableSql = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
            account_status ENUM('pending', 'active', 'rejected') NOT NULL DEFAULT 'active',
            password_salt VARCHAR(64) NOT NULL,
            password_hash VARCHAR(128) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.query(ensureUsersTableSql, (tableErr) => {
        if (tableErr) {
            console.error('Ensure users table error:', tableErr.message);
            return;
        }
        console.log('Users table is ready.');

        const ensureAccountStatusColumnSql = `
            ALTER TABLE users
            ADD COLUMN account_status ENUM('pending', 'active', 'rejected') NOT NULL DEFAULT 'active'
        `;

        db.query(ensureAccountStatusColumnSql, (alterStatusErr) => {
            if (alterStatusErr) {
                if (alterStatusErr.code === 'ER_DUP_FIELDNAME') {
                    console.log('account_status column already exists.');
                    return;
                }
                console.error('Ensure account_status column error:', alterStatusErr.message);
                return;
            }
            console.log('account_status column is ready.');
        });
    });

    const ensureProfilesTableSql = `
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
            assigned_staff_name VARCHAR(255) DEFAULT '',
            address VARCHAR(255) DEFAULT '',
            is_completed TINYINT(1) NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    db.query(ensureProfilesTableSql, (profileErr) => {
        if (profileErr) {
            console.error('Ensure student_profiles table error:', profileErr.message);
            return;
        }
        console.log('Student profiles table is ready.');

        const ensureAssignedStaffColumnSql = `
            ALTER TABLE student_profiles
            ADD COLUMN assigned_staff_name VARCHAR(255) DEFAULT ''
        `;
        db.query(ensureAssignedStaffColumnSql, (alterErr) => {
            if (alterErr) {
                if (alterErr.code === 'ER_DUP_FIELDNAME') {
                    console.log('assigned_staff_name column already exists.');
                    return;
                }
                console.error('Ensure assigned_staff_name column error:', alterErr.message);
                return;
            }
            console.log('assigned_staff_name column is ready.');
        });
    });

    const ensureProfileDocsTableSql = `
        CREATE TABLE IF NOT EXISTS student_profile_documents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            doc_name VARCHAR(255) NOT NULL,
            file_name VARCHAR(255) DEFAULT '',
            file_size VARCHAR(50) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_profile_docs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    db.query(ensureProfileDocsTableSql, (docsErr) => {
        if (docsErr) {
            console.error('Ensure student_profile_documents table error:', docsErr.message);
            return;
        }
        console.log('Student profile documents table is ready.');
    });

    (async () => {
        try {
            await ensureSecuritySchema();
            await ensureSuperAdminAccount();
            console.log(`Super admin seed is ready: ${SUPER_ADMIN.email}`);
        } catch (bootstrapErr) {
            console.error('Security bootstrap error:', bootstrapErr.message);
        }
    })();
});

app.get('/api/student/profile/:userId', (req, res) => {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ message: 'userId khong hop le.' });

    const sqlProfile = 'SELECT * FROM student_profiles WHERE user_id = ? LIMIT 1';
    db.query(sqlProfile, [userId], (err, profileRows) => {
        if (err) return res.status(500).json({ message: 'Loi lay profile.', error: err.message });

        const profile = profileRows[0] || null;
        const sqlDocs = 'SELECT doc_name, file_name, file_size FROM student_profile_documents WHERE user_id = ? ORDER BY id ASC';
        db.query(sqlDocs, [userId], (docsErr, docRows) => {
            if (docsErr) return res.status(500).json({ message: 'Loi lay tai lieu.', error: docsErr.message });
            return res.json({ profile, documents: docRows || [] });
        });
    });
});

app.post('/api/student/profile', (req, res) => {
    const {
        userId,
        firstName = '',
        lastName = '',
        email = '',
        phone = '',
        birthday = '',
        nationality = '',
        currentLevel = '',
        targetLabel = '',
        address = ''
    } = req.body;

    if (!userId) return res.status(400).json({ message: 'Thieu userId.' });

    const sql = `
        INSERT INTO student_profiles
            (user_id, first_name, last_name, email, phone, birthday, nationality, current_level, target_label, address, is_completed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            email = VALUES(email),
            phone = VALUES(phone),
            birthday = VALUES(birthday),
            nationality = VALUES(nationality),
            current_level = VALUES(current_level),
            target_label = VALUES(target_label),
            address = VALUES(address)
    `;

    db.query(
        sql,
        [userId, firstName, lastName, email, phone, birthday, nationality, currentLevel, targetLabel, address],
        (err) => {
            if (err) return res.status(500).json({ message: 'Loi luu profile.', error: err.message });
            return res.json({ message: 'Da luu thong tin ca nhan.' });
        }
    );
});

app.post('/api/student/documents', (req, res) => {
    const { userId, documents = [] } = req.body;
    if (!userId) return res.status(400).json({ message: 'Thieu userId.' });

    const sqlDelete = 'DELETE FROM student_profile_documents WHERE user_id = ?';
    db.query(sqlDelete, [userId], (delErr) => {
        if (delErr) return res.status(500).json({ message: 'Loi xoa tai lieu cu.', error: delErr.message });

        if (!documents.length) return res.json({ message: 'Da cap nhat tai lieu (rong).' });

        const values = documents.map((doc) => [
            userId,
            doc.docName || '',
            doc.fileName || '',
            doc.fileSize || ''
        ]);

        const sqlInsert = 'INSERT INTO student_profile_documents (user_id, doc_name, file_name, file_size) VALUES ?';
        db.query(sqlInsert, [values], (insErr) => {
            if (insErr) return res.status(500).json({ message: 'Loi luu tai lieu.', error: insErr.message });
            return res.json({ message: 'Da luu danh sach tai lieu.' });
        });
    });
});

app.post('/api/student/complete', (req, res) => {
    const { userId, isCompleted = 1 } = req.body;
    if (!userId) return res.status(400).json({ message: 'Thieu userId.' });

    const sql = 'UPDATE student_profiles SET is_completed = ? WHERE user_id = ?';
    db.query(sql, [isCompleted ? 1 : 0, userId], (err) => {
        if (err) return res.status(500).json({ message: 'Loi cap nhat trang thai ho so.', error: err.message });
        return res.json({ message: 'Da cap nhat trang thai hoan tat.' });
    });
});

app.post('/api/admin/find-student-docs', (req, res) => {
    const { fullName, phone } = req.body;
    const normalizedName = (fullName || '').trim().toLowerCase();
    const normalizedPhone = (phone || '').trim();

    if (!normalizedName || !normalizedPhone) {
        return res.status(400).json({ message: 'Vui long nhap ho ten va so dien thoai.' });
    }

    const sqlFindStudent = `
        SELECT
            u.id AS user_id,
            u.full_name,
            u.email AS account_email,
            sp.phone,
            sp.first_name,
            sp.last_name,
            sp.email AS profile_email,
            sp.birthday,
            sp.nationality,
            sp.current_level,
            sp.target_label,
            sp.address,
            sp.is_completed
        FROM users u
        INNER JOIN student_profiles sp ON sp.user_id = u.id
        WHERE LOWER(TRIM(u.full_name)) = ?
          AND TRIM(sp.phone) = ?
        LIMIT 1
    `;

    db.query(sqlFindStudent, [normalizedName, normalizedPhone], (findErr, studentRows) => {
        if (findErr) {
            return res.status(500).json({ message: 'Loi tim sinh vien.', error: findErr.message });
        }
        if (!studentRows.length) {
            return res.status(404).json({ message: 'Khong tim thay sinh vien voi ho ten + so dien thoai nay.' });
        }

        const student = studentRows[0];
        const sqlDocs = `
            SELECT doc_name, file_name, file_size, created_at, updated_at
            FROM student_profile_documents
            WHERE user_id = ?
            ORDER BY id ASC
        `;
        db.query(sqlDocs, [student.user_id], (docErr, docsRows) => {
            if (docErr) {
                return res.status(500).json({ message: 'Loi lay tai lieu sinh vien.', error: docErr.message });
            }

            return res.json({
                student: {
                    userId: student.user_id,
                    fullName: student.full_name,
                    email: student.profile_email || student.account_email,
                    phone: student.phone,
                    firstName: student.first_name,
                    lastName: student.last_name,
                    birthday: student.birthday,
                    nationality: student.nationality,
                    currentLevel: student.current_level,
                    targetLabel: student.target_label,
                    address: student.address,
                    isCompleted: student.is_completed
                },
                documents: docsRows || []
            });
        });
    });
});

app.get('/api/admin/students', (req, res) => {
    const fullName = (req.query.fullName || '').toString().trim().toLowerCase();
    const phone = (req.query.phone || '').toString().trim();
    const status = (req.query.status || '').toString().trim().toLowerCase();
    const currentLevel = (req.query.currentLevel || '').toString().trim();
    const assignedStaffName = (req.query.assignedStaffName || '').toString().trim();
    const date = (req.query.date || '').toString().trim();
    const checkColumnSql = `
        SELECT COUNT(*) AS count_col
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'student_profiles'
          AND COLUMN_NAME = 'assigned_staff_name'
    `;

    db.query(checkColumnSql, (checkErr, checkRows) => {
        if (checkErr) {
            return res.status(500).json({ message: 'Loi kiem tra cau truc bang.', error: checkErr.message });
        }

        const hasAssignedStaffColumn = Number(checkRows?.[0]?.count_col || 0) > 0;
        const assignedSelect = hasAssignedStaffColumn
            ? "COALESCE(sp.assigned_staff_name, '') AS assigned_staff_name"
            : "'' AS assigned_staff_name";

        const sql = `
            SELECT
                u.id AS user_id,
                u.full_name,
                u.email AS account_email,
                sp.first_name,
                sp.last_name,
                sp.phone,
                sp.current_level,
                ${assignedSelect},
                sp.is_completed,
                sp.updated_at,
                (
                    SELECT COUNT(*)
                    FROM student_profile_documents d
                    WHERE d.user_id = u.id
                      AND TRIM(COALESCE(d.file_name, '')) <> ''
                ) AS document_count
            FROM users u
            INNER JOIN student_profiles sp ON sp.user_id = u.id
            WHERE u.role = 'student'
              AND COALESCE(u.account_status, 'active') = 'active'
              AND (? = '' OR LOWER(TRIM(u.full_name)) LIKE CONCAT('%', ?, '%'))
              AND (? = '' OR TRIM(sp.phone) LIKE CONCAT('%', ?, '%'))
            ORDER BY sp.updated_at DESC, u.id DESC
        `;

        db.query(sql, [fullName, fullName, phone, phone], (err, rows) => {
            if (err) {
                return res.status(500).json({ message: 'Loi lay danh sach sinh vien.', error: err.message });
            }
            let students = (rows || []).map((r) => {
                const documentCount = Number(r.document_count || 0);
                const statusKey = r.is_completed ? 'completed' : (documentCount > 0 ? 'processing' : 'received');
                return {
                    userId: r.user_id,
                    fullName: r.full_name,
                    email: r.account_email,
                    firstName: r.first_name,
                    lastName: r.last_name,
                    phone: r.phone,
                    currentLevel: r.current_level,
                    assignedStaffName: r.assigned_staff_name || '',
                    isCompleted: r.is_completed,
                    documentCount,
                    updatedAt: r.updated_at,
                    statusKey
                };
            });

            if (currentLevel) {
                students = students.filter((s) => (s.currentLevel || '').trim().toLowerCase() === currentLevel.trim().toLowerCase());
            }
            if (assignedStaffName) {
                students = students.filter((s) => (s.assignedStaffName || '').trim().toLowerCase() === assignedStaffName.trim().toLowerCase());
            }
            if (status) {
                students = students.filter((s) => s.statusKey === status);
            }
            if (date) {
                students = students.filter((s) => {
                    if (!s.updatedAt) return false;
                    const d = new Date(s.updatedAt);
                    if (Number.isNaN(d.getTime())) return false;
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}` === date;
                });
            }

            return res.json({ students });
        });
    });
});

app.get('/api/admin/staff-options', (req, res) => {
    const sql = `
        SELECT DISTINCT TRIM(full_name) AS full_name
        FROM users
        WHERE role = 'admin'
          AND COALESCE(account_status, 'active') = 'active'
          AND TRIM(COALESCE(full_name, '')) <> ''
        ORDER BY full_name ASC
    `;
    db.query(sql, (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Loi lay danh sach nhan vien.', error: err.message });
        }
        const staffNames = (rows || []).map((r) => r.full_name).filter(Boolean);
        return res.json({ staffNames });
    });
});

app.get('/api/admin/student/:userId', (req, res) => {
    const userId = Number(req.params.userId);
    if (!userId) {
        return res.status(400).json({ message: 'userId khong hop le.' });
    }

    const sqlStudent = `
        SELECT
            u.id AS user_id,
            u.full_name,
            u.email AS account_email,
            sp.first_name,
            sp.last_name,
            sp.email AS profile_email,
            sp.phone,
            sp.birthday,
            sp.nationality,
            sp.current_level,
            sp.target_label,
            sp.assigned_staff_name,
            sp.address,
            sp.is_completed
        FROM users u
        INNER JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.id = ? AND u.role = 'student'
          AND COALESCE(u.account_status, 'active') = 'active'
        LIMIT 1
    `;

    db.query(sqlStudent, [userId], (studentErr, studentRows) => {
        if (studentErr) {
            return res.status(500).json({ message: 'Loi lay thong tin sinh vien.', error: studentErr.message });
        }
        if (!studentRows.length) {
            return res.status(404).json({ message: 'Khong tim thay sinh vien.' });
        }

        const s = studentRows[0];
        const sqlDocs = `
            SELECT doc_name, file_name, file_size, created_at, updated_at
            FROM student_profile_documents
            WHERE user_id = ?
            ORDER BY id ASC
        `;
        db.query(sqlDocs, [userId], (docErr, docsRows) => {
            if (docErr) {
                return res.status(500).json({ message: 'Loi lay tai lieu sinh vien.', error: docErr.message });
            }
            return res.json({
                student: {
                    userId: s.user_id,
                    fullName: s.full_name,
                    firstName: s.first_name,
                    lastName: s.last_name,
                    email: s.profile_email || s.account_email,
                    phone: s.phone,
                    birthday: s.birthday,
                    nationality: s.nationality,
                    currentLevel: s.current_level,
                    targetLabel: s.target_label,
                    assignedStaffName: s.assigned_staff_name || '',
                    address: s.address,
                    isCompleted: s.is_completed
                },
                documents: docsRows || []
            });
        });
    });
});

app.post('/api/admin/assign-staff', (req, res) => {
    const { userId, assignedStaffName = '' } = req.body;
    const normalizedUserId = Number(userId);
    if (!normalizedUserId) {
        return res.status(400).json({ message: 'userId khong hop le.' });
    }

    const sql = `
        UPDATE student_profiles
        SET assigned_staff_name = ?
        WHERE user_id = ?
    `;
    db.query(sql, [assignedStaffName.trim(), normalizedUserId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Loi cap nhat nhan vien phu trach.', error: err.message });
        }
        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Khong tim thay ho so sinh vien de cap nhat.' });
        }
        return res.json({ message: 'Da cap nhat nhan vien phu trach.' });
    });
});

// Backward-compatible endpoint for old UI screens.
app.post('/api/get-all-student-docs', (req, res) => {
    const { fullName, phone } = req.body;
    const normalizedName = (fullName || '').trim().toLowerCase();
    const normalizedPhone = (phone || '').trim();

    if (!normalizedName || !normalizedPhone) {
        return res.status(400).send('Vui long nhap ho ten va so dien thoai.');
    }

    const sqlFindStudent = `
        SELECT
            u.id AS user_id,
            u.full_name,
            u.email AS account_email,
            sp.phone
        FROM users u
        INNER JOIN student_profiles sp ON sp.user_id = u.id
        WHERE LOWER(TRIM(u.full_name)) = ?
          AND TRIM(sp.phone) = ?
        LIMIT 1
    `;

    db.query(sqlFindStudent, [normalizedName, normalizedPhone], (findErr, studentRows) => {
        if (findErr) return res.status(500).send(findErr.message);
        if (!studentRows.length) return res.status(404).send('Khong tim thay sinh vien!');

        const student = studentRows[0];
        const sqlDocs = `
            SELECT doc_name, file_name, file_size
            FROM student_profile_documents
            WHERE user_id = ?
            ORDER BY id ASC
        `;
        db.query(sqlDocs, [student.user_id], (docErr, docsRows) => {
            if (docErr) return res.status(500).send(docErr.message);
            const allDocs = (docsRows || []).map((d) => ({
                doc_name: d.doc_name,
                file_path: d.file_name,
                file_size: d.file_size,
                step: 1,
                is_submitted: d.file_name && d.file_name.trim() !== '' ? 1 : 0
            }));

            return res.json({
                student: {
                    full_name: student.full_name,
                    email: student.account_email,
                    phone: student.phone
                },
                allDocs
            });
        });
    });
});

function scryptHash(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(derivedKey.toString('hex'));
        });
    });
}

app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, password, role } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedRole = role === 'admin' ? 'admin' : 'student';
    const requestedRoleId = normalizedRole === 'admin' ? 4 : 5;

    if (!fullName || !normalizedEmail || !password) {
        return res.status(400).json({ message: 'Thieu thong tin dang ky.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Mat khau phai co it nhat 6 ky tu.' });
    }
    try {
        await ensureSecuritySchema();
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = await scryptHash(password, salt);

        const sql = `
            INSERT INTO users (full_name, email, role, role_id, account_status, password_salt, password_hash)
            VALUES (?, ?, ?, ?, 'pending', ?, ?)
        `;
        db.query(sql, [fullName.trim(), normalizedEmail, normalizedRole, requestedRoleId, salt, passwordHash], async (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Email da ton tai.' });
                }
                return res.status(500).json({ message: 'Khong the tao tai khoan.', error: err.message });
            }

            try {
                await securityQuery(
                    `
                        INSERT INTO security_access_requests (user_id, requested_role_id, request_status)
                        VALUES (?, ?, 'pending')
                    `,
                    [result.insertId, requestedRoleId]
                );

                return res.status(201).json({
                    message: normalizedRole === 'student'
                        ? 'Dang ky thanh cong. Tai khoan sinh vien dang cho phe duyet.'
                        : 'Dang ky thanh cong. Tai khoan quan tri dang cho phe duyet.',
                    user: {
                        id: result.insertId,
                        fullName: fullName.trim(),
                        email: normalizedEmail,
                        role: normalizedRole,
                        accountStatus: 'pending'
                    }
                });
            } catch (securityErr) {
                return res.status(500).json({ message: 'Khong the tao yeu cau phe duyet.', error: securityErr.message });
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Loi xu ly mat khau.', error: error.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password, role } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedRole = role === 'admin' ? 'admin' : 'student';

    if (!normalizedEmail || !password) {
        return res.status(400).json({ message: 'Vui long nhap email va mat khau.' });
    }

    const sql = 'SELECT id, full_name, email, role, role_id, account_status, password_salt, password_hash FROM users WHERE email = ? AND role = ? LIMIT 1';
    db.query(sql, [normalizedEmail, normalizedRole], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Loi truy van dang nhap.', error: err.message });
        }
        if (results.length === 0) {
            return res.status(401).json({ message: 'Email, mat khau hoac vai tro khong dung.' });
        }

        const user = results[0];
        try {
            const inputHash = await scryptHash(password, user.password_salt);
            if (inputHash !== user.password_hash) {
                return res.status(401).json({ message: 'Email, mat khau hoac vai tro khong dung.' });
            }

            if (user.account_status === 'pending') {
                return res.status(403).json({ message: 'Tai khoan cua ban dang cho duoc phe duyet. Vui long lien he quan tri vien.' });
            }

            if (user.account_status === 'rejected') {
                return res.status(403).json({ message: 'Tai khoan cua ban da bi tu choi. Vui long dang ky lai hoac lien he quan tri vien.' });
            }

            return res.json({
                message: 'Dang nhap thanh cong.',
                user: {
                    id: user.id,
                    fullName: user.full_name,
                    email: user.email,
                    role: user.role,
                    accountStatus: user.account_status
                }
            });
        } catch (hashErr) {
            return res.status(500).json({ message: 'Loi xac thuc mat khau.', error: hashErr.message });
        }
    });
});

function securityQuery(sql, values = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, values, (err, results) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(results);
        });
    });
}

async function ensureSecuritySchema() {
    await securityQuery(`
        CREATE TABLE IF NOT EXISTS security_roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL UNIQUE,
            description VARCHAR(255) DEFAULT '',
            color VARCHAR(40) DEFAULT 'blue',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await securityQuery(`
        CREATE TABLE IF NOT EXISTS security_access_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            requested_role_id INT NOT NULL,
            request_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP NULL DEFAULT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (requested_role_id) REFERENCES security_roles(id) ON DELETE RESTRICT
        )
    `);

    await securityQuery(`
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
        )
    `);

    try {
        await securityQuery("ALTER TABLE users ADD COLUMN role_id INT NULL");
    } catch (error) {
        if (error.code !== 'ER_DUP_FIELDNAME') {
            throw error;
        }
    }

    try {
        await securityQuery("ALTER TABLE users ADD COLUMN account_status ENUM('pending', 'active', 'rejected') NOT NULL DEFAULT 'active'");
    } catch (error) {
        if (error.code !== 'ER_DUP_FIELDNAME') {
            throw error;
        }
    }

    const roles = [
        [1, 'Tu van vien', 'Tu van lo trinh va cham soc ho so du hoc.', 'blue'],
        [2, 'Ke toan', 'Theo doi hoc phi, le phi va doi soat thanh toan.', 'purple'],
        [3, 'Xu ly ho so', 'Quan ly giay to, visa va tien do ho so.', 'amber'],
        [4, 'Quan tri he thong', 'Toan quyen cau hinh va phe duyet nghiep vu bao mat.', 'slate'],
        [5, 'Sinh vien', 'Tai khoan hoc sinh can duoc kich hoat truoc khi su dung.', 'blue']
    ];

    for (const role of roles) {
        await securityQuery(
            `
                INSERT INTO security_roles (id, name, description, color)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    description = VALUES(description),
                    color = VALUES(color)
            `,
            role
        );
    }

    await securityQuery(`
        UPDATE users
        SET role_id = 4
        WHERE role = 'admin' AND role_id IS NULL
    `);
}

async function ensureSuperAdminAccount() {
    await ensureSecuritySchema();

    const salt = crypto
        .createHash('sha256')
        .update(`seed:${SUPER_ADMIN.email}`)
        .digest('hex')
        .slice(0, 32);
    const passwordHash = await scryptHash(SUPER_ADMIN.password, salt);

    const existingRows = await securityQuery(
        `
            SELECT id
            FROM users
            WHERE email = ?
            LIMIT 1
        `,
        [SUPER_ADMIN.email]
    );

    let superAdminUserId = existingRows[0]?.id || null;

    if (!superAdminUserId) {
        const insertResult = await securityQuery(
            `
                INSERT INTO users (
                    full_name,
                    email,
                    role,
                    role_id,
                    account_status,
                    password_salt,
                    password_hash
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                SUPER_ADMIN.fullName,
                SUPER_ADMIN.email,
                SUPER_ADMIN.role,
                SUPER_ADMIN.roleId,
                SUPER_ADMIN.accountStatus,
                salt,
                passwordHash
            ]
        );
        superAdminUserId = insertResult.insertId;
    } else {
        await securityQuery(
            `
                UPDATE users
                SET
                    full_name = ?,
                    role = ?,
                    role_id = ?,
                    account_status = ?,
                    password_salt = ?,
                    password_hash = ?
                WHERE id = ?
            `,
            [
                SUPER_ADMIN.fullName,
                SUPER_ADMIN.role,
                SUPER_ADMIN.roleId,
                SUPER_ADMIN.accountStatus,
                salt,
                passwordHash,
                superAdminUserId
            ]
        );
    }

    for (const resource of ['finance', 'visa_documents', 'student_data']) {
        await securityQuery(
            `
                INSERT INTO security_user_permissions (
                    user_id,
                    resource,
                    can_view,
                    can_edit,
                    can_delete,
                    can_approve
                )
                VALUES (?, ?, 1, 1, 1, 1)
                ON DUPLICATE KEY UPDATE
                    can_view = 1,
                    can_edit = 1,
                    can_delete = 1,
                    can_approve = 1
            `,
            [superAdminUserId, resource]
        );
    }

    await securityQuery(
        `
            UPDATE security_access_requests
            SET request_status = 'approved', reviewed_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `,
        [superAdminUserId]
    );
}

function normalizeSecurityPermissions(rows) {
    const map = new Map((rows || []).map((row) => [row.resource, row]));
    return [
        { resource: 'finance', label: 'Tai chinh' },
        { resource: 'visa_documents', label: 'Visa va Ho so' },
        { resource: 'student_data', label: 'Du lieu hoc sinh' }
    ].map((resource) => {
        const current = map.get(resource.resource) || {};
        return {
            resource: resource.resource,
            label: resource.label,
            view: Boolean(current.view ?? current.can_view),
            edit: Boolean(current.edit ?? current.can_edit),
            delete: Boolean(current.delete ?? current.can_delete),
            approve: Boolean(current.approve ?? current.can_approve)
        };
    });
}

app.get('/api/security/pending-requests', async (_req, res) => {
    try {
        await ensureSecuritySchema();
        const rows = await securityQuery(`
            SELECT
                sar.id,
                sar.user_id AS userId,
                COALESCE(u.full_name, CONCAT('User #', sar.user_id)) AS name,
                COALESCE(u.email, '') AS email,
                sar.requested_role_id AS requestedRoleId,
                sr.name AS requestedRoleName,
                sar.request_status AS status,
                sar.requested_at AS requestDate
            FROM security_access_requests sar
            LEFT JOIN users u ON u.id = sar.user_id
            INNER JOIN security_roles sr ON sr.id = sar.requested_role_id
            WHERE sar.request_status = 'pending'
            ORDER BY sar.requested_at DESC, sar.id DESC
        `);
        return res.json({ requests: rows || [] });
    } catch (error) {
        return res.status(500).json({ message: 'Khong the tai danh sach yeu cau truy cap.', error: error.message });
    }
});

async function approveSecurityRequest(req, res) {
    const requestId = Number(req.body?.requestId || 0);
    if (!requestId) {
        return res.status(400).json({ message: 'Thieu requestId hop le.' });
    }

    try {
        await ensureSecuritySchema();
        const rows = await securityQuery(
            `
                SELECT user_id AS userId, requested_role_id AS requestedRoleId
                FROM security_access_requests
                WHERE id = ? AND request_status = 'pending'
                LIMIT 1
            `,
            [requestId]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'Yeu cau truy cap khong ton tai hoac da duoc xu ly.' });
        }

        await securityQuery(
            `
                UPDATE security_access_requests
                SET request_status = 'approved', reviewed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `,
            [requestId]
        );

        await securityQuery(
            `
                UPDATE users
                SET role_id = ?,
                    role = CASE WHEN ? = 5 THEN 'student' ELSE 'admin' END,
                    account_status = 'active'
                WHERE id = ?
            `,
            [rows[0].requestedRoleId, rows[0].requestedRoleId, rows[0].userId]
        );

        return res.json({ message: 'Da phe duyet yeu cau.' });
    } catch (error) {
        return res.status(500).json({ message: 'Khong the phe duyet yeu cau.', error: error.message });
    }
}

app.post('/api/security/approve', approveSecurityRequest);

app.post('/api/security/approve-request', async (req, res) => {
    return approveSecurityRequest(req, res);
});

async function rejectSecurityRequest(req, res) {
    const requestId = Number(req.body?.requestId || 0);
    if (!requestId) {
        return res.status(400).json({ message: 'Thieu requestId hop le.' });
    }

    try {
        await ensureSecuritySchema();
        const rows = await securityQuery(
            `
                SELECT user_id AS userId
                FROM security_access_requests
                WHERE id = ? AND request_status = 'pending'
                LIMIT 1
            `,
            [requestId]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'Yeu cau truy cap khong ton tai hoac da duoc xu ly.' });
        }

        await securityQuery(
            `
                UPDATE security_access_requests
                SET request_status = 'rejected', reviewed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `,
            [requestId]
        );
        await securityQuery(
            `
                UPDATE users
                SET account_status = 'rejected'
                WHERE id = ?
            `,
            [rows[0].userId]
        );
        return res.json({ message: 'Da tu choi yeu cau.' });
    } catch (error) {
        return res.status(500).json({ message: 'Khong the tu choi yeu cau.', error: error.message });
    }
}

app.post('/api/security/reject', rejectSecurityRequest);

app.post('/api/security/reject-request', async (req, res) => {
    return rejectSecurityRequest(req, res);
});

app.get('/api/security/users', async (req, res) => {
    const search = (req.query.search || '').toString().trim().toLowerCase();
    const department = (req.query.department || '').toString().trim().toLowerCase();

    try {
        await ensureSecuritySchema();
        const rows = await securityQuery(
            `
                SELECT
                    u.id,
                    u.full_name AS name,
                    u.email,
                    u.role_id AS roleId,
                    COALESCE(sr.name, CASE WHEN u.role = 'admin' THEN 'Quan tri he thong' ELSE 'Sinh vien' END) AS roleName,
                    CASE
                        WHEN EXISTS (
                            SELECT 1 FROM security_user_permissions sup
                            WHERE sup.user_id = u.id AND sup.resource = 'finance'
                            AND (sup.can_view = 1 OR sup.can_edit = 1 OR sup.can_delete = 1 OR sup.can_approve = 1)
                        ) THEN 'finance'
                        WHEN EXISTS (
                            SELECT 1 FROM security_user_permissions sup
                            WHERE sup.user_id = u.id AND sup.resource = 'visa_documents'
                            AND (sup.can_view = 1 OR sup.can_edit = 1 OR sup.can_delete = 1 OR sup.can_approve = 1)
                        ) THEN 'visa_documents'
                        ELSE 'student_data'
                    END AS department
                FROM users u
                LEFT JOIN security_roles sr ON sr.id = u.role_id
                WHERE COALESCE(u.account_status, 'active') = 'active'
                  AND (? = '' OR LOWER(u.full_name) LIKE CONCAT('%', ?, '%') OR LOWER(u.email) LIKE CONCAT('%', ?, '%'))
                ORDER BY u.full_name ASC, u.id ASC
            `,
            [search, search, search]
        );

        const users = (rows || []).filter((row) => !department || row.department === department);
        return res.json({ users });
    } catch (error) {
        return res.status(500).json({ message: 'Khong the tai danh sach nguoi dung.', error: error.message });
    }
});

app.get('/api/security/permissions/:userId', async (req, res) => {
    const userId = Number(req.params.userId);
    if (!userId) {
        return res.status(400).json({ message: 'userId khong hop le.' });
    }

    try {
        await ensureSecuritySchema();
        const rows = await securityQuery(
            `
                SELECT resource, can_view, can_edit, can_delete, can_approve
                FROM security_user_permissions
                WHERE user_id = ?
            `,
            [userId]
        );
        return res.json({ userId, permissions: normalizeSecurityPermissions(rows) });
    } catch (error) {
        return res.status(500).json({ message: 'Khong the tai quyen nguoi dung.', error: error.message });
    }
});

app.put('/api/security/permissions/:userId', async (req, res) => {
    const userId = Number(req.params.userId);
    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : [];

    if (!userId) {
        return res.status(400).json({ message: 'userId khong hop le.' });
    }

    try {
        await ensureSecuritySchema();
        for (const permission of normalizeSecurityPermissions(permissions)) {
            await securityQuery(
                `
                    INSERT INTO security_user_permissions (
                        user_id,
                        resource,
                        can_view,
                        can_edit,
                        can_delete,
                        can_approve
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        can_view = VALUES(can_view),
                        can_edit = VALUES(can_edit),
                        can_delete = VALUES(can_delete),
                        can_approve = VALUES(can_approve)
                `,
                [
                    userId,
                    permission.resource,
                    permission.view ? 1 : 0,
                    permission.edit ? 1 : 0,
                    permission.delete ? 1 : 0,
                    permission.approve ? 1 : 0
                ]
            );
        }

        return res.json({ message: 'Da luu quyen nguoi dung.', userId });
    } catch (error) {
        return res.status(500).json({ message: 'Khong the cap nhat quyen nguoi dung.', error: error.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server dang chay on dinh tai cong ${PORT}`);
});
