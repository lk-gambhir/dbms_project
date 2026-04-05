// routes/placementRoutes.js
const express = require('express');
const router = express.Router();
const { getAllResults, addResult, getStats, getBranchStats } = require('../controllers/placementController');

router.get('/',           getAllResults);
router.post('/',          addResult);
router.get('/stats',      getStats);
router.get('/branch',     getBranchStats);

module.exports = router;
