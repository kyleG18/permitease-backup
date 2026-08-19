const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getEstimate, getRules, createRule, updateRule, deleteRule } = require('../controllers/taxController');

// Business Owner / Admin
router.get('/estimate/:businessId', protect, getEstimate);

// LGU Admin / System Admin only
router.get('/rules', protect, getRules);
router.post('/rules', protect, createRule);
router.put('/rules/:id', protect, updateRule);
router.delete('/rules/:id', protect, deleteRule);

module.exports = router;
