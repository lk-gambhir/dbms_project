// controllers/applicationController.js
// Uses stored procedures & transactions for data integrity
const db = require('../models/db');

// ─── GET ALL APPLICATIONS (uses view) ────────────────────────
const getAllApplications = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT * FROM vw_application_details ORDER BY applied_at DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── APPLY FOR JOB (calls stored procedure with transaction) ──
const applyForJob = async (req, res) => {
    try {
        const { student_id, job_id } = req.body;
        if (!student_id || !job_id)
            return res.status(400).json({ success: false, message: 'student_id and job_id required' });

        // Call stored procedure that handles transaction + concurrency
        const [results] = await db.query(
            'CALL sp_apply_for_job(?, ?, @result)',
            [student_id, job_id]
        );
        const [[{ result }]] = await db.query('SELECT @result AS result');

        if (result && result.startsWith('SUCCESS')) {
            res.status(201).json({ success: true, message: result });
        } else {
            res.status(400).json({ success: false, message: result || 'Application failed' });
        }
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(400).json({ success: false, message: 'You have already applied for this job' });
        // Handle trigger errors
        if (err.sqlState === '45000')
            return res.status(400).json({ success: false, message: err.message });
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── UPDATE APPLICATION STATUS (with transaction) ────────────
const updateApplicationStatus = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Selected', 'Rejected'];
        if (!validStatuses.includes(status))
            return res.status(400).json({ success: false, message: 'Invalid status' });

        await conn.beginTransaction();

        // Concurrency: lock the row before updating
        const [rows] = await conn.query(
            'SELECT * FROM APPLICATION WHERE application_id = ? FOR UPDATE',
            [req.params.id]
        );
        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        await conn.query(
            'UPDATE APPLICATION SET status = ? WHERE application_id = ?',
            [status, req.params.id]
        );

        await conn.commit();
        res.json({ success: true, message: `Status updated to ${status}` });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
};

// ─── PROCESS ALL PENDING APPS FOR A JOB (cursor-based SP) ────
const processApplications = async (req, res) => {
    try {
        const { job_id, min_cgpa_cutoff } = req.body;
        if (!job_id || min_cgpa_cutoff === undefined)
            return res.status(400).json({ success: false, message: 'job_id and min_cgpa_cutoff required' });

        await db.query(
            'CALL sp_process_applications(?, ?, @selected, @rejected)',
            [job_id, min_cgpa_cutoff]
        );
        const [[{ selected, rejected }]] = await db.query(
            'SELECT @selected AS selected, @rejected AS rejected'
        );

        if (selected === -1) {
            return res.status(500).json({ success: false, message: 'Processing failed — rolled back' });
        }

        res.json({
            success: true,
            message: `Processed: ${selected} selected, ${rejected} rejected`,
            data: { selected, rejected }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET APPLICATIONS BY STUDENT ─────────────────────────────
const getApplicationsByStudent = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT * FROM vw_application_details
             WHERE student_id = ?
             ORDER BY applied_at DESC`,
            [req.params.student_id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllApplications, applyForJob, updateApplicationStatus, processApplications, getApplicationsByStudent };
