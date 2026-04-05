// controllers/skillController.js
const db = require('../models/db');

// ─── GET ALL SKILLS ──────────────────────────────────────────
const getAllSkills = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM SKILL ORDER BY skill_name');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADD SKILL ───────────────────────────────────────────────
const addSkill = async (req, res) => {
    try {
        const { skill_name } = req.body;
        if (!skill_name)
            return res.status(400).json({ success: false, message: 'Skill name is required' });

        const [result] = await db.query(
            'INSERT INTO SKILL (skill_name) VALUES (?)', [skill_name]
        );
        res.status(201).json({ success: true, message: 'Skill added', id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(400).json({ success: false, message: 'Skill already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ASSIGN SKILL TO STUDENT ─────────────────────────────────
const assignSkill = async (req, res) => {
    try {
        const { student_id, skill_id } = req.body;
        if (!student_id || !skill_id)
            return res.status(400).json({ success: false, message: 'student_id and skill_id required' });

        await db.query(
            'INSERT IGNORE INTO STUDENT_SKILL (student_id, skill_id) VALUES (?, ?)',
            [student_id, skill_id]
        );
        res.json({ success: true, message: 'Skill assigned to student' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── REMOVE SKILL FROM STUDENT ───────────────────────────────
const removeSkill = async (req, res) => {
    try {
        const { student_id, skill_id } = req.params;
        await db.query(
            'DELETE FROM STUDENT_SKILL WHERE student_id=? AND skill_id=?',
            [student_id, skill_id]
        );
        res.json({ success: true, message: 'Skill removed' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET SKILLS OF A STUDENT ─────────────────────────────────
const getStudentSkills = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT sk.skill_id, sk.skill_name
             FROM SKILL sk
             JOIN STUDENT_SKILL ss ON sk.skill_id = ss.skill_id
             WHERE ss.student_id = ?`,
            [req.params.student_id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllSkills, addSkill, assignSkill, removeSkill, getStudentSkills };
