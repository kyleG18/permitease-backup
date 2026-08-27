const axios = require('axios');
require('dotenv').config();

const API = 'http://localhost:5000/api';
let passed = 0;
let failed = 0;

const assert = (condition, message) => {
    if (!condition) {
        console.error(`  âŒ FAIL: ${message}`);
        failed++;
    } else {
        console.log(`  âœ… PASS: ${message}`);
        passed++;
    }
};

async function runTests() {
    console.log('\n==============================');
    console.log('  TASK #10 ONBOARDING TESTS  ');
    console.log('==============================\n');

    const ts = Date.now();
    const newOwnerEmail = `onboard_new_${ts}@test.com`;
    const existingOwnerEmail = `onboard_existing_${ts}@test.com`;
    const lguAdminEmail = `admin@bizcheckpermit.gov.ph`;
    let newOwnerToken, existingOwnerToken, lguAdminToken;
    let newBizId, existingBizId;

    // â”€â”€â”€ Setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    try {
        // Register a brand-new business owner
        const r1 = await axios.post(`${API}/auth/register`, {
            full_name: 'New MSME Owner',
            email: newOwnerEmail,
            password: 'password123',
            confirmPassword: 'password123',
            contact_number: '09111111111'
        });
        newOwnerToken = r1.data.token;

        // Register a second business owner, create a business for them
        const r2 = await axios.post(`${API}/auth/register`, {
            full_name: 'Existing MSME Owner',
            email: existingOwnerEmail,
            password: 'password123',
            confirmPassword: 'password123',
            contact_number: '09222222222'
        });
        existingOwnerToken = r2.data.token;
        const existBiz = await axios.post(`${API}/businesses`, {
            business_name: 'Pre-existing Business',
            business_type: 'Food',
            industry_category: 'Restaurant',
            business_status: 'New Application',
            address: '100 Old Street'
        }, { headers: { Authorization: `Bearer ${existingOwnerToken}` } });
        existingBizId = existBiz.data.id;

        // Login as LGU admin
        const r3 = await axios.post(`${API}/auth/login`, {
            email: lguAdminEmail,
            password: 'admin123'
        });
        lguAdminToken = r3.data.token;

        console.log('[Setup] âœ… All test users ready.\n');
    } catch (err) {
        console.error('[Setup] âŒ FATAL - Could not create test users:', err.response?.data || err.message);
        process.exit(1);
    }

    const newOwnerH = { headers: { Authorization: `Bearer ${newOwnerToken}` } };
    const existOwnerH = { headers: { Authorization: `Bearer ${existingOwnerToken}` } };
    const lguAdminH = { headers: { Authorization: `Bearer ${lguAdminToken}` } };

    // â”€â”€â”€ Test 1: New user has no businesses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('--- TEST 1: New business_owner has no businesses ---');
    try {
        const res = await axios.get(`${API}/businesses`, newOwnerH);
        assert(Array.isArray(res.data) && res.data.length === 0,
            'Brand-new user has 0 businesses (NOT ONBOARDED).');
    } catch (err) {
        assert(false, `Businesses endpoint failed: ${err.message}`);
    }

    // â”€â”€â”€ Test 2: Business owner can create a business via existing API â”€â”€â”€â”€â”€â”€â”€
    console.log('\n--- TEST 2: Business owner can create a business via existing API ---');
    try {
        const res = await axios.post(`${API}/businesses`, {
            business_name: 'My Onboarded Business',
            business_type: 'Retail',
            industry_category: 'Sari-Sari Store',
            business_status: 'New Application',
            address: '45 Rizal Street, Roxas',
            capitalization: '150000',
            gross_sales: '',
            floor_area: '30',
            employees: '2'
        }, newOwnerH);
        assert(res.status === 201, 'Business creation returns HTTP 201.');
        newBizId = res.data.id;
        assert(newBizId != null, 'New business ID is returned in response.');
        // Verify by fetching the created business
        const fetchRes = await axios.get(`${API}/businesses`, newOwnerH);
        const created = fetchRes.data.find(b => b.id === newBizId);
        assert(created?.business_name === 'My Onboarded Business', 'Business name is correctly saved (verified via GET).');
    } catch (err) {
        assert(false, `Business creation failed: ${err.response?.data?.message || err.message}`);
    }

    // â”€â”€â”€ Test 3: Existing business owner is not re-onboarded â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\n--- TEST 3: Existing business owner already has a business ---');
    try {
        const res = await axios.get(`${API}/businesses`, existOwnerH);
        assert(Array.isArray(res.data) && res.data.length > 0,
            'Existing user has at least 1 business (ONBOARDED, skips onboarding).');
    } catch (err) {
        assert(false, `Failed to fetch existing owner businesses: ${err.message}`);
    }

    // â”€â”€â”€ Test 4: LGU admin has unrestricted access â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // LGU admin applications list is at /api/applications/admin/all
    console.log('\n--- TEST 4: LGU admin has unrestricted access ---');
    try {
        const res = await axios.get(`${API}/applications/admin/all`, lguAdminH);
        assert(res.status === 200, 'LGU admin can access permit applications without restriction.');
    } catch (err) {
        assert(false, `LGU admin applications route failed: ${err.response?.data?.message || err.message}`);
    }

    // â”€â”€â”€ Test 5: Business API unchanged after onboarding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\n--- TEST 5: Existing business API contract is unchanged ---');
    try {
        const res = await axios.get(`${API}/businesses`, newOwnerH);
        assert(res.data.length === 1, 'Business count is exactly 1 after single onboarding submission.');
        assert(res.data[0].business_name === 'My Onboarded Business', 'Business data is correctly persisted.');
        assert(res.data[0].industry_category === 'Sari-Sari Store', 'Industry category is correctly persisted.');
    } catch (err) {
        assert(false, `Business retrieval failed: ${err.message}`);
    }

    // â”€â”€â”€ Test 6: Readiness works immediately after business creation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\n--- TEST 6: Readiness API works immediately after business creation ---');
    try {
        const res = await axios.get(`${API}/readiness/${newBizId}?application_type=NEW`, newOwnerH);
        assert(res.status === 200, 'Readiness endpoint returns 200 for new business.');
        assert(res.data.overall_state !== undefined, 'Readiness returns overall_state.');
        assert(typeof res.data.readiness_score === 'number', 'Readiness returns a numeric score.');
        assert(Array.isArray(res.data.categories), 'Readiness returns categories array.');
        console.log(`    (Info) Score: ${res.data.readiness_score}% â€” State: ${res.data.overall_state}`);
    } catch (err) {
        assert(false, `Readiness failed: ${err.response?.data?.message || err.message}`);
    }

    // â”€â”€â”€ Test 7: Duplicate business detection still works â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\n--- TEST 7: Duplicate business name is allowed (different users) ---');
    try {
        const res = await axios.post(`${API}/businesses`, {
            business_name: 'My Onboarded Business',
            business_type: 'Food',
            industry_category: 'Bakery',
            business_status: 'New Application',
            address: '99 Another St'
        }, existOwnerH);
        assert(res.status === 201, 'Different user can create a business with the same name (no cross-user collision).');
    } catch (err) {
        assert(false, `Duplicate check failed unexpectedly: ${err.response?.data?.message || err.message}`);
    }

    // â”€â”€â”€ Test 8: Unauthorized access is blocked â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\n--- TEST 8: Unauthorized business access is blocked ---');
    try {
        await axios.get(`${API}/businesses/${newBizId}`, existOwnerH);
        assert(false, 'Should not be able to access another user\'s business.');
    } catch (err) {
        assert(err.response?.status === 403 || err.response?.status === 401 || err.response?.status === 404,
            'Another owner cannot access this business (403/404 returned).');
    }

    // â”€â”€â”€ Test 9: System admin is not restricted â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\n--- TEST 9: System admin access is unrestricted ---');
    try {
        const sysRes = await axios.post(`${API}/auth/login`, {
            email: 'admin@bizcheckpermit.gov.ph',
            password: 'admin123'
        });
        const sysH = { headers: { Authorization: `Bearer ${sysRes.data.token}` } };
        const auditRes = await axios.get(`${API}/admin/audit-logs`, sysH);
        assert(auditRes.status === 200, 'System admin can access admin routes without any business check.');
    } catch (err) {
        assert(false, `System admin access failed: ${err.response?.data?.message || err.message}`);
    }

    // â”€â”€â”€ Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\n==============================');
    console.log(`  PASSED: ${passed}`);
    console.log(`  FAILED: ${failed}`);
    console.log('==============================\n');
    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Unexpected error:', err.message);
    process.exit(1);
});
