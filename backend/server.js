const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Abc123@',
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
    });
});

app.post('/api/submit-step1', (req, res) => {
    const { fullName, phone, email, level, status, docLinks, allDocs } = req.body;

    const sqlStudent = 'INSERT INTO students (full_name, phone, email, level, status) VALUES (?, ?, ?, ?, ?)';
    db.query(sqlStudent, [fullName, phone, email, level, status], (err, result) => {
        if (err) return res.status(500).send('Loi luu sinh vien: ' + err.message);

        const studentId = result.insertId;
        const values = (allDocs || []).map((name) => {
            const link = (docLinks && docLinks[name]) || '';
            const isSubmitted = link && link.trim() !== '' ? 1 : 0;
            return [studentId, name, link, isSubmitted, 1];
        });

        if (values.length === 0) return res.json({ message: 'Luu thanh cong (chua co ho so).' });

        const sqlDocs = 'INSERT INTO student_documents (student_id, doc_name, file_path, is_submitted, step) VALUES ?';
        db.query(sqlDocs, [values], (errDocs) => {
            if (errDocs) return res.status(500).send('Loi luu checklist: ' + errDocs.message);
            return res.json({ message: 'Khoi tao ho so Buoc 1 thanh cong!', studentId });
        });
    });
});

app.post('/api/get-student-step2', (req, res) => {
    const { fullName, phone } = req.body;
    const sql = 'SELECT * FROM students WHERE TRIM(full_name) = TRIM(?) AND TRIM(phone) = TRIM(?) ORDER BY id DESC LIMIT 1';

    db.query(sql, [fullName, phone], (err, results) => {
        if (err) return res.status(500).send(err.message);
        if (results.length === 0) return res.status(404).send('Thong tin khong khop hoac sinh vien chua ton tai!');

        const student = results[0];
        const sqlDocs = 'SELECT doc_name, file_path FROM student_documents WHERE student_id = ? AND step = 1';
        db.query(sqlDocs, [student.id], (errDocs, docs) => {
            if (errDocs) return res.status(500).send(errDocs.message);
            return res.json({ student, step1Docs: docs });
        });
    });
});

app.post('/api/submit-step2', (req, res) => {
    const { studentId, docLinks, allDocs } = req.body;

    const sqlDelete = 'DELETE FROM student_documents WHERE student_id = ? AND step = 2';
    db.query(sqlDelete, [studentId], (errDel) => {
        if (errDel) return res.status(500).send(errDel.message);

        const values = (allDocs || []).map((name) => {
            const link = (docLinks && docLinks[name]) || '';
            const isSubmitted = link && link.trim() !== '' ? 1 : 0;
            return [studentId, name, link, isSubmitted, 2];
        });

        const sqlInsert = 'INSERT INTO student_documents (student_id, doc_name, file_path, is_submitted, step) VALUES ?';
        db.query(sqlInsert, [values], (errIn) => {
            if (errIn) return res.status(500).send(errIn.message);
            return res.json({ message: 'Luu ho so Buoc 2 thanh cong!' });
        });
    });
});

app.post('/api/get-all-student-docs', (req, res) => {
    const { fullName, phone } = req.body;
    const sql = 'SELECT * FROM students WHERE TRIM(full_name) = TRIM(?) AND TRIM(phone) = TRIM(?) ORDER BY id DESC LIMIT 1';

    db.query(sql, [fullName, phone], (err, results) => {
        if (err) return res.status(500).send(err.message);
        if (results.length === 0) return res.status(404).send('Khong tim thay sinh vien!');

        const student = results[0];
        const sqlDocs = 'SELECT doc_name, file_path, step, is_submitted FROM student_documents WHERE student_id = ? ORDER BY step ASC, id ASC';
        db.query(sqlDocs, [student.id], (errDocs, docs) => {
            if (errDocs) return res.status(500).send(errDocs.message);
            return res.json({ student, allDocs: docs });
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

    if (!fullName || !normalizedEmail || !password) {
        return res.status(400).json({ message: 'Thieu thong tin dang ky.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Mat khau phai co it nhat 6 ky tu.' });
    }

    try {
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = await scryptHash(password, salt);

        const sql = 'INSERT INTO users (full_name, email, role, password_salt, password_hash) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [fullName.trim(), normalizedEmail, normalizedRole, salt, passwordHash], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Email da ton tai.' });
                }
                return res.status(500).json({ message: 'Khong the tao tai khoan.', error: err.message });
            }

            return res.status(201).json({
                message: 'Tao tai khoan thanh cong.',
                user: {
                    id: result.insertId,
                    fullName: fullName.trim(),
                    email: normalizedEmail,
                    role: normalizedRole
                }
            });
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

    const sql = 'SELECT id, full_name, email, role, password_salt, password_hash FROM users WHERE email = ? AND role = ? LIMIT 1';
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

            return res.json({
                message: 'Dang nhap thanh cong.',
                user: {
                    id: user.id,
                    fullName: user.full_name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (hashErr) {
            return res.status(500).json({ message: 'Loi xac thuc mat khau.', error: hashErr.message });
        }
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server dang chay on dinh tai cong ${PORT}`);
});
