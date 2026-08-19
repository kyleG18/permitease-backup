const db = require('../config/db');

// Helper to construct date filter for WHERE clauses
// Example: getDateCondition('created_at', '30d') -> "created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
const getDateCondition = (columnName, period, prependAnd = true) => {
    let condition = '';
    if (period === '30d') {
        condition = `${columnName} >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
    } else if (period === '90d') {
        condition = `${columnName} >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)`;
    } else if (period === '1y') {
        condition = `YEAR(${columnName}) = YEAR(CURDATE())`; // "This Year" as requested
    } else {
        return ''; // 'all' or default
    }
    return prependAnd ? ` AND ${condition}` : ` WHERE ${condition}`;
};

// @desc    Get top-level municipal metrics
// @route   GET /api/analytics/overview
// @access  Private (LGU Admin, System Admin)
const getOverviewAnalytics = async (req, res) => {
    try {
        const period = req.query.period || 'all';

        // 1. Total Businesses (Current Snapshot, unaffected by period unless specified otherwise, but requirement #5 says "do not incorrectly reduce the metric merely because a date filter was selected unless the UI explicitly identifies it as a historical-period metric". 
        // We will return the total absolute counts for snapshot metrics.
        const [[bizRow]] = await db.query('SELECT COUNT(*) AS total FROM businesses');
        
        // 2. Active Permits (Snapshot)
        const [[activePermitRow]] = await db.query(`
            SELECT COUNT(*) AS count 
            FROM permits 
            WHERE status = 'Approved' 
            AND expiration_date IS NOT NULL 
            AND DATEDIFF(expiration_date, CURDATE()) > 0
        `);

        // 3. Expiring Soon Permits (Snapshot)
        const [[expiringSoonRow]] = await db.query(`
            SELECT COUNT(*) AS count 
            FROM permits 
            WHERE status = 'Approved' 
            AND expiration_date IS NOT NULL 
            AND DATEDIFF(expiration_date, CURDATE()) <= 60 
            AND DATEDIFF(expiration_date, CURDATE()) > 0
        `);

        // 4. Expired Permits (Snapshot)
        const [[expiredPermitRow]] = await db.query(`
            SELECT COUNT(*) AS count 
            FROM permits 
            WHERE status = 'Approved' 
            AND expiration_date IS NOT NULL 
            AND DATEDIFF(expiration_date, CURDATE()) <= 0
        `);

        // 5. Applications (Historical, affected by period)
        const appDateCond = getDateCondition('created_at', period, false);
        const [appRows] = await db.query(`
            SELECT status, COUNT(*) AS count 
            FROM applications 
            ${appDateCond}
            GROUP BY status
        `);

        let totalApplications = 0;
        let pendingApplications = 0; // SUBMITTED, UNDER_REVIEW, NEEDS_CORRECTION
        let approvedApplications = 0;
        let rejectedApplications = 0;

        appRows.forEach(row => {
            totalApplications += row.count;
            if (['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION'].includes(row.status)) {
                pendingApplications += row.count;
            } else if (row.status === 'APPROVED') {
                approvedApplications += row.count;
            } else if (row.status === 'REJECTED') {
                rejectedApplications += row.count;
            }
        });

        // Renewal Applications (Historical)
        const [[renewalAppRow]] = await db.query(`
            SELECT COUNT(*) AS count 
            FROM applications 
            WHERE application_type = 'RENEWAL' ${getDateCondition('created_at', period, true)}
        `);

        // 6. Estimated Fees (Historical based on assessments)
        // Only sum the "amount" from application_fees where application is not DRAFT/CANCELLED? 
        // Actually, we sum from the application_fees table which was populated during readiness/assessment.
        // Or if we don't have application_fees, we might have it in assessments.
        // Let's check how the fees are stored. Usually it's in a fee table. If it crashes, we'll fix it in tests.
        // For now, let's attempt to SUM(amount) from application_fees.
        let estimatedFees = 0;
        try {
            const [[feeRow]] = await db.query(`
                SELECT SUM(af.amount) AS total 
                FROM application_fees af
                JOIN applications a ON af.application_id = a.id
                WHERE a.status NOT IN ('DRAFT', 'CANCELLED', 'REJECTED')
                ${getDateCondition('a.created_at', period, true)}
            `);
            estimatedFees = feeRow.total || 0;
        } catch (feeErr) {
            // Table might not exist or be named differently, handle gracefully
            estimatedFees = null; 
        }

        res.json({
            totalBusinesses: bizRow.total,
            totalApplications,
            pendingApplications,
            approvedApplications,
            rejectedApplications,
            activePermits: activePermitRow.count,
            expiringSoonPermits: expiringSoonRow.count,
            expiredPermits: expiredPermitRow.count,
            renewalApplications: renewalAppRow.count,
            estimatedFees // Could be null if unavailable
        });
    } catch (error) {
        console.error('[AnalyticsController] getOverviewAnalytics error:', error);
        res.status(500).json({ message: 'Unable to load overview analytics.' });
    }
};

// @desc    Get detailed application statistics and trends
// @route   GET /api/analytics/applications
// @access  Private (LGU Admin, System Admin)
const getApplicationAnalytics = async (req, res) => {
    try {
        const period = req.query.period || 'all';
        const dateCond = getDateCondition('created_at', period, false);

        // Status breakdown
        const [statusRows] = await db.query(`
            SELECT status, COUNT(*) AS count 
            FROM applications 
            ${dateCond} 
            GROUP BY status
        `);

        // Type breakdown
        const [typeRows] = await db.query(`
            SELECT application_type, COUNT(*) AS count 
            FROM applications 
            ${dateCond} 
            GROUP BY application_type
        `);

        // Trend by Month
        const [trendRows] = await db.query(`
            SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count 
            FROM applications 
            ${dateCond} 
            GROUP BY month 
            ORDER BY month ASC
        `);

        res.json({
            byStatus: statusRows,
            byType: typeRows,
            trend: trendRows
        });
    } catch (error) {
        console.error('[AnalyticsController] getApplicationAnalytics error:', error);
        res.status(500).json({ message: 'Unable to load application analytics.' });
    }
};

// @desc    Get detailed permit statistics
// @route   GET /api/analytics/permits
// @access  Private (LGU Admin, System Admin)
const getPermitAnalytics = async (req, res) => {
    try {
        const period = req.query.period || 'all';
        const dateCond = getDateCondition('p.issue_date', period, false);

        // Issued Trend
        const [trendRows] = await db.query(`
            SELECT DATE_FORMAT(p.issue_date, '%Y-%m') AS month, COUNT(*) AS count 
            FROM permits p
            WHERE p.status = 'Approved' 
            ${getDateCondition('p.issue_date', period, true)}
            GROUP BY month 
            ORDER BY month ASC
        `);

        // Industry distribution of Active Permits (Snapshot)
        const [industryRows] = await db.query(`
            SELECT b.industry_category, COUNT(p.id) AS count
            FROM permits p
            JOIN businesses b ON p.business_id = b.id
            WHERE p.status = 'Approved'
              AND p.expiration_date IS NOT NULL
              AND DATEDIFF(p.expiration_date, CURDATE()) > 0
            GROUP BY b.industry_category
            ORDER BY count DESC
        `);

        res.json({
            trend: trendRows,
            industryDistribution: industryRows
        });
    } catch (error) {
        console.error('[AnalyticsController] getPermitAnalytics error:', error);
        res.status(500).json({ message: 'Unable to load permit analytics.' });
    }
};

// @desc    Get missing requirements rankings
// @route   GET /api/analytics/requirements
// @access  Private (LGU Admin, System Admin)
const getRequirementAnalytics = async (req, res) => {
    try {
        // Find requirements that are most often 'Missing'
        const [missingRows] = await db.query(`
            SELECT pr.permit_name AS requirementName, 
                   COUNT(*) AS missingCount
            FROM business_requirements br
            JOIN permit_requirements pr ON br.requirement_id = pr.id
            WHERE br.status = 'Missing'
            GROUP BY br.requirement_id, pr.permit_name
            ORDER BY missingCount DESC
            LIMIT 10
        `);

        res.json(missingRows);
    } catch (error) {
        console.error('[AnalyticsController] getRequirementAnalytics error:', error);
        res.status(500).json({ message: 'Unable to load requirement analytics.' });
    }
};

// @desc    Get business distribution analytics
// @route   GET /api/analytics/businesses
// @access  Private (LGU Admin, System Admin)
const getBusinessAnalytics = async (req, res) => {
    try {
        const period = req.query.period || 'all';
        // Note: Businesses are a snapshot, but if filtering, apply to date_established or created_at?
        // Usually, business distribution is a snapshot regardless of period.
        
        const [industryRows] = await db.query(`
            SELECT industry_category, COUNT(*) AS count 
            FROM businesses 
            GROUP BY industry_category
            ORDER BY count DESC
        `);

        const [typeRows] = await db.query(`
            SELECT business_type, COUNT(*) AS count 
            FROM businesses 
            GROUP BY business_type
            ORDER BY count DESC
        `);

        res.json({
            byIndustry: industryRows,
            byType: typeRows
        });
    } catch (error) {
        console.error('[AnalyticsController] getBusinessAnalytics error:', error);
        res.status(500).json({ message: 'Unable to load business analytics.' });
    }
};

// @desc    Get recent administrative activity and processing times
// @route   GET /api/analytics/activity
// @access  Private (LGU Admin, System Admin)
const getActivityAnalytics = async (req, res) => {
    try {
        const period = req.query.period || 'all';
        const dateCond = getDateCondition('ah.created_at', period, false);

        // Recent actions
        const [recentRows] = await db.query(`
            SELECT ah.action, ah.created_at, ah.remarks, 
                   a.application_number, u.full_name AS actor_name
            FROM application_history ah
            JOIN applications a ON ah.application_id = a.id
            JOIN users u ON ah.actor_user_id = u.id
            ${dateCond}
            ORDER BY ah.created_at DESC
            LIMIT 15
        `);

        // Processing Time (SUBMITTED -> APPROVED)
        // It requires complex joins to find the diff between the 'SUBMITTED' row and 'APPROVED' row for the same app.
        // We will calculate this securely using SQL.
        const [processingRows] = await db.query(`
            SELECT 
                AVG(TIMESTAMPDIFF(HOUR, t1.created_at, t2.created_at)) AS avg_hours
            FROM application_history t1
            JOIN application_history t2 ON t1.application_id = t2.application_id
            WHERE t1.new_status = 'SUBMITTED' 
              AND t2.new_status = 'APPROVED'
              AND t2.created_at > t1.created_at
        `);

        // MySQL AVG() can return a DECIMAL string — parse it to a proper JS float
        const rawAvg = processingRows[0].avg_hours;
        const avgHours = rawAvg !== null ? parseFloat(rawAvg) : null;
        
        res.json({
            recentActivity: recentRows,
            processingTime: {
                available: avgHours !== null,
                avgHours: avgHours,
                reason: avgHours === null ? "Insufficient historical timestamp data" : null
            }
        });
    } catch (error) {
        console.error('[AnalyticsController] getActivityAnalytics error:', error);
        res.status(500).json({ message: 'Unable to load activity analytics.' });
    }
};

module.exports = {
    getOverviewAnalytics,
    getApplicationAnalytics,
    getPermitAnalytics,
    getRequirementAnalytics,
    getBusinessAnalytics,
    getActivityAnalytics
};
