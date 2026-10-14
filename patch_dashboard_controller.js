const fs = require('fs');
const path = './backend/controllers/dashboardController.js';
let content = fs.readFileSync(path, 'utf8');

const regexOwnerStats = /\/\/ ============================================================\s*\/\/ BUSINESS OWNER[\s\S]*?(?=catch \(error\))/;
const newOwnerStats = `// ============================================================
        // BUSINESS OWNER — personal stats
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
                assessment_completed: false,
                businesses: []
            });
        }

        const placeholders = businessIds.map(() => '?').join(',');

        // Compliance (Readiness)
        const [[{ total_reqs }]] = await db.query(\`SELECT COUNT(*) as total_reqs FROM business_requirements WHERE business_id IN (\${placeholders})\`, businessIds);
        const [[{ missing_reqs }]] = await db.query(\`SELECT COUNT(*) as missing_reqs FROM business_requirements WHERE business_id IN (\${placeholders}) AND status = 'Missing'\`, businessIds);
        
        const ready_reqs = total_reqs - missing_reqs;
        const compliance_score = total_reqs > 0 ? Math.round((ready_reqs / total_reqs) * 100) : 0;

        // Has assessment?
        const [[{ assessment_count }]] = await db.query(
            \`SELECT COUNT(*) as assessment_count FROM assessments WHERE business_id IN (\${placeholders})\`,
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
            assessment_completed: assessment_count > 0,
            businesses
        });

    `;

if (content.includes('active_permits')) {
    content = content.replace(regexOwnerStats, newOwnerStats);
    fs.writeFileSync(path, content);
    console.log('Patched dashboardController.js for business owner');
} else {
    console.log('Already patched dashboardController');
}
