const express = require('express');
const router = express.Router();
const { 
    getPermits, 
    getPermit, 
    createPermit, 
    updatePermit, 
    deletePermit,
    verifyPermit,
    downloadPermitPdf,
    getAllPermitsAdmin
} = require('../controllers/permitController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Public route (Must be above /:id to avoid param conflict)
router.get('/verify/:verificationCode', verifyPermit);

// Admin route
router.get('/admin/all', protect, requireRole(['lgu_admin', 'system_admin']), getAllPermitsAdmin);

// Standard operations
router.route('/')
    .get(protect, requireRole(['business_owner', 'system_admin']), getPermits)
    .post(protect, requireRole(['business_owner', 'system_admin']), createPermit);

router.route('/:id')
    .get(protect, requireRole(['business_owner', 'system_admin']), getPermit)
    .put(protect, requireRole(['business_owner', 'system_admin']), updatePermit)
    .delete(protect, requireRole(['business_owner', 'system_admin']), deletePermit);

// Download route
router.get('/:id/download', protect, downloadPermitPdf);

module.exports = router;
