// controllers/companyController.js
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

// ─── ADD COMPANY ─────────────────────────────────────────────
const addCompany = async (req, res) => {
    try {
        const { company_name, location } = req.body;
        if (!company_name || !location)
            return res.status(400).json({ success: false, message: 'company_name and location required' });

        const [result] = await db.query(
            'INSERT INTO COMPANY (company_name, location) VALUES (?, ?)',
            [company_name, location]
        );
        res.status(201).json({ success: true, message: 'Company added', id: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET ALL JOB ROLES (with company name) ───────────────────
const getAllJobRoles = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT j.*, c.company_name, c.location
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

// ─── ADD JOB ROLE ────────────────────────────────────────────
const addJobRole = async (req, res) => {
    try {
        const { company_id, role, min_cgpa, package: pkg } = req.body;
        if (!company_id || !role || min_cgpa === undefined || pkg === undefined)
            return res.status(400).json({ success: false, message: 'All fields required' });

        const [result] = await db.query(
            'INSERT INTO JOB_ROLE (company_id, role, min_cgpa, package) VALUES (?, ?, ?, ?)',
            [company_id, role, min_cgpa, pkg]
        );
        res.status(201).json({ success: true, message: 'Job role added', id: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── DELETE JOB ROLE ─────────────────────────────────────────
const deleteJobRole = async (req, res) => {
    try {
        await db.query('DELETE FROM JOB_ROLE WHERE job_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Job role deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllCompanies, addCompany, getAllJobRoles, getJobRolesByCompany, addJobRole, deleteJobRole };
