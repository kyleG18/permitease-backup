const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const { getEstimate, getRules, createRule, updateRule, deleteRule } = require('../controllers/taxController');

// Business Owner / LGU Admin / System Admin
router.get('/estimate/:businessId', protect, getEstimate);

// LGU Admin / System Admin only
router.get('/rules', protect, requireRole(['lgu_admin', 'system_admin']), getRules);
router.post('/rules', protect, requireRole(['lgu_admin', 'system_admin']), createRule);
router.put('/rules/:id', protect, requireRole(['lgu_admin', 'system_admin']), updateRule);
router.delete('/rules/:id', protect, requireRole(['system_admin']), deleteRule);

module.exports = router;
