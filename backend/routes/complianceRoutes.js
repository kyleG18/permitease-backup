const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { evaluateCompliance, getCompliance, updateRequirementStatus } = require('../controllers/complianceController');

router.post('/evaluate/:businessId', protect, evaluateCompliance);
router.get('/business/:businessId', protect, getCompliance);

router.put('/business/:businessId/requirement/:requirementId', protect, updateRequirementStatus);

module.exports = router;
