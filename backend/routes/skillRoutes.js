// routes/skillRoutes.js
const express = require('express');
const router = express.Router();
const { getAllSkills, addSkill, assignSkill, removeSkill, getStudentSkills } = require('../controllers/skillController');

router.get('/',                              getAllSkills);
router.post('/',                             addSkill);
router.post('/assign',                       assignSkill);
router.delete('/:student_id/:skill_id',      removeSkill);
router.get('/student/:student_id',           getStudentSkills);

module.exports = router;
