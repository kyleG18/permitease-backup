const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMyPermitRenewals, getAdminRenewalMonitoring } = require('../controllers/renewalController');

// Business Owner routes
router.get('/my', protect, getMyPermitRenewals);

// Admin routes
router.get('/admin', protect, getAdminRenewalMonitoring);

module.exports = router;
