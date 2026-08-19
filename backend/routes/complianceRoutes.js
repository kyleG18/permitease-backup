const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { evaluateCompliance, getCompliance } = require('../controllers/complianceController');

router.post('/evaluate/:businessId', protect, evaluateCompliance);
router.get('/business/:businessId', protect, getCompliance);

module.exports = router;
