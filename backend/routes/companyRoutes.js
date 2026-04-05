// routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllCompanies, addCompany, getAllJobRoles, getJobRolesByCompany, addJobRole, deleteJobRole
} = require('../controllers/companyController');

router.get('/',                       getAllCompanies);
router.post('/',                      addCompany);
router.get('/jobs',                   getAllJobRoles);
router.get('/:company_id/jobs',       getJobRolesByCompany);
router.post('/jobs',                  addJobRole);
router.delete('/jobs/:id',            deleteJobRole);

module.exports = router;
