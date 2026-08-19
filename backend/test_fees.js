/**
 * Fee Calculation API Acceptance Tests
 * Tests the GET /api/applications/:id/fees endpoint
 */
const axios = require('axios');
const db = require('./config/db');
const jwt = require('jsonwebtoken');

const API = 'http://localhost:5000/api';
const SECRET = process.env.JWT_SECRET || 'fallback_secret';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
    if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++; }
    else { console.error(`  ❌ FAIL: ${msg}`); failed++; }
}

function formatPHP(n) {
    return '₱' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function run() {
    console.log('\n─── PERMIT TAX & FEE ASSESSMENT — ACCEPTANCE TESTS ───\n');

    // ─── SETUP ───────────────────────────────────────────────────────────
    const ts = Date.now();
    await db.query("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, 'pw', 'business_owner')", [`OwnerFee ${ts}`, `ownerfee${ts}@test.com`]);
    const [[ou]] = await db.query('SELECT id FROM users WHERE email = ?', [`ownerfee${ts}@test.com`]);
    const ownerId = ou.id;

    await db.query("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, 'pw', 'lgu_admin')", [`AdminFee ${ts}`, `adminfee${ts}@test.com`]);
    const [[au]] = await db.query('SELECT id FROM users WHERE email = ?', [`adminfee${ts}@test.com`]);
    const adminId = au.id;

    await db.query("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, 'pw', 'business_owner')", [`OwnerB ${ts}`, `ownerb${ts}@test.com`]);
    const [[oub]] = await db.query('SELECT id FROM users WHERE email = ?', [`ownerb${ts}@test.com`]);
    const ownerIdB = oub.id;

    const ownerToken = jwt.sign({ id: ownerId, role: 'business_owner' }, SECRET);
    const adminToken = jwt.sign({ id: adminId, role: 'lgu_admin' }, SECRET);
    const ownerBToken = jwt.sign({ id: ownerIdB, role: 'business_owner' }, SECRET);
    const OH = { headers: { Authorization: `Bearer ${ownerToken}` } };
    const AH = { headers: { Authorization: `Bearer ${adminToken}` } };
    const OBH = { headers: { Authorization: `Bearer ${ownerBToken}` } };

    // ─── BUSINESS A: Complete new application (Food & Beverage) ──────────
    // Capitalization=100000, gross_sales=200000, floor_area=50
    await db.query(
        `INSERT INTO businesses (user_id, business_name, business_type, industry_category, address, capitalization, gross_sales, floor_area, business_status)
         VALUES (?, 'Complete Food Biz', 'Food', 'Food & Beverage', '1 Main St', 100000.00, 200000.00, 50.00, 'New Application')`,
        [ownerId]
    );
    const [[bizA]] = await db.query('SELECT id FROM businesses WHERE user_id = ? ORDER BY id DESC LIMIT 1', [ownerId]);
    const bizAId = bizA.id;

    // Create a NEW application
    const r1 = await axios.post(`${API}/applications`, { business_id: bizAId, application_type: 'NEW' }, OH);
    const appAId = r1.data.id;

    // ─── BUSINESS B: Incomplete — capitalization missing (0.00) ──────────
    await db.query(
        `INSERT INTO businesses (user_id, business_name, business_type, industry_category, address, capitalization, gross_sales, floor_area, business_status)
         VALUES (?, 'Incomplete Biz', 'Retail', 'Retail', '2 Side St', 0.00, 0.00, 0.00, 'New Application')`,
        [ownerId]
    );
    const [[bizB]] = await db.query('SELECT id FROM businesses WHERE user_id = ? ORDER BY id DESC LIMIT 1', [ownerId]);
    const bizBId = bizB.id;
    const r2 = await axios.post(`${API}/applications`, { business_id: bizBId, application_type: 'NEW' }, OH);
    const appBId = r2.data.id;

    // ─── BUSINESS C: Renewal — gross_sales = 500000 ───────────────────────
    await db.query(
        `INSERT INTO businesses (user_id, business_name, business_type, industry_category, address, capitalization, gross_sales, floor_area, business_status)
         VALUES (?, 'Renewal Retail Biz', 'Retail', 'Retail', '3 Renewal Ave', 200000.00, 500000.00, 30.00, 'Renewal')`,
        [ownerId]
    );
    const [[bizC]] = await db.query('SELECT id FROM businesses WHERE user_id = ? ORDER BY id DESC LIMIT 1', [ownerId]);
    const bizCId = bizC.id;
    const r3 = await axios.post(`${API}/applications`, { business_id: bizCId, application_type: 'RENEWAL' }, OH);
    const appCId = r3.data.id;

    // ─── BUSINESS D: Owner B — for RBAC test ─────────────────────────────
    await db.query(
        `INSERT INTO businesses (user_id, business_name, business_type, industry_category, address, capitalization, gross_sales, floor_area, business_status)
         VALUES (?, 'Owner B Biz', 'Services', 'Services', '4 Other St', 50000.00, 80000.00, 20.00, 'New Application')`,
        [ownerIdB]
    );
    const [[bizD]] = await db.query('SELECT id FROM businesses WHERE user_id = ? ORDER BY id DESC LIMIT 1', [ownerIdB]);
    const r4 = await axios.post(`${API}/applications`, { business_id: bizD.id, application_type: 'NEW' }, OBH);
    const appDId = r4.data.id;

    // ─────────────────────────────────────────────────────────────────────
    // TEST 1: Complete Food & Beverage NEW application
    console.log('\n[TEST 1] Complete Food & Beverage — New Application');
    const t1 = await axios.get(`${API}/applications/${appAId}/fees`, OH);
    const d1 = t1.data;
    console.log('  Rules applied:', d1.breakdown.map(b => `${b.name}: ${b.status === 'calculated' ? formatPHP(b.amount) : '⚠ ' + b.reason}`).join(' | '));
    assert(!d1.is_incomplete, 'No incomplete flags for complete business');
    assert(d1.total_estimated_amount > 0, 'Total is positive');
    // Expected: Mayor's Permit (500) + Business Tax New (100000 * 0.01 = 1000) + Sanitary (300, Food & Bev) + Garbage (50 * 5 = 250) = 2050
    const expectedT1 = 2050;
    assert(d1.total_estimated_amount === expectedT1, `Total matches expected ${formatPHP(expectedT1)} (got ${formatPHP(d1.total_estimated_amount)})`);
    assert(typeof d1.total_estimated_amount === 'number', 'Total is a number type');
    // Check Sanitary Fee is present (conditional on Food & Beverage)
    const hasSanitary = d1.breakdown.some(b => b.name === 'Sanitary Inspection Fee');
    assert(hasSanitary, 'Sanitary Inspection Fee applies to Food & Beverage');
    // Business Tax New should be present (condition: New Application)
    const hasTaxNew = d1.breakdown.some(b => b.name === 'Business Tax (New)');
    assert(hasTaxNew, 'Business Tax (New) rule applied');
    // Renewal rule should NOT be present
    const hasRenewal = d1.breakdown.some(b => b.name === 'Business Tax (Renewal)');
    assert(!hasRenewal, 'Business Tax (Renewal) NOT applied for new application');

    // TEST 2: Missing financial data
    console.log('\n[TEST 2] Incomplete Business — 0.00 Capitalization, Gross Sales, Floor Area');
    const t2 = await axios.get(`${API}/applications/${appBId}/fees`, OH);
    const d2 = t2.data;
    console.log('  Missing reasons:', d2.missing_info_reasons);
    assert(d2.is_incomplete, 'is_incomplete is true');
    assert(d2.missing_info_reasons.length > 0, 'Missing reasons array is populated');
    // Mayor's Permit (fixed) should still calculate
    const hasFixed = d2.breakdown.some(b => b.name === "Basic Mayor's Permit Fee" && b.status === 'calculated');
    assert(hasFixed, "Fixed Mayor's Permit Fee still calculates even when other data is missing");
    // Business Tax should be incomplete
    const taxIncomplete = d2.breakdown.some(b => b.name === 'Business Tax (New)' && b.status === 'incomplete');
    assert(taxIncomplete, 'Business Tax correctly marked incomplete when capitalization is 0.00');
    // Should not silently treat as ₱0.00 total when missing
    // The total will equal only the fixed-fee items
    console.log(`  Partial total (fixed fees only): ${formatPHP(d2.total_estimated_amount)}`);
    assert(d2.total_estimated_amount === 500, 'Partial total equals only the fixed Mayor permit (₱500)');

    // TEST 3: Renewal application
    console.log('\n[TEST 3] Renewal Application — gross_sales basis');
    const t3 = await axios.get(`${API}/applications/${appCId}/fees`, OH);
    const d3 = t3.data;
    console.log('  Rules applied:', d3.breakdown.map(b => `${b.name}: ${b.status === 'calculated' ? formatPHP(b.amount) : '⚠ ' + b.reason}`).join(' | '));
    // Renewal tax: 500000 * 0.02 = 10000
    const hasTaxRenewal = d3.breakdown.some(b => b.name === 'Business Tax (Renewal)');
    assert(hasTaxRenewal, 'Business Tax (Renewal) rule applied for RENEWAL application');
    const hasNewTax = d3.breakdown.some(b => b.name === 'Business Tax (New)');
    assert(!hasNewTax, 'Business Tax (New) NOT applied for RENEWAL application');
    const renewalTaxItem = d3.breakdown.find(b => b.name === 'Business Tax (Renewal)');
    assert(renewalTaxItem && renewalTaxItem.amount === 10000, `Renewal tax calculated correctly: ${formatPHP(renewalTaxItem?.amount)} (expected ₱10,000.00)`);
    // Sanitary Fee should NOT apply (Retail, not Food & Beverage)
    const hasSanitaryC = d3.breakdown.some(b => b.name === 'Sanitary Inspection Fee');
    assert(!hasSanitaryC, 'Sanitary Inspection Fee NOT applied for non-Food & Beverage');
    assert(!d3.is_incomplete, 'No incomplete flags for renewal with complete data');

    // TEST 4: RBAC — Owner A cannot see Owner B's fees
    console.log('\n[TEST 4] RBAC — Cross-owner access denied');
    try {
        await axios.get(`${API}/applications/${appDId}/fees`, OH);
        assert(false, 'Should have blocked Owner A accessing Owner B fees');
    } catch (err) {
        assert(err.response && err.response.status === 403, 'Owner A denied access to Owner B fees (403)');
    }

    // TEST 5: LGU Admin can view any calculation
    console.log('\n[TEST 5] LGU Admin can view any application fees');
    const t5a = await axios.get(`${API}/applications/${appAId}/fees`, AH);
    assert(t5a.status === 200, 'Admin can access Owner A fees');
    const t5b = await axios.get(`${API}/applications/${appDId}/fees`, AH);
    assert(t5b.status === 200, 'Admin can access Owner B fees');

    // TEST 6: Rounding — verify 2 decimal places
    console.log('\n[TEST 6] Currency rounding');
    const t6 = t1.data;
    assert(Number.isFinite(t6.total_estimated_amount), 'Total is a finite number');
    const decimalPlaces = (t6.total_estimated_amount.toString().split('.')[1] || '').length;
    assert(decimalPlaces <= 2, `Total has at most 2 decimal places (has ${decimalPlaces})`);
    // Check each calculated item
    const badItems = t6.breakdown.filter(b => b.status === 'calculated' && (b.amount.toString().split('.')[1] || '').length > 2);
    assert(badItems.length === 0, 'All individual fee amounts have at most 2 decimal places');

    // TEST 7: Disclaimer present
    console.log('\n[TEST 7] Disclaimer label');
    assert(typeof t1.data.disclaimer === 'string' && t1.data.disclaimer.length > 0, 'Disclaimer string is returned by API');

    // SUMMARY
    console.log(`\n─── RESULTS: ${passed} passed, ${failed} failed ───`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
    console.error('\nTest error:', e.message);
    if (e.response) console.error('Response:', e.response.data);
    process.exit(1);
});
