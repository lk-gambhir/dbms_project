// controllers/placementController.js
// Uses stored procedures & transactions
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

// ─── ADD PLACEMENT RESULT (uses stored procedure with txn) ───
const addResult = async (req, res) => {
    try {
        const { student_id, job_id, final_status } = req.body;
        if (!student_id || !job_id || !final_status)
            return res.status(400).json({ success: false, message: 'All fields required' });

        await db.query(
            'CALL sp_record_placement(?, ?, ?, @result)',
            [student_id, job_id, final_status]
        );
        const [[{ result }]] = await db.query('SELECT @result AS result');

        if (result && result.startsWith('SUCCESS')) {
            res.status(201).json({ success: true, message: result });
        } else {
            res.status(400).json({ success: false, message: result || 'Failed to record placement' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET DASHBOARD STATS (uses stored procedure) ─────────────
const getStats = async (req, res) => {
    try {
        const [rows] = await db.query('CALL sp_get_dashboard_stats()');
        // SP returns result set as first element
        const data = rows[0][0];
        res.json({ success: true, data });
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
                    COUNT(DISTINCT pr.student_id) AS placed,
                    fn_branch_placement_pct(s.branch) AS placement_pct
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

// ─── GET PLACEMENT SUMMARY (calls SP) ────────────────────────
const getPlacementSummary = async (req, res) => {
    try {
        const [rows] = await db.query('CALL GetPlacementSummary()');
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllResults, addResult, getStats, getBranchStats, getPlacementSummary };
