const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getReadiness } = require('../controllers/readinessController');

router.get('/:businessId', protect, getReadiness);

module.exports = router;
