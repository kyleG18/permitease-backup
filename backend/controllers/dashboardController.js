const db = require('../config/db');

const getUserBusinessIds = async (userId) => {
    const [businesses] = await db.query('SELECT id FROM businesses WHERE user_id = ?', [userId]);
    return businesses.map(b => b.id);
};

// @desc    Get dashboard stats (role-aware)
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
    try {
        const role = req.user.role;

        // ============================================================
        // LGU ADMIN / SYSTEM ADMIN — municipal-wide stats
        // ============================================================
        if (role === 'lgu_admin' || role === 'system_admin') {
            const [[{ total_businesses }]] = await db.query('SELECT COUNT(*) as total_businesses FROM businesses');
            const [[{ total_permits }]] = await db.query('SELECT COUNT(*) as total_permits FROM permits');
            const [[{ pending }]] = await db.query("SELECT COUNT(*) as pending FROM permits WHERE status = 'Pending'");
            const [[{ approved }]] = await db.query("SELECT COUNT(*) as approved FROM permits WHERE status = 'Approved'");
            const [[{ rejected }]] = await db.query("SELECT COUNT(*) as rejected FROM permits WHERE status = 'Rejected'");
            const [[{ expired }]] = await db.query("SELECT COUNT(*) as expired FROM permits WHERE status = 'Expired' OR (status = 'Approved' AND expiration_date < CURDATE())");
            const [[{ expiring }]] = await db.query("SELECT COUNT(*) as expiring FROM permits WHERE status = 'Approved' AND expiration_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY)");

            // Compliance stats using business_requirements
            const [[{ total_reqs }]] = await db.query('SELECT COUNT(*) as total_reqs FROM business_requirements');
            const [[{ missing_reqs }]] = await db.query("SELECT COUNT(*) as missing_reqs FROM business_requirements WHERE status = 'Missing'");
            const compliance_rate = total_reqs > 0 ? Math.round(((total_reqs - missing_reqs) / total_reqs) * 100) : 0;

            // Top missing requirements
            const [top_missing] = await db.query(`
                SELECT pr.permit_name, COUNT(br.id) as missing_count
                FROM business_requirements br
                JOIN permit_requirements pr ON br.requirement_id = pr.id
                WHERE br.status = 'Missing'
                GROUP BY br.requirement_id, pr.permit_name
                ORDER BY missing_count DESC
                LIMIT 5
            `);

            // Recent applications
            const [recent_applications] = await db.query(`
                SELECT p.*, b.business_name
                FROM permits p
                JOIN businesses b ON p.business_id = b.id
                ORDER BY p.created_at DESC LIMIT 8
            `);

            return res.json({
                role: 'admin',
                total_businesses, total_permits,
                pending_applications: pending,
                approved_applications: approved,
                rejected_applications: rejected,
                expired_permits: expired,
                expiring_soon: expiring,
                compliance_rate,
                total_requirements: total_reqs,
                missing_requirements: missing_reqs,
                top_missing_requirements: top_missing,
                recent_applications
            });
        }

        // ============================================================
        // BUSINESS OWNER — personal stats
        // ============================================================
        const businessIds = await getUserBusinessIds(req.user.id);

        if (businessIds.length === 0) {
            return res.json({
                role: 'business_owner',
                total_permits: 0, active_permits: 0, expiring_soon: 0, expired_permits: 0,
                total_businesses: 0, pending_applications: 0, rejected_applications: 0,
                compliance_score: 0, missing_requirements: 0, estimated_total: 0,
                next_expiration: null, days_to_expiration: null, businesses: []
            });
        }

        const placeholders = businessIds.map(() => '?').join(',');

        const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM permits WHERE business_id IN (${placeholders})`, businessIds);
        const [[{ active }]] = await db.query(`SELECT COUNT(*) as active FROM permits WHERE business_id IN (${placeholders}) AND status = 'Approved' AND expiration_date > CURDATE()`, businessIds);
        const [[{ expiring }]] = await db.query(`SELECT COUNT(*) as expiring FROM permits WHERE business_id IN (${placeholders}) AND status = 'Approved' AND expiration_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY)`, businessIds);
        const [[{ expired }]] = await db.query(`SELECT COUNT(*) as expired FROM permits WHERE business_id IN (${placeholders}) AND (status = 'Expired' OR expiration_date < CURDATE())`, businessIds);
        const [[{ pending }]] = await db.query(`SELECT COUNT(*) as pending FROM permits WHERE business_id IN (${placeholders}) AND status = 'Pending'`, businessIds);
        const [[{ rejected }]] = await db.query(`SELECT COUNT(*) as rejected FROM permits WHERE business_id IN (${placeholders}) AND status = 'Rejected'`, businessIds);

        // Next expiration
        const [nextExpiry] = await db.query(
            `SELECT expiration_date FROM permits WHERE business_id IN (${placeholders}) AND status = 'Approved' AND expiration_date >= CURDATE() ORDER BY expiration_date ASC LIMIT 1`,
            businessIds
        );
        const next_expiration = nextExpiry.length > 0 ? nextExpiry[0].expiration_date : null;
        const days_to_expiration = next_expiration
            ? Math.ceil((new Date(next_expiration) - new Date()) / (1000 * 60 * 60 * 24))
            : null;

        // Compliance
        const [[{ total_reqs }]] = await db.query(`SELECT COUNT(*) as total_reqs FROM business_requirements WHERE business_id IN (${placeholders})`, businessIds);
        const [[{ missing_reqs }]] = await db.query(`SELECT COUNT(*) as missing_reqs FROM business_requirements WHERE business_id IN (${placeholders}) AND status = 'Missing'`, businessIds);
        const compliance_score = total_reqs > 0 ? Math.round(((total_reqs - missing_reqs) / total_reqs) * 100) : 0;

        // Estimate total from latest assessment
        const [assessments] = await db.query(
            `SELECT compliance_score FROM assessments WHERE business_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 1`,
            businessIds
        );

        // Get businesses list for display
        const [businesses] = await db.query('SELECT id, business_name, business_type, business_status FROM businesses WHERE user_id = ?', [req.user.id]);

        return res.json({
            role: 'business_owner',
            total_permits: total,
            active_permits: active,
            expiring_soon: expiring,
            expired_permits: expired,
            pending_applications: pending,
            rejected_applications: rejected,
            total_businesses: businessIds.length,
            compliance_score,
            missing_requirements: missing_reqs,
            next_expiration,
            days_to_expiration,
            businesses
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

module.exports = { getDashboardStats };
