const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { sendMessage, getChatHistory } = require('../controllers/chatController');
const { protect, requireRole } = require('../middleware/authMiddleware');

const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: { message: 'Too many chat messages from this IP, please try again after 15 minutes.' }
});

router.post('/', protect, requireRole(['business_owner', 'system_admin']), chatLimiter, sendMessage);
router.get('/history', protect, requireRole(['business_owner', 'system_admin']), getChatHistory);

module.exports = router;
