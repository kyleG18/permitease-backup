const express = require('express');
const router = express.Router();
const { getBusinesses, getBusiness, createBusiness, updateBusiness, deleteBusiness } = require('../controllers/businessController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, requireRole(['business_owner', 'system_admin', 'lgu_admin']), getBusinesses)
    .post(protect, requireRole(['business_owner', 'system_admin']), createBusiness);

router.route('/:id')
    .get(protect, requireRole(['business_owner', 'system_admin', 'lgu_admin']), getBusiness)
    .put(protect, requireRole(['business_owner', 'system_admin']), updateBusiness)
    .delete(protect, requireRole(['business_owner', 'system_admin']), deleteBusiness);

module.exports = router;
