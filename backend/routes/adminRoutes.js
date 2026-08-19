const express = require('express');
const router = express.Router();
const { getUsers, updateUserRole, updateUserStatus, getAuditLogs } = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { processRenewalReminders } = require('../services/renewalReminderService');

// All admin routes require system_admin role
router.use(protect, requireRole(['system_admin']));

router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', updateUserStatus);
router.get('/audit-logs', getAuditLogs);

// Trigger renewal reminder processing (LGU/System Admin)
router.post('/process-renewal-reminders', async (req, res) => {
    try {
        const result = await processRenewalReminders();
        res.json({ message: 'Renewal reminder processing complete.', ...result });
    } catch (err) {
        console.error('[AdminRoute] Reminder processing error:', err);
        res.status(500).json({ message: 'Failed to process reminders.' });
    }
});

module.exports = router;

