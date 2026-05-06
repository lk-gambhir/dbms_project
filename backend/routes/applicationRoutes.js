// routes/applicationRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllApplications, applyForJob, updateApplicationStatus, processApplications, getApplicationsByStudent
} = require('../controllers/applicationController');

router.get('/',                      getAllApplications);
router.post('/',                     applyForJob);
router.put('/:id/status',           updateApplicationStatus);
router.post('/process',             processApplications);       // NEW: bulk process with cursor SP
router.get('/student/:student_id',  getApplicationsByStudent);

module.exports = router;
