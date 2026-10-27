const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const { 
    getMyPermitRenewals, 
    getAdminRenewalMonitoring,
    sendStatutoryNotice,
    sendBulkStatutoryNotices
} = require('../controllers/renewalController');

// Business Owner routes
router.get('/my', protect, getMyPermitRenewals);

// Admin routes
router.get('/admin', protect, requireRole(['lgu_admin', 'system_admin']), getAdminRenewalMonitoring);
router.post('/admin/send-notice/:permitId', protect, requireRole(['lgu_admin', 'system_admin']), sendStatutoryNotice);
router.post('/admin/send-bulk-notices', protect, requireRole(['lgu_admin', 'system_admin']), sendBulkStatutoryNotices);

module.exports = router;
