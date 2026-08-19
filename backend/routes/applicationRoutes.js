const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const {
    getMyApplications,
    getApplicationById,
    createDraft,
    submitApplication,
    getAllApplications,
    startReview,
    requestCorrection,
    approveApplication,
    rejectApplication,
    getApplicationHistory
} = require('../controllers/applicationController');
const { calculateApplicationFees } = require('../controllers/feeController');

// ─── Business Owner Routes ───────────────────
router.get('/', protect, getMyApplications);
router.post('/', protect, requireRole(['business_owner']), createDraft);
// NOTE: fee route must come before /:id to avoid Express matching 'fees' as an id param
router.get('/:id/fees', protect, calculateApplicationFees);
router.get('/:id/history', protect, getApplicationHistory);
router.get('/:id', protect, getApplicationById);
router.post('/:id/submit', protect, requireRole(['business_owner']), submitApplication);

// ─── LGU / Admin Routes ──────────────────────
router.get('/admin/all', protect, requireRole(['lgu_admin', 'system_admin']), getAllApplications);
router.post('/admin/:id/start-review', protect, requireRole(['lgu_admin', 'system_admin']), startReview);
router.post('/admin/:id/request-correction', protect, requireRole(['lgu_admin', 'system_admin']), requestCorrection);
router.post('/admin/:id/approve', protect, requireRole(['lgu_admin', 'system_admin']), approveApplication);
router.post('/admin/:id/reject', protect, requireRole(['lgu_admin', 'system_admin']), rejectApplication);

module.exports = router;
