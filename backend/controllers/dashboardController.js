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

            // ── PHASE 2: Walk-in Scheduling Stats ──────────────────────────────
            const today = new Date().toISOString().split('T')[0];
            const [[{ todays_walkin_count }]] = await db.query(
                "SELECT COUNT(*) as todays_walkin_count FROM applications WHERE walkin_date = ? AND walkin_status IN ('SCHEDULED','PENDING')",
                [today]
            );
            const [[{ todays_attended_count }]] = await db.query(
                "SELECT COUNT(*) as todays_attended_count FROM applications WHERE walkin_date = ? AND walkin_status = 'ATTENDED'",
                [today]
            );
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const [[{ week_walkins_scheduled }]] = await db.query(
                "SELECT COUNT(*) as week_walkins_scheduled FROM applications WHERE walkin_date BETWEEN ? AND ? AND walkin_status IN ('SCHEDULED','PENDING','ATTENDED')",
                [today, nextWeek.toISOString().split('T')[0]]
            );

            // ── PHASE 1: Statutory Renewal Radar ───────────────────────────────
            const now = new Date();
            const year = now.getFullYear();
            const jan20 = new Date(`${year}-01-20`);
            const dec1 = new Date(`${year}-12-01`);
            const dec31 = new Date(`${year}-12-31`);

            let delinquent_count = 0, expiring_soon_count = 0, renewal_window_count = 0, active_count = 0;
            try {
                const [permitRows] = await db.query("SELECT expiration_date FROM permits WHERE status = 'Approved'");
                permitRows.forEach(p => {
                    if (!p.expiration_date) return;
                    const expiry = new Date(p.expiration_date);
                    const expYear = expiry.getFullYear();
                    if (now > jan20 && expYear < year) {
                        delinquent_count++;
                    } else if (now >= new Date(`${year}-01-01`) && now <= jan20) {
                        renewal_window_count++;
                    } else if (now >= dec1 && now <= dec31) {
                        expiring_soon_count++;
                    } else {
                        active_count++;
                    }
                });
            } catch(e) { /* permits table might be empty */ }

            // ── PHASE 3: Configured Requirements ──────────────────────────────
            const [[{ configured_requirements }]] = await db.query('SELECT COUNT(*) as configured_requirements FROM permit_requirements');

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
                recent_applications,
                // Phase 2 – walk-in queue
                todays_walkin_count: todays_walkin_count || 0,
                todays_attended_count: todays_attended_count || 0,
                week_walkins_scheduled: week_walkins_scheduled || 0,
                // Phase 1 – renewal radar
                delinquent_count,
                expiring_soon_count,
                renewal_window_count,
                active_count,
                // Phase 3 – requirements config
                configured_requirements
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
        // bplo_status column may not exist on older Railway schemas — handle gracefully
        let bplo_verified_count = 0;
        try {
            const [bploRows] = await db.query(`SELECT COUNT(*) as bplo_verified_count FROM business_requirements WHERE business_id IN (${placeholders}) AND bplo_status = 'BPLO Verified'`, businessIds);
            bplo_verified_count = bploRows[0]?.bplo_verified_count || 0;
        } catch (e) {
            // column doesn't exist yet — skip
        }
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

        // Nearest expiring permit for renewal alert
        let next_expiration = null;
        let days_to_expiration = null;
        try {
            const [expiryRows] = await db.query(
                `SELECT expiration_date FROM permits WHERE business_id IN (${placeholders}) AND status = 'Approved' AND expiration_date IS NOT NULL ORDER BY expiration_date ASC LIMIT 1`,
                businessIds
            );
            if (expiryRows.length > 0 && expiryRows[0].expiration_date) {
                next_expiration = expiryRows[0].expiration_date;
                const diffMs = new Date(next_expiration) - new Date();
                days_to_expiration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            }
        } catch (e) { /* permits table may not exist */ }

        // Active walk-in appointment (if any)
        let active_walkin = null;
        try {
            const [walkinRows] = await db.query(
                `SELECT a.id, a.application_number, a.walkin_date, a.walkin_time_slot, a.queue_ticket_number, a.walkin_status,
                        b.business_name
                 FROM applications a
                 JOIN businesses b ON a.business_id = b.id
                 WHERE a.user_id = ? AND a.walkin_date IS NOT NULL
                 ORDER BY a.walkin_date DESC LIMIT 1`,
                [req.user.id]
            );
            if (walkinRows.length > 0) {
                active_walkin = walkinRows[0];
            }
        } catch (e) { /* ignore */ }

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
            next_expiration,
            days_to_expiration,
            businesses,
            active_walkin
        });

} catch (error) {
        console.error('Dashboard Error:', error);
        console.error('Server error:', error);
        res.status(500).json({ message: 'An internal server error occurred. Please try again later.' });
    }
};

module.exports = { getDashboardStats };
