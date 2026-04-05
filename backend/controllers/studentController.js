// controllers/studentController.js
const db = require('../models/db');

// ─── GET ALL STUDENTS ────────────────────────────────────────
const getAllStudents = async (req, res) => {
    try {
        const { search, sortBy } = req.query;
        let query = 'SELECT * FROM STUDENT';
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
            'SELECT * FROM STUDENT WHERE student_id = ?',
            [req.params.id]
        );
        if (rows.length === 0)
            return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADD STUDENT ─────────────────────────────────────────────
const addStudent = async (req, res) => {
    try {
        const { name, email, branch, cgpa, year } = req.body;
        if (!name || !email || !branch || cgpa === undefined || !year)
            return res.status(400).json({ success: false, message: 'All fields are required' });

        if (cgpa < 0 || cgpa > 10)
            return res.status(400).json({ success: false, message: 'CGPA must be between 0 and 10' });

        const [result] = await db.query(
            'INSERT INTO STUDENT (name, email, branch, cgpa, year) VALUES (?, ?, ?, ?, ?)',
            [name, email, branch, cgpa, year]
        );
        res.status(201).json({ success: true, message: 'Student added', id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(400).json({ success: false, message: 'Email already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── UPDATE STUDENT ──────────────────────────────────────────
const updateStudent = async (req, res) => {
    try {
        const { name, email, branch, cgpa, year } = req.body;
        const [result] = await db.query(
            'UPDATE STUDENT SET name=?, email=?, branch=?, cgpa=?, year=? WHERE student_id=?',
            [name, email, branch, cgpa, year, req.params.id]
        );
        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, message: 'Student updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── DELETE STUDENT ──────────────────────────────────────────
const deleteStudent = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM STUDENT WHERE student_id = ?',
            [req.params.id]
        );
        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, message: 'Student deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllStudents, getStudentById, addStudent, updateStudent, deleteStudent };
