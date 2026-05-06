// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllStudents, getStudentById, addStudent, updateStudent, deleteStudent, transferStudent
} = require('../controllers/studentController');

router.get('/',              getAllStudents);
router.get('/:id',           getStudentById);
router.post('/',             addStudent);
router.put('/:id',           updateStudent);
router.delete('/:id',        deleteStudent);
router.put('/:id/transfer',  transferStudent);     // NEW: branch transfer with SP

module.exports = router;
