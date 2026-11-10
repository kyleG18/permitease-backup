/**
 * PermitEase — Phase 5.1.2: Requirement Reset HTTP Integration Test Suite
 * 
 * Verifies the full HTTP request path for requirement reset:
 * Endpoint: PUT /api/compliance/requirements/:businessId/:requirementId/reset
 * 
 * Cases tested:
 * - Case A: Valid owner (authenticates, authorizes, mutates status to 'Missing')
 * - Case B: Missing authentication (rejects 401, zero mutation)
 * - Case C: Invalid or unrelated user (rejects 403, zero mutation)
 * - Case D: Invalid IDs (nonexistent business/requirement returns 404, zero unrelated mutation)
 * - Case E: Audit-field preservation (bplo_status, bplo_notes, bplo_verified_at, bplo_verified_by preserved)
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const {
    provisionSandboxDatabase,
    dropSandboxDatabase,
    startIsolatedServer
} = require('./test_server_harness');

const SANDBOX_DB_NAME = 'smartpermit_test_sandbox_req_reset';

let passed = 0;
let failed = 0;

function report(name, condition, extra = '') {
    if (condition) {
        console.log(`  ✅ PASS: ${name} ${extra}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${name} ${extra}`);
        failed++;
    }
}

async function runRequirementResetHttpTests() {
    console.log('\n================================================================');
    console.log('  PHASE 5.1.2: REQUIREMENT RESET HTTP INTEGRATION TESTS        ');
    console.log('================================================================\n');

    let serverInstance = null;
    let pool = null;

    try {
        // ── 1. Setup Sandbox & Isolated Server ───────────────────────────────────
        console.log('[Setup] Provisioning sandbox database...');
        await provisionSandboxDatabase(SANDBOX_DB_NAME);

        console.log('[Setup] Starting isolated test server...');
        serverInstance = await startIsolatedServer(SANDBOX_DB_NAME);

        const API = serverInstance.apiBase;
        console.log(`[Setup] Isolated server running at ${API} (DB: ${serverInstance.activeDb})\n`);

        pool = serverInstance.db;

        // ── 2. Seed Test Fixtures ────────────────────────────────────────────────
        // Create 2 business owners
        await pool.query(`
            INSERT INTO users (id, full_name, email, password, role, status)
            VALUES 
                (1001, 'Owner Alpha', 'owner_alpha@test.ph', 'hashedpw', 'business_owner', 'active'),
                (1002, 'Owner Beta', 'owner_beta@test.ph', 'hashedpw', 'business_owner', 'active')
            ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role = VALUES(role), status = VALUES(status)
        `);

        // Create 2 businesses (one owned by Alpha, one by Beta)
        await pool.query(`
            INSERT INTO businesses (id, user_id, business_name, business_type, industry_category, address, business_status)
            VALUES 
                (2001, 1001, 'Alpha Bakery', 'Food', 'Bakery', '100 Main St, Roxas', 'New Application'),
                (2002, 1002, 'Beta Retail', 'Retail', 'Sari-Sari Store', '200 Market St, Roxas', 'New Application')
            ON DUPLICATE KEY UPDATE business_name = VALUES(business_name), user_id = VALUES(user_id)
        `);

        // Ensure requirement exists in permit_requirements
        const [reqCheck] = await pool.query('SELECT id FROM permit_requirements WHERE id = 1');
        if (reqCheck.length === 0) {
            await pool.query(`
                INSERT INTO permit_requirements (id, permit_name, applicable_business_type, renewal_period)
                VALUES (1, 'Barangay Business Clearance', 'All', 'Annual')
            `);
        }

        // Seed requirement for Alpha (2001) in business_requirements with Submitted status and BPLO audit fields
        await pool.query(`
            INSERT INTO business_requirements (
                business_id, requirement_id, status, bplo_status, bplo_notes, bplo_verified_at, bplo_verified_by
            ) VALUES (
                2001, 1, 'Submitted', 'BPLO Verified', 'Pre-verified by officer Cruz', '2026-11-01 10:00:00', 2
            ) ON DUPLICATE KEY UPDATE 
                status = 'Submitted', 
                bplo_status = 'BPLO Verified', 
                bplo_notes = 'Pre-verified by officer Cruz',
                bplo_verified_at = '2026-11-01 10:00:00',
                bplo_verified_by = 2
        `);

        // Generate valid JWT tokens
        const jwtSecret = process.env.JWT_SECRET || 'test_jwt_secret_permitease_isolated_server';
        const tokenOwnerAlpha = jwt.sign({ id: 1001, role: 'business_owner' }, jwtSecret, { expiresIn: '1h' });
        const tokenOwnerBeta = jwt.sign({ id: 1002, role: 'business_owner' }, jwtSecret, { expiresIn: '1h' });

        const authAlphaH = { headers: { Authorization: `Bearer ${tokenOwnerAlpha}` } };
        const authBetaH = { headers: { Authorization: `Bearer ${tokenOwnerBeta}` } };

        // ─────────────────────────────────────────────────────────────────────────
        // CASE A: Valid Owner Reset Request
        // ─────────────────────────────────────────────────────────────────────────
        console.log('--- CASE A: Valid Owner Reset Request ---');
        try {
            const res = await axios.put(`${API}/compliance/requirements/2001/1/reset`, {}, authAlphaH);
            report('HTTP status is 200 OK', res.status === 200);
            report('Response message indicates success', res.data && res.data.message.includes('success'));
            report('Response status indicates "Missing"', res.data.status === 'Missing');

            // Assert database mutation
            const [[row]] = await pool.query('SELECT status FROM business_requirements WHERE business_id = 2001 AND requirement_id = 1');
            report('Database status mutated to "Missing"', row.status === 'Missing');
        } catch (err) {
            report('Case A failed unexpectedly', false, err.response?.data?.message || err.message);
        }

        // Also test PermitReadiness.jsx format: PUT /compliance/business/2001/requirement/1 with { status: 'Missing' }
        try {
            await pool.query("UPDATE business_requirements SET status = 'Submitted' WHERE business_id = 2001 AND requirement_id = 1");
            const resDirect = await axios.put(
                `${API}/compliance/business/2001/requirement/1`,
                { status: 'Missing' },
                authAlphaH
            );
            report('Direct UI route (/compliance/business/:id/requirement/:id) returns 200', resDirect.status === 200);
            const [[rowDirect]] = await pool.query('SELECT status FROM business_requirements WHERE business_id = 2001 AND requirement_id = 1');
            report('Direct UI route updates database to "Missing"', rowDirect.status === 'Missing');
        } catch (err) {
            report('Direct UI route test failed', false, err.response?.data?.message || err.message);
        }

        // ─────────────────────────────────────────────────────────────────────────
        // CASE B: Missing Authentication
        // ─────────────────────────────────────────────────────────────────────────
        console.log('\n--- CASE B: Missing Authentication ---');
        // Reset row to Submitted in DB
        await pool.query("UPDATE business_requirements SET status = 'Submitted' WHERE business_id = 2001 AND requirement_id = 1");

        try {
            await axios.put(`${API}/compliance/requirements/2001/1/reset`, {});
            report('Unauthenticated request must not succeed', false);
        } catch (err) {
            report('HTTP status is 401 Unauthorized', err.response?.status === 401);
            report('Response message indicates no token provided', err.response?.data?.message.includes('no token') || err.response?.data?.message.includes('Not authorized'));
            
            // Verify database row remains unchanged
            const [[row]] = await pool.query('SELECT status FROM business_requirements WHERE business_id = 2001 AND requirement_id = 1');
            report('Database row remained unchanged ("Submitted")', row.status === 'Submitted');
        }

        // ─────────────────────────────────────────────────────────────────────────
        // CASE C: Invalid or Unrelated User (Ownership Authorization Check)
        // ─────────────────────────────────────────────────────────────────────────
        console.log('\n--- CASE C: Invalid or Unrelated User ---');
        try {
            // Owner Beta attempts to reset Owner Alpha's business (2001)
            await axios.put(`${API}/compliance/requirements/2001/1/reset`, {}, authBetaH);
            report('Unrelated user must not succeed', false);
        } catch (err) {
            report('HTTP status is 403 Forbidden', err.response?.status === 403);
            report('Response message indicates not authorized', err.response?.data?.message.includes('Not authorized'));

            // Verify database row was NOT mutated
            const [[row]] = await pool.query('SELECT status FROM business_requirements WHERE business_id = 2001 AND requirement_id = 1');
            report('Database row remained intact ("Submitted")', row.status === 'Submitted');
        }

        // ─────────────────────────────────────────────────────────────────────────
        // CASE D: Invalid IDs (Nonexistent Business and Nonexistent Requirement)
        // ─────────────────────────────────────────────────────────────────────────
        console.log('\n--- CASE D: Invalid IDs ---');
        // Sub-case 1: Nonexistent business
        try {
            await axios.put(`${API}/compliance/requirements/99999/1/reset`, {}, authAlphaH);
            report('Nonexistent business must not succeed', false);
        } catch (err) {
            report('Nonexistent business returns 404 Not Found', err.response?.status === 404);
            report('Response indicates business not found', err.response?.data?.message.includes('Business not found'));
        }

        // Sub-case 2: Nonexistent requirement for valid business
        try {
            await axios.put(`${API}/compliance/requirements/2001/99999/reset`, {}, authAlphaH);
            report('Nonexistent requirement must not succeed', false);
        } catch (err) {
            report('Nonexistent requirement returns 404 Not Found', err.response?.status === 404);
            report('Response indicates requirement not found', err.response?.data?.message.includes('Requirement not found'));
        }

        // Verify valid row was not altered by failed calls
        const [[rowCaseD]] = await pool.query('SELECT status FROM business_requirements WHERE business_id = 2001 AND requirement_id = 1');
        report('Valid requirement row remained untouched ("Submitted")', rowCaseD.status === 'Submitted');

        // ─────────────────────────────────────────────────────────────────────────
        // CASE E: Audit-Field Preservation
        // ─────────────────────────────────────────────────────────────────────────
        console.log('\n--- CASE E: Audit-Field Preservation ---');
        try {
            // Verify initial audit fields
            const [[beforeRow]] = await pool.query(`
                SELECT status, bplo_status, bplo_notes, bplo_verified_at, bplo_verified_by 
                FROM business_requirements 
                WHERE business_id = 2001 AND requirement_id = 1
            `);
            report('Pre-reset status is "Submitted"', beforeRow.status === 'Submitted');
            report('Pre-reset bplo_status is "BPLO Verified"', beforeRow.bplo_status === 'BPLO Verified');
            report('Pre-reset bplo_notes present', beforeRow.bplo_notes === 'Pre-verified by officer Cruz');
            report('Pre-reset bplo_verified_by is 2', beforeRow.bplo_verified_by === 2);
            report('Pre-reset bplo_verified_at is set', beforeRow.bplo_verified_at != null);

            // Execute reset as valid owner
            const resReset = await axios.put(`${API}/compliance/requirements/2001/1/reset`, {}, authAlphaH);
            report('Reset request returned 200 OK', resReset.status === 200);

            // Fetch row after reset and verify ONLY status was changed
            const [[afterRow]] = await pool.query(`
                SELECT status, bplo_status, bplo_notes, bplo_verified_at, bplo_verified_by 
                FROM business_requirements 
                WHERE business_id = 2001 AND requirement_id = 1
            `);

            report('Status was successfully mutated to "Missing"', afterRow.status === 'Missing');
            report('Audit field "bplo_status" preserved intact', afterRow.bplo_status === beforeRow.bplo_status);
            report('Audit field "bplo_notes" preserved intact', afterRow.bplo_notes === beforeRow.bplo_notes);
            report('Audit field "bplo_verified_by" preserved intact', afterRow.bplo_verified_by === beforeRow.bplo_verified_by);
            
            const beforeDateStr = new Date(beforeRow.bplo_verified_at).toISOString();
            const afterDateStr = new Date(afterRow.bplo_verified_at).toISOString();
            report('Audit timestamp "bplo_verified_at" preserved intact', beforeDateStr === afterDateStr);

        } catch (err) {
            report('Case E failed unexpectedly', false, err.response?.data?.message || err.message);
        }

        // ─────────────────────────────────────────────────────────────────────────
        // SUMMARY
        // ─────────────────────────────────────────────────────────────────────────
        console.log('\n================================================================');
        console.log(`  REQUIREMENT RESET HTTP RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log('================================================================\n');

        if (failed > 0) process.exit(1);

    } finally {
        if (serverInstance) {
            console.log('[Teardown] Gracefully shutting down isolated test server...');
            await serverInstance.close();
        }
        try {
            console.log('[Teardown] Dropping disposable test sandbox database...');
            await dropSandboxDatabase(SANDBOX_DB_NAME);
            console.log('[Teardown] Teardown complete.\n');
        } catch (err) {
            console.warn('[Teardown Warning] Failed to drop sandbox:', err.message);
        }
    }
}

runRequirementResetHttpTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
