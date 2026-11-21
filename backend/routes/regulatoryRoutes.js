const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const {
    getRegulatoryUpdates,
    triggerRegulatoryCheck,
    createRegulatoryUpdate,
    approveRegulatoryUpdate,
    dismissRegulatoryUpdate,
    getPsicCodes,
    createPsicCode,
    importPsicCsv,
    approvePsicCode,
    rejectPsicCode,
    deletePsicCode
} = require('../controllers/regulatoryController');

const adminOnly = requireRole(['lgu_admin', 'system_admin']);

// Regulatory Updates & Sources Monitor
router.get('/updates', protect, adminOnly, getRegulatoryUpdates);
router.post('/updates/check', protect, adminOnly, triggerRegulatoryCheck);
router.post('/updates', protect, adminOnly, createRegulatoryUpdate);
router.put('/updates/:id/approve', protect, adminOnly, approveRegulatoryUpdate);
router.put('/updates/:id/dismiss', protect, adminOnly, dismissRegulatoryUpdate);

// PSA PSIC Codes
router.get('/psic', protect, getPsicCodes);
router.post('/psic', protect, adminOnly, createPsicCode);
router.post('/psic/import-csv', protect, adminOnly, importPsicCsv);
router.put('/psic/:id/approve', protect, adminOnly, approvePsicCode);
router.put('/psic/:id/reject', protect, adminOnly, rejectPsicCode);
router.delete('/psic/:id', protect, requireRole(['system_admin']), deletePsicCode);

module.exports = router;
