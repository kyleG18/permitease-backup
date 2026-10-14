const fs = require('fs');
const path = './backend/controllers/dashboardController.js';
let c = fs.readFileSync(path, 'utf8');

// Replace the entire LGU ADMIN block
const oldBlock = /\/\/ ============================================================\s*\/\/ LGU ADMIN \/ SYSTEM ADMIN[\s\S]*?return res\.json\(\{[\s\S]*?expiring_soon: expiring,[\s\S]*?\}\);/;

const newBlock = `// ============================================================
        // LGU ADMIN / SYSTEM ADMIN — preparation system stats only
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
            
            // Average readiness % — only for businesses that have at least one assessment
            const [[{ assessed_count }]] = await db.query('SELECT COUNT(DISTINCT business_id) as assessed_count FROM assessments');
            let avg_readiness_pct = null;
            if (assessed_count > 0 && total_reqs > 0) {
                const ready_reqs = total_reqs - missing_reqs;
                avg_readiness_pct = Math.round((ready_reqs / total_reqs) * 100);
            }

            // Top missing requirements
            const [top_missing] = await db.query(\`
                SELECT pr.permit_name, COUNT(br.id) as missing_count
                FROM business_requirements br
                JOIN permit_requirements pr ON br.requirement_id = pr.id
                WHERE br.status = 'Missing'
                GROUP BY br.requirement_id, pr.permit_name
                ORDER BY missing_count DESC
                LIMIT 5
            \`);

            // Recent pre-assessment submissions
            const [recent_applications] = await db.query(\`
                SELECT a.id, a.application_number, a.status, a.created_at,
                       b.business_name, b.business_type
                FROM applications a
                JOIN businesses b ON a.business_id = b.id
                ORDER BY a.created_at DESC LIMIT 8
            \`);

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
        }`;

if (oldBlock.test(c)) {
    c = c.replace(oldBlock, newBlock);
    fs.writeFileSync(path, c);
    console.log('Patched dashboardController.js admin block');
} else {
    console.log('Pattern not found - trying alternative approach');
    // Write the full file output for inspection
    console.log('First 200 chars of admin block area:');
    const idx = c.indexOf('LGU ADMIN');
    if (idx > -1) console.log(c.substring(idx, idx+200));
}
