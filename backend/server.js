const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cron = require('node-cron');
const { processRenewalReminders } = require('./services/renewalReminderService');
require('dotenv').config();

// Security startup checks
const DEFAULT_JWT_SECRET = 'my_super_secret_jwt_key_for_bizcheckpermit_development';

if (!process.env.JWT_SECRET) {
    console.warn('[Security] JWT_SECRET not provided, using fallback development key.');
    process.env.JWT_SECRET = DEFAULT_JWT_SECRET;
}

if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    console.warn('[Security Warning] JWT_SECRET is using the default development value in production. For enhanced security, set a unique secret in your deployment environment variables.');
}

const app = express();

// Security middleware
// CORS configuration - restrict to configured frontend origin in production
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Global rate limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs
    message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(globalLimiter);

// Auth-specific rate limiter (strictly 30 or explicitly configured in production; relaxed to 500 only in recognized non-production test/staging)
const getAuthRateLimitMax = (env = process.env.NODE_ENV, customMax = process.env.AUTH_RATE_LIMIT_MAX) => {
    // Only explicitly recognized non-production staging/test environments get the elevated limit
    if (env === 'test' || env === 'staging') {
        return 500;
    }
    // Production / dev / fallback rate limit (default 30 per 15 mins)
    const parsed = parseInt(customMax, 10);
    if (!isNaN(parsed) && parsed > 0) {
        if (env === 'production' && parsed > 100) {
            return 30; // fallback to safe default if misconfigured above safe ceiling in production
        }
        return parsed;
    }
    return 30;
};

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: getAuthRateLimitMax(),
    message: { message: 'Too many authentication attempts, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Public permit verification rate limiter
const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 verification requests per windowMs
    message: { message: 'Too many verification requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Sensitive documents are protected. Only Knowledge Base files (public FAQs/Guides) are statically served.
app.use('/uploads/knowledge', express.static(path.join(__dirname, 'uploads/knowledge')));

// Routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/businesses', require('./routes/businessRoutes'));
app.use('/api/requirements', require('./routes/requirementRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/permits', verifyLimiter, require('./routes/permitRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/knowledge', require('./routes/knowledgeRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/assessments', require('./routes/assessmentRoutes'));
app.use('/api/compliance', require('./routes/complianceRoutes'));
app.use('/api/reports', require('./routes/reportsRoutes'));
app.use('/api/tax', require('./routes/taxRoutes'));
app.use('/api/taxes', require('./routes/taxRoutes'));
app.use('/api/readiness', require('./routes/readinessRoutes'));
app.use('/api/renewals', require('./routes/renewalRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to PermitEase API' });
});

// ─────────────────────────────────────────────
// Automated Renewal Reminder Daemon
// Runs daily at 08:00 AM (server local time).
// Sends 60-day, 30-day, and 7-day expiration notices
// to business owners with expiring permits.
// ─────────────────────────────────────────────
cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Daily renewal reminder job triggered at', new Date().toLocaleString());
    try {
        const result = await processRenewalReminders();
        console.log('[Cron] Renewal reminders complete:', result);
    } catch (err) {
        console.error('[Cron] Renewal reminder job failed:', err.message);
    }
}, {
    timezone: 'Asia/Manila'  // Philippine Standard Time
});

const PORT = process.env.PORT || 5000;

let server;
if (require.main === module) {
    server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = { app, server, getAuthRateLimitMax };
