const express = require('express');
const router = express.Router();
const { getRequirements, getRequirement, createRequirement, updateRequirement, deleteRequirement } = require('../controllers/requirementController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.route('/')
    .get(getRequirements)
    .post(protect, requireRole(['lgu_admin', 'system_admin']), createRequirement);

router.route('/:id')
    .get(getRequirement)
    .put(protect, requireRole(['lgu_admin', 'system_admin']), updateRequirement)
    .delete(protect, requireRole(['lgu_admin', 'system_admin']), deleteRequirement);

module.exports = router;
