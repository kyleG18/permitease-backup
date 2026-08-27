/**
 * test_analytics.js
 * Task #8 â€” Advanced LGU Analytics & Permit Management Dashboard
 * Integration Test Suite
 *
 * Tests:
 *  1. RBAC: business_owner â†’ 403
 *  2. RBAC: lgu_admin â†’ 200
 *  3. RBAC: system_admin â†’ 200
 *  4. Overview Analytics structure & safe values
 *  5. Overview date filtering
 *  6. Application Analytics (status, type, trend arrays)
 *  7. Permit Analytics (trend, industry)
 *  8. Requirement Analytics (ranked list)
 *  9. Business Analytics (industry, type aggregation)
 * 10. Activity Analytics (recent actions, safe processing time)
 * 11. Unauthenticated access â†’ 401
 * 12. Estimated fees NOT labeled as revenue
 * 13. No NaN / undefined in numeric fields
 * 14. Date period variants don't crash
 */

const axios = require('axios');
const db = require('../config/db');

const API = 'http://localhost:5000/api';

// -----------------------------------------------------------
// Known credentials (derived from actual DB seed)
// -----------------------------------------------------------
const SYSTEM_ADMIN_EMAIL    = 'admin@bizcheckpermit.gov.ph';
const SYSTEM_ADMIN_PASSWORD = 'admin123';

let bizOwnerToken   = '';
let lguAdminToken   = '';
let sysAdminToken   = '';
let testBizOwnerEmail = '';

