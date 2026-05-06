// controllers/companyController.js
// Uses transactions for data integrity
const db = require('../models/db');

// ─── GET ALL COMPANIES ───────────────────────────────────────
const getAllCompanies = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM COMPANY ORDER BY company_name');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADD COMPANY (with transaction) ──────────────────────────
const addCompany = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { company_name, location, website } = req.body;
        if (!company_name || !location)
            return res.status(400).json({ success: false, message: 'company_name and location required' });

        await conn.beginTransaction();

        const [result] = await conn.query(
            'INSERT INTO COMPANY (company_name, location, website) VALUES (?, ?, ?)',
            [company_name, location, website || null]
        );

        await conn.commit();
        res.status(201).json({ success: true, message: 'Company added', id: result.insertId });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
};

// ─── GET ALL JOB ROLES (with company name) ───────────────────
const getAllJobRoles = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT j.*, c.company_name, c.location,
                    (SELECT COUNT(*) FROM APPLICATION a WHERE a.job_id = j.job_id) AS application_count,
                    (SELECT COUNT(*) FROM APPLICATION a WHERE a.job_id = j.job_id AND a.status = 'Selected') AS selected_count
             FROM JOB_ROLE j
             JOIN COMPANY c ON j.company_id = c.company_id
             ORDER BY j.package DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET JOB ROLES BY COMPANY ────────────────────────────────
const getJobRolesByCompany = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT j.*, c.company_name FROM JOB_ROLE j
             JOIN COMPANY c ON j.company_id = c.company_id
             WHERE j.company_id = ?`,
            [req.params.company_id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADD JOB ROLE (with transaction) ─────────────────────────
const addJobRole = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { company_id, role, min_cgpa, package: pkg, openings } = req.body;
        if (!company_id || !role || min_cgpa === undefined || pkg === undefined)
            return res.status(400).json({ success: false, message: 'All fields required' });

        await conn.beginTransaction();

        const [result] = await conn.query(
            'INSERT INTO JOB_ROLE (company_id, role, min_cgpa, package, openings) VALUES (?, ?, ?, ?, ?)',
            [company_id, role, min_cgpa, pkg, openings || 1]
        );

        await conn.commit();
        res.status(201).json({ success: true, message: 'Job role added', id: result.insertId });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
};

// ─── DELETE JOB ROLE (with transaction) ──────────────────────
const deleteJobRole = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('DELETE FROM JOB_ROLE WHERE job_id = ?', [req.params.id]);
        await conn.commit();
        res.json({ success: true, message: 'Job role deleted' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
};

module.exports = { getAllCompanies, addCompany, getAllJobRoles, getJobRolesByCompany, addJobRole, deleteJobRole };
