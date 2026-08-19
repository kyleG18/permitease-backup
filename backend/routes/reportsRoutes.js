const express = require('express');
const router = express.Router();
const { getReportsSummary } = require('../controllers/reportsController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.get('/summary', protect, requireRole(['lgu_admin', 'system_admin']), getReportsSummary);

module.exports = router;
