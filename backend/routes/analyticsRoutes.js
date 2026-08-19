const express = require('express');
const router = express.Router();
const { 
    getOverviewAnalytics, 
    getApplicationAnalytics, 
    getPermitAnalytics, 
    getRequirementAnalytics, 
    getBusinessAnalytics, 
    getActivityAnalytics 
} = require('../controllers/analyticsController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// All analytics endpoints strictly require authentication and LGU/System Admin role
router.use(protect, requireRole(['lgu_admin', 'system_admin']));

router.get('/overview', getOverviewAnalytics);
router.get('/applications', getApplicationAnalytics);
router.get('/permits', getPermitAnalytics);
router.get('/requirements', getRequirementAnalytics);
router.get('/businesses', getBusinessAnalytics);
router.get('/activity', getActivityAnalytics);

module.exports = router;
