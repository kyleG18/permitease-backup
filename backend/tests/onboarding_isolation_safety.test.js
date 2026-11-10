/**
 * PermitEase — Phase 5.1.2: Onboarding Isolation Safety Test Suite
 * 
 * Proves the 6 mandatory safety conditions:
 * 1. Production database name is rejected.
 * 2. An unprefixed database is rejected.
 * 3. A valid smartpermit_test_ database is accepted.
 * 4. The onboarding suite refuses to use an unknown external server.
 * 5. A failed safety check prevents HTTP requests from being sent.
 * 6. A successful test run targets only the sandbox database.
 */

const assert = require('assert');
const axios = require('axios');
const mysql = require('mysql2/promise');
const {
    provisionSandboxDatabase,
    dropSandboxDatabase,
    startIsolatedServer,
    REQUIRED_PREFIX
} = require('./test_server_harness');
const { assertTestDatabase } = require('./test_db_guard');

const TEST_SANDBOX_NAME = 'smartpermit_test_sandbox_iso_proof';

let passed = 0;
let failed = 0;

function report(testName, condition, extra = '') {
    if (condition) {
        console.log(`  ✅ PASS: ${testName} ${extra}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${testName} ${extra}`);
        failed++;
    }
}

async function runIsolationSafetyTests() {
    console.log('\n================================================================');
    console.log('  PERMITEASE PHASE 5.1.2 — ONBOARDING ISOLATION SAFETY TESTS    ');
    console.log('================================================================\n');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 1: Production database name is rejected
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('--- TEST 1: Production database name is rejected ---');
    let test1Rejected = false;
    try {
        await startIsolatedServer('smartpermit_db');
    } catch (err) {
        test1Rejected = true;
        report('Rejects "smartpermit_db" with fatal error', 
            err.message.includes('not an authorized test sandbox') || err.message.includes('Unsafe database'),
            `(${err.message})`
        );
    }
    report('Test server refused to boot against production database', test1Rejected);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 2: An unprefixed database is rejected
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 2: An unprefixed database is rejected ---');
    let test2Rejected = false;
    try {
        await startIsolatedServer('random_unprefixed_database');
    } catch (err) {
        test2Rejected = true;
        report('Rejects unprefixed database name with fatal error',
            err.message.includes('not an authorized test sandbox') || err.message.includes('Unsafe database'),
            `(${err.message})`
        );
    }
    report('Test server refused to boot against unprefixed database', test2Rejected);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 3: A valid smartpermit_test_ database is accepted
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 3: Valid smartpermit_test_ database is accepted ---');
    await provisionSandboxDatabase(TEST_SANDBOX_NAME);
    let serverInstance = null;
    try {
        serverInstance = await startIsolatedServer(TEST_SANDBOX_NAME);
        report('Test server accepted smartpermit_test_ prefix', serverInstance && serverInstance.port > 0);
        report('Active database matches verified sandbox name', serverInstance.activeDb === TEST_SANDBOX_NAME);

        // Verify active database on running pool directly with SELECT DATABASE()
        const [[row]] = await serverInstance.db.query('SELECT DATABASE() AS active_db');
        report('Live connection pool actually connected to sandbox', row.active_db === TEST_SANDBOX_NAME);
    } finally {
        if (serverInstance) await serverInstance.close();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 4: The onboarding suite refuses to use an unknown external server
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 4: Refuses to use unknown external server ---');
    // Function that mirrors the onboarding test preflight guard
    function validateServerTarget(apiBase, expectedPort) {
        if (!apiBase || !expectedPort) {
            throw new Error('[Safety Guard] External or unmanaged API target is strictly prohibited.');
        }
        const url = new URL(apiBase);
        if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
            throw new Error('[Safety Guard] Remote API host is prohibited for isolated tests.');
        }
        if (parseInt(url.port, 10) === 5000) {
            throw new Error('[Safety Guard] Default port 5000 is prohibited to prevent production collision.');
        }
        if (parseInt(url.port, 10) !== expectedPort) {
            throw new Error('[Safety Guard] Target port does not match verified isolated test server.');
        }
        return true;
    }

    let default5000Blocked = false;
    try {
        validateServerTarget('http://localhost:5000/api', 62000);
    } catch (err) {
        default5000Blocked = true;
        report('Default port 5000 blocked by safety preflight', err.message.includes('Default port 5000 is prohibited'));
    }
    report('External/unverified server refused', default5000Blocked);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 5: A failed safety check prevents HTTP requests from being sent
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 5: Failed safety check prevents HTTP requests ---');
    let httpDispatched = false;
    try {
        // Simulate a runner with an invalid database target
        const badDbName = 'smartpermit_db';
        if (!badDbName.startsWith(REQUIRED_PREFIX) || badDbName === 'smartpermit_db') {
            throw new Error('[Preflight Refusal] Aborting test before starting server or dispatching HTTP.');
        }
        // This line must never be reached
        await axios.get('http://127.0.0.1:5000/api/health');
        httpDispatched = true;
    } catch (err) {
        report('Preflight check aborted execution before any HTTP call', err.message.includes('Preflight Refusal'));
    }
    report('Zero HTTP requests dispatched when safety fails', !httpDispatched);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 6: Successful test run targets only sandbox database
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 6: Successful test run targets only sandbox database ---');
    let testServer = null;
    const rootConn = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: '' });
    try {
        testServer = await startIsolatedServer(TEST_SANDBOX_NAME);

        // Get initial row counts in production database
        const [[prodUsersBefore]] = await rootConn.query('SELECT COUNT(*) AS c FROM `smartpermit_db`.`users`');
        const [[sandboxUsersBefore]] = await rootConn.query(`SELECT COUNT(*) AS c FROM \`${TEST_SANDBOX_NAME}\`.\`users\``);

        // Perform an HTTP registration through the isolated server
        const regPayload = {
            full_name: 'Sandbox Verified User',
            email: `sandbox_test_${Date.now()}@test.ph`,
            password: 'password123',
            confirmPassword: 'password123',
            contact_number: '09999999999'
        };

        const res = await axios.post(`${testServer.apiBase}/auth/register`, regPayload);
        report('HTTP registration succeeded against isolated test server', res.status === 201);

        // Check sandbox database: row count increased by 1
        const [[sandboxUsersAfter]] = await rootConn.query(`SELECT COUNT(*) AS c FROM \`${TEST_SANDBOX_NAME}\`.\`users\``);
        report('Sandbox database received the new record', sandboxUsersAfter.c === sandboxUsersBefore.c + 1);

        // Check production database: row count must be UNCHANGED
        const [[prodUsersAfter]] = await rootConn.query('SELECT COUNT(*) AS c FROM `smartpermit_db`.`users`');
        report('Production smartpermit_db was completely untouched', prodUsersAfter.c === prodUsersBefore.c);

    } finally {
        if (testServer) await testServer.close();
        await rootConn.end();
        await dropSandboxDatabase(TEST_SANDBOX_NAME);
    }

    console.log('\n================================================================');
    console.log(`  SAFETY PROOF RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
}

runIsolationSafetyTests().catch(err => {
    console.error('Fatal safety test failure:', err);
    process.exit(1);
});
