// controllers/placementController.js
const db = require('../models/db');

// ─── GET ALL PLACEMENT RESULTS ───────────────────────────────
const getAllResults = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT pr.result_id, pr.final_status, pr.recorded_at,
                    s.name AS student_name, s.email, s.branch, s.cgpa,
                    j.role, j.package,
                    c.company_name, c.location
             FROM PLACEMENT_RESULT pr
             JOIN STUDENT  s ON pr.student_id = s.student_id
             JOIN JOB_ROLE j ON pr.job_id     = j.job_id
             JOIN COMPANY  c ON j.company_id  = c.company_id
             ORDER BY pr.recorded_at DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADD PLACEMENT RESULT ────────────────────────────────────
const addResult = async (req, res) => {
    try {
        const { student_id, job_id, final_status } = req.body;
        if (!student_id || !job_id || !final_status)
            return res.status(400).json({ success: false, message: 'All fields required' });

        const [result] = await db.query(
            'INSERT INTO PLACEMENT_RESULT (student_id, job_id, final_status) VALUES (?, ?, ?)',
            [student_id, job_id, final_status]
        );
        res.status(201).json({ success: true, message: 'Placement result recorded', id: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET DASHBOARD STATS ─────────────────────────────────────
const getStats = async (req, res) => {
    try {
        const [[{ total_students }]] = await db.query('SELECT COUNT(*) AS total_students FROM STUDENT');
        const [[{ total_companies }]] = await db.query('SELECT COUNT(*) AS total_companies FROM COMPANY');
        const [[{ total_jobs }]] = await db.query('SELECT COUNT(*) AS total_jobs FROM JOB_ROLE');
        const [[{ total_applications }]] = await db.query('SELECT COUNT(*) AS total_applications FROM APPLICATION');
        const [[{ placed_students }]] = await db.query(
            "SELECT COUNT(DISTINCT student_id) AS placed_students FROM PLACEMENT_RESULT WHERE final_status='Placed'"
        );
        const [[{ avg_cgpa }]] = await db.query('SELECT ROUND(AVG(cgpa),2) AS avg_cgpa FROM STUDENT');
        const [[{ top_package }]] = await db.query('SELECT MAX(package) AS top_package FROM JOB_ROLE');

        res.json({
            success: true,
            data: { total_students, total_companies, total_jobs, total_applications, placed_students, avg_cgpa, top_package }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET PLACEMENT SUMMARY BY BRANCH ─────────────────────────
const getBranchStats = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT s.branch,
                    COUNT(DISTINCT s.student_id) AS total,
                    COUNT(DISTINCT pr.student_id) AS placed
             FROM STUDENT s
             LEFT JOIN PLACEMENT_RESULT pr ON s.student_id = pr.student_id AND pr.final_status = 'Placed'
             GROUP BY s.branch
             ORDER BY placed DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllResults, addResult, getStats, getBranchStats };
