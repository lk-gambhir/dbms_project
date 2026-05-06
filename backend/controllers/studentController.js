// controllers/studentController.js
// Uses transactions for data integrity
const db = require('../models/db');

// ─── GET ALL STUDENTS (uses enhanced view) ───────────────────
const getAllStudents = async (req, res) => {
    try {
        const { search, sortBy } = req.query;
        let query = 'SELECT * FROM vw_student_profile';
        const params = [];

        if (search) {
            query += ' WHERE name LIKE ? OR branch LIKE ? OR email LIKE ?';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (sortBy === 'cgpa') query += ' ORDER BY cgpa DESC';
        else query += ' ORDER BY student_id DESC';

        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET STUDENT BY ID ───────────────────────────────────────
const getStudentById = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM vw_student_profile WHERE student_id = ?',
            [req.params.id]
        );
        if (rows.length === 0)
            return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADD STUDENT (with transaction) ──────────────────────────
const addStudent = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { name, email, branch, cgpa, year, phone } = req.body;
        if (!name || !email || !branch || cgpa === undefined || !year)
            return res.status(400).json({ success: false, message: 'All fields are required' });

        if (cgpa < 0 || cgpa > 10)
            return res.status(400).json({ success: false, message: 'CGPA must be between 0 and 10' });

        await conn.beginTransaction();

        const [result] = await conn.query(
            'INSERT INTO STUDENT (name, email, phone, branch, cgpa, year) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, phone || null, branch, cgpa, year]
        );

        await conn.commit();
        res.status(201).json({ success: true, message: 'Student added', id: result.insertId });
    } catch (err) {
        await conn.rollback();
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(400).json({ success: false, message: 'Email already exists' });
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
};

// ─── UPDATE STUDENT (with transaction) ───────────────────────
const updateStudent = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { name, email, branch, cgpa, year, phone } = req.body;

        await conn.beginTransaction();

        // Lock row for update
        const [existing] = await conn.query(
            'SELECT * FROM STUDENT WHERE student_id = ? FOR UPDATE',
            [req.params.id]
        );
        if (existing.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        await conn.query(
            'UPDATE STUDENT SET name=?, email=?, phone=?, branch=?, cgpa=?, year=? WHERE student_id=?',
            [name, email, phone || null, branch, cgpa, year, req.params.id]
        );

        await conn.commit();
        res.json({ success: true, message: 'Student updated' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
};

// ─── DELETE STUDENT (trigger prevents if placed) ─────────────
const deleteStudent = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [result] = await conn.query(
            'DELETE FROM STUDENT WHERE student_id = ?',
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        await conn.commit();
        res.json({ success: true, message: 'Student deleted' });
    } catch (err) {
        await conn.rollback();
        // Catch trigger error for placed students
        if (err.sqlState === '45000')
            return res.status(400).json({ success: false, message: err.message });
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
};

// ─── TRANSFER STUDENT BRANCH (uses SP) ───────────────────────
const transferStudent = async (req, res) => {
    try {
        const { branch } = req.body;
        if (!branch) return res.status(400).json({ success: false, message: 'New branch is required' });

        await db.query('CALL sp_transfer_student(?, ?, @result)', [req.params.id, branch]);
        const [[{ result }]] = await db.query('SELECT @result AS result');

        if (result && result.startsWith('SUCCESS')) {
            res.json({ success: true, message: result });
        } else {
            res.status(400).json({ success: false, message: result || 'Transfer failed' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllStudents, getStudentById, addStudent, updateStudent, deleteStudent, transferStudent };