// -----------------------------------------------------------
// Setup: obtain tokens
// -----------------------------------------------------------
const setup = async () => {
    // 1. Register a fresh business owner for RBAC tests
    testBizOwnerEmail = `analytics_bo_${Date.now()}@test.com`;
    const boRes = await axios.post(`${API}/auth/register`, {
        full_name: 'Analytics Test Owner',
        email: testBizOwnerEmail,
        password: 'password123',
        confirmPassword: 'password123'
    });
    bizOwnerToken = boRes.data.token;

    // 2. Login system_admin
    const sysRes = await axios.post(`${API}/auth/login`, {
        email: SYSTEM_ADMIN_EMAIL,
        password: SYSTEM_ADMIN_PASSWORD
    });
    sysAdminToken = sysRes.data.token;

    // 3. Find an lgu_admin from DB and log in using a test token
    const [admins] = await db.query(
        "SELECT email FROM users WHERE role = 'lgu_admin' LIMIT 1"
    );
    if (!admins.length) throw new Error('No lgu_admin user found in DB. Cannot run RBAC tests.');
    const lguAdminEmail = admins[0].email;

    // Generate a token directly (same as authController does) â€” avoids needing to know the hashed password
    const jwt = require('jsonwebtoken');
    const [lguUser] = await db.query('SELECT id, role FROM users WHERE email = ?', [lguAdminEmail]);
    lguAdminToken = jwt.sign(
        { id: lguUser[0].id, role: lguUser[0].role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------
const assert = (condition, message) => {
    if (!condition) {
        console.error(`âŒ FAIL: ${message}`);
        throw new Error(message);
    }
    console.log(`âœ… PASS: ${message}`);
};

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const isSafeNumber = (val) =>
    typeof val === 'number' && isFinite(val) && !isNaN(val);

// -----------------------------------------------------------
// Test runner
// -----------------------------------------------------------
const runTests = async () => {
    let passed = 0;
    let failed = 0;

    const test = async (name, fn) => {
        try {
            await fn();
            passed++;
        } catch (e) {
            failed++;
            console.error(`   â””â”€ ${e.message}`);
        }
    };

    console.log('\n==============================');
    console.log(' TASK #8 ANALYTICS TEST SUITE ');
    console.log('==============================\n');

    console.log('[Setup] Obtaining tokens...');
    await setup();
    console.log(`[Setup] âœ… business_owner token: ${bizOwnerToken ? 'obtained' : 'MISSING'}`);
    console.log(`[Setup] âœ… lgu_admin token: ${lguAdminToken ? 'obtained' : 'MISSING'}`);
    console.log(`[Setup] âœ… system_admin token: ${sysAdminToken ? 'obtained' : 'MISSING'}\n`);

    // -------------------------------------------------------
    // TEST GROUP 1: RBAC Security
    // -------------------------------------------------------
    console.log('--- GROUP 1: RBAC Security ---');

    await test('Unauthenticated request returns 401', async () => {
        try {
            await axios.get(`${API}/analytics/overview`);
            assert(false, 'Should have thrown 401');
        } catch (e) {
            assert(e.response && e.response.status === 401, `Expected 401, got ${e.response?.status}`);
        }
    });

    await test('business_owner â†’ 403 on /overview', async () => {
        try {
            await axios.get(`${API}/analytics/overview`, authHeader(bizOwnerToken));
            assert(false, 'Should have thrown 403');
        } catch (e) {
            assert(e.response && e.response.status === 403, `Expected 403, got ${e.response?.status}`);
        }
    });

    await test('business_owner â†’ 403 on /applications', async () => {
        try {
            await axios.get(`${API}/analytics/applications`, authHeader(bizOwnerToken));
            assert(false, 'Should have thrown 403');
        } catch (e) {
            assert(e.response && e.response.status === 403, `Expected 403, got ${e.response?.status}`);
        }
    });

    await test('business_owner â†’ 403 on /permits', async () => {
        try {
            await axios.get(`${API}/analytics/permits`, authHeader(bizOwnerToken));
            assert(false, 'Should have thrown 403');
        } catch (e) {
            assert(e.response && e.response.status === 403, `Expected 403, got ${e.response?.status}`);
        }
    });

    await test('lgu_admin â†’ 200 on all analytics endpoints', async () => {
        const endpoints = ['overview', 'applications', 'permits', 'requirements', 'businesses', 'activity'];
        for (const ep of endpoints) {
            const res = await axios.get(`${API}/analytics/${ep}`, authHeader(lguAdminToken));
            assert(res.status === 200, `lgu_admin: /analytics/${ep} returned ${res.status}`);
        }
    });

    await test('system_admin â†’ 200 on all analytics endpoints', async () => {
        const endpoints = ['overview', 'applications', 'permits', 'requirements', 'businesses', 'activity'];
        for (const ep of endpoints) {
            const res = await axios.get(`${API}/analytics/${ep}`, authHeader(sysAdminToken));
            assert(res.status === 200, `system_admin: /analytics/${ep} returned ${res.status}`);
        }
    });

    // -------------------------------------------------------
    // TEST GROUP 2: Overview Analytics
    // -------------------------------------------------------
    console.log('\n--- GROUP 2: Overview Analytics ---');

    await test('Overview returns all required fields', async () => {
        const res = await axios.get(`${API}/analytics/overview`, authHeader(sysAdminToken));
        const d = res.data;
        const requiredFields = [
            'totalBusinesses', 'totalApplications', 'pendingApplications',
            'approvedApplications', 'rejectedApplications', 'activePermits',
            'expiringSoonPermits', 'expiredPermits', 'renewalApplications'
        ];
        for (const field of requiredFields) {
            assert(field in d, `Field '${field}' present in overview response`);
        }
    });

    await test('Overview snapshot metrics are non-negative integers', async () => {
        const res = await axios.get(`${API}/analytics/overview`, authHeader(sysAdminToken));
        const d = res.data;
        const snapshotFields = ['totalBusinesses', 'activePermits', 'expiringSoonPermits', 'expiredPermits'];
        for (const field of snapshotFields) {
            assert(isSafeNumber(d[field]) && d[field] >= 0, `${field} is a non-negative number (got ${d[field]})`);
        }
    });

    await test('estimatedFees is either null or a finite number (NOT labeled as revenue)', async () => {
        const res = await axios.get(`${API}/analytics/overview`, authHeader(sysAdminToken));
        const fees = res.data.estimatedFees;
        assert(fees === null || isSafeNumber(fees), `estimatedFees is null or a safe number (got ${fees})`);
        // The field name itself must be estimatedFees, not collectedRevenue or totalRevenue
        assert(!('collectedRevenue' in res.data), 'No "collectedRevenue" field in response');
        assert(!('totalRevenue' in res.data), 'No "totalRevenue" field in response');
    });

    await test('Overview matches actual DB counts for businesses', async () => {
        const res = await axios.get(`${API}/analytics/overview`, authHeader(sysAdminToken));
        const [[dbRow]] = await db.query('SELECT COUNT(*) AS total FROM businesses');
        assert(
            res.data.totalBusinesses === dbRow.total,
            `totalBusinesses matches DB: API=${res.data.totalBusinesses}, DB=${dbRow.total}`
        );
    });

    await test('activePermits matches DB (status=Approved, expiration > today)', async () => {
        const res = await axios.get(`${API}/analytics/overview`, authHeader(sysAdminToken));
        const [[dbRow]] = await db.query(
            "SELECT COUNT(*) AS count FROM permits WHERE status = 'Approved' AND expiration_date IS NOT NULL AND DATEDIFF(expiration_date, CURDATE()) > 0"
        );
        assert(
            res.data.activePermits === dbRow.count,
            `activePermits matches DB: API=${res.data.activePermits}, DB=${dbRow.count}`
        );
    });

    await test('expiringSoonPermits uses exactly 60-day threshold (consistent with renewalReminderService)', async () => {
        const res = await axios.get(`${API}/analytics/overview`, authHeader(sysAdminToken));
        const [[dbRow]] = await db.query(
            "SELECT COUNT(*) AS count FROM permits WHERE status = 'Approved' AND expiration_date IS NOT NULL AND DATEDIFF(expiration_date, CURDATE()) <= 60 AND DATEDIFF(expiration_date, CURDATE()) > 0"
        );
        assert(
            res.data.expiringSoonPermits === dbRow.count,
            `expiringSoonPermits matches 60-day threshold: API=${res.data.expiringSoonPermits}, DB=${dbRow.count}`
        );
    });

    // -------------------------------------------------------
    // TEST GROUP 3: Date Filtering
    // -------------------------------------------------------
    console.log('\n--- GROUP 3: Date Filtering ---');

    await test('All period variants return 200 without crashing', async () => {
        const periods = ['30d', '90d', '1y', 'all'];
        for (const p of periods) {
            const res = await axios.get(`${API}/analytics/overview?period=${p}`, authHeader(sysAdminToken));
            assert(res.status === 200, `period=${p} returned ${res.status}`);
            assert(isSafeNumber(res.data.totalApplications) || res.data.totalApplications === 0, `totalApplications is safe for period=${p}`);
        }
    });

    await test('Snapshot metrics (totalBusinesses, activePermits) do NOT change when period changes', async () => {
        const resAll  = await axios.get(`${API}/analytics/overview?period=all`, authHeader(sysAdminToken));
        const res30d  = await axios.get(`${API}/analytics/overview?period=30d`, authHeader(sysAdminToken));
        assert(
            resAll.data.totalBusinesses === res30d.data.totalBusinesses,
            `totalBusinesses is same across periods (snapshot metric): all=${resAll.data.totalBusinesses}, 30d=${res30d.data.totalBusinesses}`
        );
        assert(
            resAll.data.activePermits === res30d.data.activePermits,
            `activePermits is same across periods (snapshot metric): all=${resAll.data.activePermits}, 30d=${res30d.data.activePermits}`
        );
    });

    // -------------------------------------------------------
    // TEST GROUP 4: Application Analytics
    // -------------------------------------------------------
    console.log('\n--- GROUP 4: Application Analytics ---');

    await test('Applications endpoint returns byStatus, byType, trend arrays', async () => {
        const res = await axios.get(`${API}/analytics/applications`, authHeader(sysAdminToken));
        assert(Array.isArray(res.data.byStatus), 'byStatus is an array');
        assert(Array.isArray(res.data.byType), 'byType is an array');
        assert(Array.isArray(res.data.trend), 'trend is an array');
    });

    await test('Application status breakdown matches DB', async () => {
        const res = await axios.get(`${API}/analytics/applications?period=all`, authHeader(sysAdminToken));
        const [[dbRow]] = await db.query("SELECT COUNT(*) AS total FROM applications");
        const apiTotal = res.data.byStatus.reduce((sum, row) => sum + row.count, 0);
        assert(apiTotal === dbRow.total, `Application count matches DB: API=${apiTotal}, DB=${dbRow.total}`);
    });

    await test('NEW vs RENEWAL types do not double-count applications', async () => {
        const res = await axios.get(`${API}/analytics/applications?period=all`, authHeader(sysAdminToken));
        const [[dbRow]] = await db.query("SELECT COUNT(*) AS total FROM applications");
        const apiTypeTotal = res.data.byType.reduce((sum, row) => sum + row.count, 0);
        assert(apiTypeTotal === dbRow.total, `NEW+RENEWAL total matches all applications: API=${apiTypeTotal}, DB=${dbRow.total}`);
    });

    // -------------------------------------------------------
    // TEST GROUP 5: Permit Analytics
    // -------------------------------------------------------
    console.log('\n--- GROUP 5: Permit Analytics ---');

    await test('Permits endpoint returns trend and industryDistribution arrays', async () => {
        const res = await axios.get(`${API}/analytics/permits`, authHeader(sysAdminToken));
        assert(Array.isArray(res.data.trend), 'trend is an array');
        assert(Array.isArray(res.data.industryDistribution), 'industryDistribution is an array');
    });

    await test('Permit analytics do not count applications as permits', async () => {
        const res = await axios.get(`${API}/analytics/overview`, authHeader(sysAdminToken));
        const [[permitCount]] = await db.query("SELECT COUNT(*) AS total FROM permits WHERE status = 'Approved'");
        // activePermits + expiringSoonPermits + expiredPermits should not exceed actual permit count
        const totalAccountedPermits = res.data.activePermits + res.data.expiringSoonPermits + res.data.expiredPermits;
        assert(
            totalAccountedPermits <= permitCount.total,
            `Permit categories (${totalAccountedPermits}) do not exceed actual permits in DB (${permitCount.total})`
        );
    });

    // -------------------------------------------------------
    // TEST GROUP 6: Requirement Analytics
    // -------------------------------------------------------
    console.log('\n--- GROUP 6: Requirement Analytics ---');

    await test('Requirements endpoint returns an array (possibly empty)', async () => {
        const res = await axios.get(`${API}/analytics/requirements`, authHeader(sysAdminToken));
        assert(Array.isArray(res.data), 'Returns an array');
    });

    await test('Missing requirement counts come from actual business_requirements records', async () => {
        const res = await axios.get(`${API}/analytics/requirements`, authHeader(sysAdminToken));
        const [[dbRow]] = await db.query("SELECT COUNT(*) AS total FROM business_requirements WHERE status = 'Missing'");
        const apiTotal = res.data.reduce((sum, r) => sum + r.missingCount, 0);
        assert(apiTotal <= dbRow.total, `API missing counts (${apiTotal}) do not exceed DB count (${dbRow.total})`);
    });

    // -------------------------------------------------------
    // TEST GROUP 7: Business Analytics
    // -------------------------------------------------------
    console.log('\n--- GROUP 7: Business Analytics ---');

    await test('Business analytics returns byIndustry and byType arrays', async () => {
        const res = await axios.get(`${API}/analytics/businesses`, authHeader(sysAdminToken));
        assert(Array.isArray(res.data.byIndustry), 'byIndustry is an array');
        assert(Array.isArray(res.data.byType), 'byType is an array');
    });

    await test('Business industry aggregation matches actual businesses table', async () => {
        const res = await axios.get(`${API}/analytics/businesses`, authHeader(sysAdminToken));
        const [[dbRow]] = await db.query('SELECT COUNT(*) AS total FROM businesses');
        const apiTotal = res.data.byIndustry.reduce((sum, r) => sum + r.count, 0);
        assert(apiTotal === dbRow.total, `Industry aggregation total (${apiTotal}) matches DB total (${dbRow.total})`);
    });

    await test('Business type aggregation does not double-count businesses', async () => {
        const res = await axios.get(`${API}/analytics/businesses`, authHeader(sysAdminToken));
        const [[dbRow]] = await db.query('SELECT COUNT(*) AS total FROM businesses');
        const apiTotal = res.data.byType.reduce((sum, r) => sum + r.count, 0);
        assert(apiTotal === dbRow.total, `Type aggregation total (${apiTotal}) matches DB total (${dbRow.total})`);
    });

    // -------------------------------------------------------
    // TEST GROUP 8: Activity Analytics
    // -------------------------------------------------------
    console.log('\n--- GROUP 8: Activity Analytics ---');

    await test('Activity endpoint returns recentActivity array and processingTime object', async () => {
        const res = await axios.get(`${API}/analytics/activity`, authHeader(sysAdminToken));
        assert(Array.isArray(res.data.recentActivity), 'recentActivity is an array');
        assert(typeof res.data.processingTime === 'object' && res.data.processingTime !== null, 'processingTime is an object');
    });

    await test('processingTime is honest: available flag and reason are set appropriately', async () => {
        const res = await axios.get(`${API}/analytics/activity`, authHeader(sysAdminToken));
        const pt = res.data.processingTime;
        assert('available' in pt, 'processingTime has available flag');
        if (!pt.available) {
            assert(typeof pt.reason === 'string' && pt.reason.length > 0, 'Reason provided when data insufficient');
        } else {
            assert(isSafeNumber(pt.avgHours), `avgHours is a finite number when available (got ${pt.avgHours})`);
        }
    });

    await test('Activity records do not expose passwords or tokens', async () => {
        const res = await axios.get(`${API}/analytics/activity`, authHeader(sysAdminToken));
        const raw = JSON.stringify(res.data);
        assert(!raw.includes('"password"'), 'No password field in activity response');
        assert(!raw.includes('"token"'), 'No token field in activity response');
    });

    // -------------------------------------------------------
    // Summary
    // -------------------------------------------------------
    console.log('\n==============================');
    console.log(`  PASSED: ${passed}`);
    console.log(`  FAILED: ${failed}`);
    console.log('==============================\n');

    process.exit(failed > 0 ? 1 : 0);
};

runTests().catch(e => {
    console.error('FATAL ERROR in test setup:', e.message);
    process.exit(1);
});
