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
        // LGU ADMIN / SYSTEM ADMIN � preparation system stats only
        // ============================================================
        if (role === 'lgu_admin' || role === 'system_admin') {
            // Total registered MSMEs
            const [[{ total_businesses }]] = await db.query('SELECT COUNT(*) as total_businesses FROM businesses');

            // Pre-assessment counts (applications table using preparation statuses)
            const [[{ pending_pre_assessments }]] = await db.query("SELECT COUNT(*) as pending_pre_assessments FROM applications WHERE status IN ('SUBMITTED','UNDER_REVIEW')");
            const [[{ verified_pre_assessments }]] = await db.query("SELECT COUNT(*) as verified_pre_assessments FROM applications WHERE status = 'APPROVED'");
            const [[{ correction_requests }]] = await db.query("SELECT COUNT(*) as correction_requests FROM applications WHERE status IN ('REJECTED','NEEDS_CORRECTION')");

            // Readiness/compliance data from business_requirements
            const [[{ total_reqs }]] = await db.query('SELECT COUNT(*) as total_reqs FROM business_requirements');
            const [[{ missing_reqs }]] = await db.query("SELECT COUNT(*) as missing_reqs FROM business_requirements WHERE status = 'Missing'");
            
            // Average readiness % � only for businesses that have at least one assessment
            const [[{ assessed_count }]] = await db.query('SELECT COUNT(DISTINCT business_id) as assessed_count FROM assessments');
            let avg_readiness_pct = null;
            if (assessed_count > 0 && total_reqs > 0) {
                const ready_reqs = total_reqs - missing_reqs;
                avg_readiness_pct = Math.round((ready_reqs / total_reqs) * 100);
            }

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

            // Recent pre-assessment submissions
            const [recent_applications] = await db.query(`
                SELECT a.id, a.application_number, a.status, a.created_at,
                       b.business_name, b.business_type
                FROM applications a
                JOIN businesses b ON a.business_id = b.id
                ORDER BY a.created_at DESC LIMIT 8
            `);

            return res.json({
                role: 'admin',
                total_businesses,
                pending_pre_assessments,
                verified_pre_assessments,
                correction_requests,
                total_requirements: total_reqs,
                missing_requirements: missing_reqs,
                avg_readiness_pct,
                assessed_businesses: assessed_count,
                top_missing_requirements: top_missing,
                recent_applications
            });
        }

        // ============================================================
        // BUSINESS OWNER � personal stats
        // ============================================================
        const businessIds = await getUserBusinessIds(req.user.id);

        if (businessIds.length === 0) {
            return res.json({
                role: 'business_owner',
                total_businesses: 0, 
                compliance_score: 0, 
                total_requirements: 0,
                ready_requirements: 0,
                missing_requirements: 0, 
                bplo_verified_count: 0,
                docs_submitted_count: 0,
                assessment_completed: false,
                businesses: []
            });
        }

        const placeholders = businessIds.map(() => '?').join(',');

        // Compliance (Readiness)
        const [[{ total_reqs }]] = await db.query(`SELECT COUNT(*) as total_reqs FROM business_requirements WHERE business_id IN (${placeholders})`, businessIds);
        const [[{ missing_reqs }]] = await db.query(`SELECT COUNT(*) as missing_reqs FROM business_requirements WHERE business_id IN (${placeholders}) AND status = 'Missing'`, businessIds);
        const [[{ bplo_verified_count }]] = await db.query(`SELECT COUNT(*) as bplo_verified_count FROM business_requirements WHERE business_id IN (${placeholders}) AND bplo_status = 'BPLO Verified'`, businessIds);
        const [[{ docs_submitted_count }]] = await db.query(`SELECT COUNT(*) as docs_submitted_count FROM business_requirements WHERE business_id IN (${placeholders}) AND status IN ('Submitted','Approved')`, businessIds);
        
        const ready_reqs = total_reqs - missing_reqs;
        const compliance_score = total_reqs > 0 ? Math.round((ready_reqs / total_reqs) * 100) : 0;

        // Has assessment?
        const [[{ assessment_count }]] = await db.query(
            `SELECT COUNT(*) as assessment_count FROM assessments WHERE business_id IN (${placeholders})`,
            businessIds
        );

        // Get businesses list for display
        const [businesses] = await db.query('SELECT id, business_name, business_type, business_status FROM businesses WHERE user_id = ?', [req.user.id]);

        return res.json({
            role: 'business_owner',
            total_businesses: businessIds.length,
            compliance_score,
            total_requirements: total_reqs,
            ready_requirements: ready_reqs,
            missing_requirements: missing_reqs,
            bplo_verified_count: bplo_verified_count || 0,
            docs_submitted_count: docs_submitted_count || 0,
            assessment_completed: assessment_count > 0,
            businesses
        });

} catch (error) {
        console.error('Dashboard Error:', error);
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

module.exports = { getDashboardStats };
