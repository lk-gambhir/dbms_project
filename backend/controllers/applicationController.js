// controllers/applicationController.js
const db = require('../models/db');

// ─── GET ALL APPLICATIONS ────────────────────────────────────
const getAllApplications = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT a.application_id, a.status, a.applied_at,
                    s.name AS student_name, s.email, s.cgpa, s.branch,
                    j.role, j.package, j.min_cgpa,
                    c.company_name
             FROM APPLICATION a
             JOIN STUDENT  s ON a.student_id = s.student_id
             JOIN JOB_ROLE j ON a.job_id     = j.job_id
             JOIN COMPANY  c ON j.company_id = c.company_id
             ORDER BY a.applied_at DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── APPLY FOR JOB (with CGPA eligibility check) ─────────────
const applyForJob = async (req, res) => {
    try {
        const { student_id, job_id } = req.body;
        if (!student_id || !job_id)
            return res.status(400).json({ success: false, message: 'student_id and job_id required' });

        // Manual eligibility check (also enforced by DB trigger)
        const [[student]] = await db.query(
            'SELECT cgpa FROM STUDENT WHERE student_id = ?', [student_id]
        );
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        const [[job]] = await db.query(
            'SELECT min_cgpa, role FROM JOB_ROLE WHERE job_id = ?', [job_id]
        );
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

        if (student.cgpa < job.min_cgpa)
            return res.status(400).json({
                success: false,
                message: `Not eligible. Your CGPA ${student.cgpa} is below minimum ${job.min_cgpa} for ${job.role}`
            });

        await db.query(
            'INSERT INTO APPLICATION (student_id, job_id, status) VALUES (?, ?, "Pending")',
            [student_id, job_id]
        );
        res.status(201).json({ success: true, message: 'Application submitted successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(400).json({ success: false, message: 'You have already applied for this job' });
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── UPDATE APPLICATION STATUS ───────────────────────────────
const updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Selected', 'Rejected'];
        if (!validStatuses.includes(status))
            return res.status(400).json({ success: false, message: 'Invalid status' });

        const [result] = await db.query(
            'UPDATE APPLICATION SET status = ? WHERE application_id = ?',
            [status, req.params.id]
        );
        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: 'Application not found' });

        res.json({ success: true, message: `Status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET APPLICATIONS BY STUDENT ─────────────────────────────
const getApplicationsByStudent = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT a.application_id, a.status, a.applied_at,
                    j.role, j.package, c.company_name
             FROM APPLICATION a
             JOIN JOB_ROLE j ON a.job_id = j.job_id
             JOIN COMPANY  c ON j.company_id = c.company_id
             WHERE a.student_id = ?
             ORDER BY a.applied_at DESC`,
            [req.params.student_id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllApplications, applyForJob, updateApplicationStatus, getApplicationsByStudent };
