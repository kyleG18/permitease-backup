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
    getApplicationHistory,
    getPreparationSummaryPDF,
    scheduleWalkin,
    getWalkinRoster,
    markWalkinAttended
} = require('../controllers/applicationController');
const { calculateApplicationFees } = require('../controllers/feeController');

// ─── LGU Admin Roster & Queue Routes (Must precede /:id) ─────
router.get('/admin/walkin-roster', protect, requireRole(['lgu_admin', 'system_admin']), getWalkinRoster);
router.get('/admin/all', protect, requireRole(['lgu_admin', 'system_admin']), getAllApplications);
router.post('/admin/:id/start-review', protect, requireRole(['lgu_admin', 'system_admin']), startReview);
router.post('/admin/:id/request-correction', protect, requireRole(['lgu_admin', 'system_admin']), requestCorrection);
router.post('/admin/:id/approve', protect, requireRole(['lgu_admin', 'system_admin']), approveApplication);
router.post('/admin/:id/reject', protect, requireRole(['lgu_admin', 'system_admin']), rejectApplication);
router.post('/admin/:id/mark-attended', protect, requireRole(['lgu_admin', 'system_admin']), markWalkinAttended);

// ─── Business Owner Routes ───────────────────
router.get('/', protect, getMyApplications);
router.post('/', protect, requireRole(['business_owner']), createDraft);
// NOTE: fee route must come before /:id to avoid Express matching 'fees' as an id param
router.get('/:id/fees', protect, calculateApplicationFees);
router.get('/:id/history', protect, getApplicationHistory);
router.get('/:id/preparation-summary', protect, getPreparationSummaryPDF);
router.post('/:id/schedule-walkin', protect, scheduleWalkin);
router.get('/:id', protect, getApplicationById);
router.post('/:id/submit', protect, requireRole(['business_owner']), submitApplication);

module.exports = router;
