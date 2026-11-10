require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cron = require('node-cron');
const { processRenewalReminders } = require('./services/renewalReminderService');
const initDatabase = require('./config/initDb');
const db = require('./config/db');

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
// CORS configuration - allow incoming requests from any frontend domain (Railway, Vercel, localhost)
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        return callback(null, true);
    },
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
app.use('/api/schedule', require('./routes/holidayRoutes'));

// Basic route for testing & uptime keep-alive ping
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to PermitEase API' });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

let server;

/**
 * Fail-closed server bootstrap sequence.
 * 1. Strictly awaits database health and schema verification.
 * 2. Halts launch immediately if any required migration is missing or failed.
 * 3. Registers background daemons ONLY after database verification passes.
 * 4. Binds Express HTTP listener ONLY after all prerequisites succeed.
 */
async function startServer() {
    try {
        console.log('[Startup] Permitease backend starting...');

        // 1. Await database initialization and schema verification (strictly read-only)
        await initDatabase();
        console.log('[Startup] Database initialization and schema checks verified.');

        // 2. Automated Renewal Reminder Daemon (registered ONLY after DB succeeds)
        cron.schedule('0 8 * * *', async () => {
            console.log('[Cron] Daily renewal reminder job triggered at', new Date().toLocaleString());
            try {
                const result = await processRenewalReminders();
                console.log('[Cron] Renewal reminders complete:', result);
            } catch (err) {
                console.error('[Cron] Renewal reminder job failed:', err.message);
            }
        }, {
            timezone: 'Asia/Manila'
        });
        console.log('[Startup] Renewal reminder daemon registered (08:00 AM PST).');

        // 3. Bind HTTP listener
        const PORT = process.env.PORT || 5000;
        server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT} (0.0.0.0)`);
        });

        return server;
    } catch (fatalErr) {
        console.error('[FATAL STARTUP ERROR] Application bootstrap failed:', fatalErr.message);
        console.error('[Startup] Aborting launch to protect database integrity.');

        // Gracefully drain and close database connection pool
        try {
            if (db && typeof db.end === 'function') {
                await db.end();
                console.log('[Startup] Database connection pool closed cleanly.');
            }
        } catch (poolErr) {
            console.warn('[Startup] Warning during pool closure:', poolErr.message);
        }

        process.exit(1);
    }
}

// Execute startup ONLY when file is run directly (never when imported by tests)
if (require.main === module) {
    startServer();
}

module.exports = { app, server, getAuthRateLimitMax, startServer };
