/**
 * PermitEase — Phase 4A.2.12.2 Test Database Isolation & Matching Checksum Coverage
 * 
 * Verifies:
 * 1. Database connection isolation and strict disposable database assertions.
 * 2. Matching-checksum coverage on existing FAILED migration record:
 *    a. executeMigration: matching checksum is accepted; normal FAILED state guard
 *       blocks ordinary execution and directs to recovery; 0 DDL; 0 checksum mutation.
 *    b. reconcileSchema: matching checksum is accepted; normal recovery proceeds,
 *       applies missing columns, verifies assertions, marks SUCCESS while preserving
 *       original execution_id, error_details, and checksum.
 * 
 * STRICT SAFETY RESTRICTIONS:
 * - Runs exclusively against disposable database smartpermit_test_sandbox_p4a2122
 * - Asserts target DB !== 'smartpermit_db' before any DDL or write
 * - Production database smartpermit_db is never written to.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const {
    isValidSha256,
    assertMigrationChecksum,
    ensureMigrationTable,
    executeMigration
} = require('../migrations/run_migration');

const { reconcileSchema } = require('../migrations/reconcile_schema');
const { diagnoseSchema } = require('../migrations/diagnose_schema');
const migration = require('../migrations/20261110_001_phase4a2');

const DISPOSABLE_DB_PREFIX = 'smartpermit_test_sandbox_';
const SANDBOX_DB = 'smartpermit_test_sandbox_p4a2122';
const RESTORE_TEST_DB = 'smartpermit_restore_test_20261109145038_453';
const AUTHENTIC_VERSION = '20261110_001_phase4a2';

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

async function runIsolationAndFailedChecksumTests() {
    console.log(`\n════════════════════════════════════════════════════════════════════════`);
    console.log(`  PermitEase Phase 4A.2.12.2 — Isolation & Failed-State Checksum Suite`);
    console.log(`════════════════════════════════════════════════════════════════════════\n`);

    // -------------------------------------------------------------------------
    // 1. Mandatory Pre-Flight Target Database Isolation Assertions
    // -------------------------------------------------------------------------
    console.log(`[Isolation Assertion 1] Target database string: "${SANDBOX_DB}"`);
    assert(typeof SANDBOX_DB === 'string', 'Target DB must be a string');
    assert.notStrictEqual(SANDBOX_DB.toLowerCase(), 'smartpermit_db', 'FATAL: Test target cannot be smartpermit_db');
    assert(SANDBOX_DB.startsWith(DISPOSABLE_DB_PREFIX), `FATAL: Target DB must start with "${DISPOSABLE_DB_PREFIX}"`);
    report('Target database name is not smartpermit_db', SANDBOX_DB.toLowerCase() !== 'smartpermit_db');
    report('Target database adheres to disposable naming convention', SANDBOX_DB.startsWith(DISPOSABLE_DB_PREFIX));

    const rootConn = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        multipleStatements: true
    });

    try {
        // Provision disposable sandbox
        await rootConn.query(`DROP DATABASE IF EXISTS \`${SANDBOX_DB}\``);
        await rootConn.query(`CREATE DATABASE \`${SANDBOX_DB}\``);

        // Clone target tables from preserved restore test database
        for (const tbl of ['business_requirements', 'knowledge_base', 'permit_requirements']) {
            await rootConn.query(`CREATE TABLE \`${SANDBOX_DB}\`.\`${tbl}\` LIKE \`${RESTORE_TEST_DB}\`.\`${tbl}\``);
            await rootConn.query(`INSERT INTO \`${SANDBOX_DB}\`.\`${tbl}\` SELECT * FROM \`${RESTORE_TEST_DB}\`.\`${tbl}\``);
        }

        const sandboxPool = mysql.createPool({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: SANDBOX_DB
        });

        // Verify connected database identity via SQL SELECT DATABASE()
        const [[resolvedDbRow]] = await sandboxPool.query('SELECT DATABASE() AS current_db');
        const resolvedDb = resolvedDbRow.current_db;
        console.log(`[Isolation Assertion 2] Connected database: "${resolvedDb}"`);
        assert.strictEqual(resolvedDb, SANDBOX_DB, 'Resolved database must strictly match target sandbox');
        assert.notStrictEqual(resolvedDb.toLowerCase(), 'smartpermit_db', 'FATAL: Connected database cannot be production');
        assert(resolvedDb.startsWith(DISPOSABLE_DB_PREFIX), 'FATAL: Connected database must match disposable naming prefix');
        report('SQL SELECT DATABASE() matches disposable sandbox', resolvedDb === SANDBOX_DB);
        report('SQL SELECT DATABASE() is confirmed not smartpermit_db', resolvedDb.toLowerCase() !== 'smartpermit_db');

        // Verify authentic migration file checksum
        const scriptPath = path.join(__dirname, `../migrations/${AUTHENTIC_VERSION}.js`);
        const realScriptContent = fs.readFileSync(scriptPath);
        const authenticChecksum = crypto.createHash('sha256').update(realScriptContent).digest('hex');
        console.log(`Authentic script checksum: ${authenticChecksum}`);
        assert(isValidSha256(authenticChecksum), 'Authentic checksum must be valid 64-hex SHA-256');

        await ensureMigrationTable(sandboxPool);

        // ---------------------------------------------------------------------
        // 2. Matching-Checksum FAILED-State Test: Ordinary Runner Abort
        // ---------------------------------------------------------------------
        console.log(`\n--- [Part A: Existing FAILED Record with Matching Checksum in Runner] ---`);
        const initialExecId = 'exec-failed-match-uuid-101';
        const initialFailureError = 'Deadlock found when trying to get lock; try restarting transaction';

        await sandboxPool.query(
            `INSERT INTO schema_migrations (version, status, checksum, execution_id, operator_id, error_details, started_at, finished_at)
             VALUES (?, 'FAILED', ?, ?, 'initial_operator', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [AUTHENTIC_VERSION, authenticChecksum, initialExecId, initialFailureError]
        );

        // Spy on migration.up to prove ordinary runner never invokes DDL
        let upInvoked = false;
        const originalUp = migration.up;
        migration.up = async (conn) => {
            upInvoked = true;
            return originalUp(conn);
        };

        let runnerError = null;
        try {
            await executeMigration({
                targetVersion: AUTHENTIC_VERSION,
                operatorId: 'secondary_operator',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            runnerError = err;
        }

        report('Matching checksum was accepted (no FATAL CHECKSUM error thrown)', runnerError !== null && !runnerError.message.includes('CHECKSUM'));
        report('Normal FAILED state guard triggered', runnerError !== null && runnerError.message.includes('currently in FAILED state'));
        report('Runner suggested reconciliation tool', runnerError !== null && runnerError.message.includes('reconcile_schema.js --resume'));
        report('migration.up() was NOT invoked (zero DDL executed)', upInvoked === false);

        // Verify tracking record was NOT mutated
        const [rowsAfterRunner] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('Status remained FAILED (no mutation)', rowsAfterRunner[0].status === 'FAILED');
        report('Checksum remained authenticChecksum (no mutation)', rowsAfterRunner[0].checksum === authenticChecksum);
        report('Original execution_id preserved', rowsAfterRunner[0].execution_id === initialExecId);
        report('Original operator_id preserved', rowsAfterRunner[0].operator_id === 'initial_operator');
        report('Original error_details preserved', rowsAfterRunner[0].error_details === initialFailureError);

        // Verify zero target columns exist prior to recovery
        const preCheck = await migration.verifyPreSchema(sandboxPool);
        report('Zero target columns added by runner abort (19 missing)', preCheck.missing.length === 19 && preCheck.existing.length === 0);

        // ---------------------------------------------------------------------
        // 3. Matching-Checksum FAILED-State Test: Reconciliation Recovery Path
        // ---------------------------------------------------------------------
        console.log(`\n--- [Part B: Existing FAILED Record with Matching Checksum in Recovery] ---`);

        const recoveryResult = await reconcileSchema({
            version: AUTHENTIC_VERSION,
            action: 'resume',
            operatorId: 'recovery_expert',
            testMode: true,
            customDb: sandboxPool
        });

        report('reconcileSchema --resume completed successfully', recoveryResult.status === 'SUCCESS');
        report('Mandatory integrity assertions passed during recovery', recoveryResult.assertions === 3);

        const [rowsAfterRecovery] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('Status updated to SUCCESS after successful recovery', rowsAfterRecovery[0].status === 'SUCCESS');
        report('recovery_action recorded as RESUME', rowsAfterRecovery[0].recovery_action === 'RESUME');
        report('operator_id updated to recovery_expert', rowsAfterRecovery[0].operator_id === 'recovery_expert');
        report('Original execution_id preserved after recovery', rowsAfterRecovery[0].execution_id === initialExecId);
        report('Original error_details preserved after recovery', rowsAfterRecovery[0].error_details === initialFailureError);
        report('Original checksum preserved after recovery', rowsAfterRecovery[0].checksum === authenticChecksum);

        // Verify all 19 columns now exist and match specifications
        const postCheck = await migration.verifyPreSchema(sandboxPool);
        report('All 19 target columns exist and are compliant after recovery', postCheck.compliant === true && postCheck.existing.length === 19 && postCheck.missing.length === 0);

        // Restore original migration.up
        migration.up = originalUp;

        // Cleanup disposable resources
        await sandboxPool.end();
        await rootConn.query(`DROP DATABASE IF EXISTS \`${SANDBOX_DB}\``);
        await rootConn.end();

        // Drain default pool if opened by module require
        const defaultDb = require('../config/db');
        if (defaultDb && typeof defaultDb.end === 'function') {
            await defaultDb.end().catch(() => {});
        }

        console.log(`\n════════════════════════════════════════════════════════════════════════`);
        console.log(`  Phase 4A.2.12.2 Test Summary: ${passed} passed, ${failed} failed`);
        console.log(`════════════════════════════════════════════════════════════════════════\n`);

        if (failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }

    } catch (err) {
        console.error('\n[FATAL TEST RUNNER ERROR]', err);
        try {
            await rootConn.query(`DROP DATABASE IF EXISTS \`${SANDBOX_DB}\``);
            await rootConn.end();
        } catch (e) {}
        process.exit(1);
    }
}

runIsolationAndFailedChecksumTests();
