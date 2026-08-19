const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { createAssessment, getAssessments, getAssessment } = require('../controllers/assessmentController');
const { protect, requireRole } = require('../middleware/authMiddleware');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs
    message: { message: 'Too many assessment requests from this IP, please try again after 15 minutes.' }
});

router.route('/')
    .get(protect, requireRole(['business_owner', 'system_admin']), getAssessments)
    .post(protect, requireRole(['business_owner', 'system_admin']), apiLimiter, createAssessment);
router.route('/:id').get(protect, requireRole(['business_owner', 'system_admin']), getAssessment);

module.exports = router;
