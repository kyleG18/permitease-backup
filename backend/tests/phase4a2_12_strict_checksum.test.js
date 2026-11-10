/**
 * PermitEase — Phase 4A.2.12.1 Strict Checksum Validation Test Suite
 * 
 * Verifies all 10 mandated test cases:
 * 1. NULL stored checksum is rejected.
 * 2. Empty stored checksum is rejected.
 * 3. Malformed stored checksum is rejected.
 * 4. Valid but mismatched checksum is rejected.
 * 5. Valid matching checksum is accepted.
 * 6. Missing migration file fails closed.
 * 7. Unreadable migration file fails closed.
 * 8. First-time migration computes and records actual disk checksum.
 * 9. --resume with missing checksum is rejected.
 * 10. --mark-success with missing checksum is rejected.
 * 
 * STRICT ISOLATION: Runs exclusively against disposable database smartpermit_test_sandbox_p4a2121
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

const SANDBOX_DB = 'smartpermit_test_sandbox_p4a2121';
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

async function runStrictChecksumTests() {
    console.log(`\n════════════════════════════════════════════════════════════════════════`);
    console.log(`  PermitEase Phase 4A.2.12.1 — Strict Checksum Validation Test Suite`);
    console.log(`════════════════════════════════════════════════════════════════════════\n`);

    const rootConn = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        multipleStatements: true
    });

    try {
        await rootConn.query(`DROP DATABASE IF EXISTS \`${SANDBOX_DB}\``);
        await rootConn.query(`CREATE DATABASE \`${SANDBOX_DB}\``);

        // Clone target tables
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

        const scriptPath = path.join(__dirname, `../migrations/${AUTHENTIC_VERSION}.js`);
        const realScriptContent = fs.readFileSync(scriptPath);
        const authenticChecksum = crypto.createHash('sha256').update(realScriptContent).digest('hex');
        console.log(`Authentic script checksum: ${authenticChecksum}`);
        assert(isValidSha256(authenticChecksum), 'Authentic checksum must be valid 64-hex SHA-256');

        await ensureMigrationTable(sandboxPool);
        // Temporarily permit NULL in checksum column for test harness
        await sandboxPool.query("ALTER TABLE schema_migrations MODIFY COLUMN checksum CHAR(64) NULL");

        // Helper to spy on migration.up
        let upInvoked = false;
        const originalUp = migration.up;
        migration.up = async (conn) => {
            upInvoked = true;
            return originalUp(conn);
        };

        // ---------------------------------------------------------------------
        // Test 1: NULL stored checksum is rejected
        // ---------------------------------------------------------------------
        console.log(`\n[Test 1] NULL stored checksum is rejected`);
        upInvoked = false;
        await sandboxPool.query(
            `INSERT INTO schema_migrations (version, status, checksum, execution_id, operator_id, error_details, started_at, finished_at)
             VALUES (?, 'FAILED', NULL, 'exec-uuid-null-1', 'op_admin', 'Initial lock failure', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [AUTHENTIC_VERSION]
        );

        let nullError = null;
        try {
            await executeMigration({
                targetVersion: AUTHENTIC_VERSION,
                operatorId: 'op_test',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            nullError = err;
        }

        report('NULL stored checksum throws FATAL CHECKSUM ERROR', nullError !== null && nullError.message.includes('NULL or missing checksum in the database'));
        report('NULL rejection prevented migration.up()', upInvoked === false);

        const [rowsAfterNull] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('Existing record checksum remained NULL (no silent repair)', rowsAfterNull[0].checksum === null);
        report('Existing record status remained FAILED (no mutation)', rowsAfterNull[0].status === 'FAILED');
        report('Existing record error_details preserved', rowsAfterNull[0].error_details === 'Initial lock failure');

        // ---------------------------------------------------------------------
        // Test 2: Empty stored checksum is rejected
        // ---------------------------------------------------------------------
        console.log(`\n[Test 2] Empty stored checksum is rejected`);
        upInvoked = false;
        await sandboxPool.query(
            `UPDATE schema_migrations SET checksum = '', status = 'FAILED' WHERE version = ?`,
            [AUTHENTIC_VERSION]
        );

        let emptyError = null;
        try {
            await executeMigration({
                targetVersion: AUTHENTIC_VERSION,
                operatorId: 'op_test',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            emptyError = err;
        }

        report('Empty stored checksum throws FATAL CHECKSUM ERROR', emptyError !== null && emptyError.message.includes('empty checksum in the database'));
        report('Empty rejection prevented migration.up()', upInvoked === false);

        const [rowsAfterEmpty] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('Existing record checksum remained empty string', rowsAfterEmpty[0].checksum === '');
        report('Existing record status remained FAILED', rowsAfterEmpty[0].status === 'FAILED');

        // ---------------------------------------------------------------------
        // Test 3: Malformed stored checksum is rejected
        // ---------------------------------------------------------------------
        console.log(`\n[Test 3] Malformed stored checksum is rejected`);
        upInvoked = false;
        const malformedHash = 'not-a-valid-sha256-hash-too-short';
        await sandboxPool.query(
            `UPDATE schema_migrations SET checksum = ?, status = 'FAILED' WHERE version = ?`,
            [malformedHash, AUTHENTIC_VERSION]
        );

        let malformedError = null;
        try {
            await executeMigration({
                targetVersion: AUTHENTIC_VERSION,
                operatorId: 'op_test',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            malformedError = err;
        }

        report('Malformed stored checksum throws FATAL CHECKSUM ERROR', malformedError !== null && malformedError.message.includes('malformed checksum in the database'));
        report('Malformed rejection specifies 64 hexadecimal characters requirement', malformedError !== null && malformedError.message.includes('Expected exactly 64 hexadecimal characters'));
        report('Malformed rejection prevented migration.up()', upInvoked === false);

        const [rowsAfterMalformed] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('Existing record checksum remained malformed (no silent fix)', rowsAfterMalformed[0].checksum === malformedHash);

        // ---------------------------------------------------------------------
        // Test 4: Valid but mismatched checksum is rejected
        // ---------------------------------------------------------------------
        console.log(`\n[Test 4] Valid but mismatched checksum is rejected`);
        upInvoked = false;
        const mismatchedHash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
        await sandboxPool.query(
            `UPDATE schema_migrations SET checksum = ?, status = 'FAILED' WHERE version = ?`,
            [mismatchedHash, AUTHENTIC_VERSION]
        );

        let mismatchError = null;
        try {
            await executeMigration({
                targetVersion: AUTHENTIC_VERSION,
                operatorId: 'op_test',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            mismatchError = err;
        }

        report('Mismatched checksum throws FATAL CHECKSUM MISMATCH', mismatchError !== null && mismatchError.message.includes('[FATAL CHECKSUM MISMATCH]'));
        report('Error clearly reports disk checksum and stored checksum', mismatchError !== null && mismatchError.message.includes(authenticChecksum) && mismatchError.message.includes(mismatchedHash));
        report('Mismatch rejection prevented migration.up()', upInvoked === false);

        // ---------------------------------------------------------------------
        // Test 5: Valid matching checksum is accepted
        // ---------------------------------------------------------------------
        console.log(`\n[Test 5] Valid matching checksum is accepted`);
        await sandboxPool.query(
            `UPDATE schema_migrations SET checksum = ?, status = 'SUCCESS' WHERE version = ?`,
            [authenticChecksum, AUTHENTIC_VERSION]
        );

        const matchResult = await executeMigration({
            targetVersion: AUTHENTIC_VERSION,
            operatorId: 'op_test',
            testMode: true,
            customDb: sandboxPool
        });
        report('Matching checksum accepted; exits cleanly per migration state guard', matchResult.status === 'ALREADY_COMPLETED');

        // ---------------------------------------------------------------------
        // Test 6: Missing migration file fails closed
        // ---------------------------------------------------------------------
        console.log(`\n[Test 6] Missing migration file fails closed`);
        let missingError = null;
        try {
            await executeMigration({
                targetVersion: 'nonexistent_file_v999',
                operatorId: 'op_test',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            missingError = err;
        }
        report('Missing migration file throws descriptive error before DDL', missingError !== null && missingError.message.includes('not found at'));

        // ---------------------------------------------------------------------
        // Test 7: Unreadable migration file fails closed
        // ---------------------------------------------------------------------
        console.log(`\n[Test 7] Unreadable migration file fails closed`);
        const tempUnreadablePath = path.join(__dirname, '../migrations/temp_unreadable_v998.js');
        fs.writeFileSync(tempUnreadablePath, 'module.exports = {};', 'utf8');

        const origReadFileSync = fs.readFileSync;
        fs.readFileSync = function (p, options) {
            if (typeof p === 'string' && p.includes('temp_unreadable_v998')) {
                throw new Error('EACCES: permission denied');
            }
            return origReadFileSync.apply(this, arguments);
        };

        let unreadableError = null;
        try {
            await executeMigration({
                targetVersion: 'temp_unreadable_v998',
                operatorId: 'op_test',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            unreadableError = err;
        }
        fs.readFileSync = origReadFileSync;
        if (fs.existsSync(tempUnreadablePath)) fs.unlinkSync(tempUnreadablePath);

        report('Unreadable migration file throws descriptive error', unreadableError !== null && unreadableError.message.includes('is unreadable: EACCES'));

        // ---------------------------------------------------------------------
        // Test 8: First-time migration computes and records actual disk checksum
        // ---------------------------------------------------------------------
        console.log(`\n[Test 8] First-time migration records actual disk checksum`);
        await sandboxPool.query('DELETE FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);

        const firstTimeResult = await executeMigration({
            targetVersion: AUTHENTIC_VERSION,
            operatorId: 'first_run_op',
            testMode: true,
            customDb: sandboxPool
        });

        report('First-time migration executed successfully', firstTimeResult.status === 'SUCCESS');
        const [firstRow] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('First-time migration recorded checksum is exactly 64-hex SHA-256', isValidSha256(firstRow[0].checksum));
        report('First-time migration recorded checksum matches authentic disk checksum', firstRow[0].checksum === authenticChecksum);

        // ---------------------------------------------------------------------
        // Test 9: --resume with missing checksum is rejected
        // ---------------------------------------------------------------------
        console.log(`\n[Test 9] --resume with missing/NULL checksum is rejected`);
        upInvoked = false;
        await sandboxPool.query(
            `UPDATE schema_migrations 
             SET status = 'FAILED', checksum = NULL, error_details = 'Original failure text preserved' 
             WHERE version = ?`,
            [AUTHENTIC_VERSION]
        );

        let resumeNullError = null;
        try {
            await reconcileSchema({
                version: AUTHENTIC_VERSION,
                action: 'resume',
                operatorId: 'rec_op',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            resumeNullError = err;
        }

        report('reconcileSchema --resume rejects NULL checksum with FATAL CHECKSUM ERROR', resumeNullError !== null && resumeNullError.message.includes('NULL or missing checksum in the database'));
        report('--resume rejection prevented migration.up()', upInvoked === false);

        const [rowAfterResumeReject] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('Status remains FAILED after --resume rejection', rowAfterResumeReject[0].status === 'FAILED');
        report('Original error_details preserved after --resume rejection', rowAfterResumeReject[0].error_details === 'Original failure text preserved');

        // ---------------------------------------------------------------------
        // Test 10: --mark-success with missing checksum is rejected
        // ---------------------------------------------------------------------
        console.log(`\n[Test 10] --mark-success with missing/empty checksum is rejected`);
        await sandboxPool.query(
            `UPDATE schema_migrations SET checksum = '' WHERE version = ?`,
            [AUTHENTIC_VERSION]
        );

        let markSuccessEmptyError = null;
        try {
            await reconcileSchema({
                version: AUTHENTIC_VERSION,
                action: 'mark-success',
                operatorId: 'rec_op',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            markSuccessEmptyError = err;
        }

        report('reconcileSchema --mark-success rejects empty checksum with FATAL CHECKSUM ERROR', markSuccessEmptyError !== null && markSuccessEmptyError.message.includes('empty checksum in the database'));

        const [rowAfterMarkReject] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('Status was NOT marked SUCCESS after rejection', rowAfterMarkReject[0].status === 'FAILED');
        report('Checksum remained empty string (no silent identity creation)', rowAfterMarkReject[0].checksum === '');

        // Restore original up
        migration.up = originalUp;

        // Cleanup
        await sandboxPool.end();
        await rootConn.query(`DROP DATABASE IF EXISTS \`${SANDBOX_DB}\``);
        await rootConn.end();

        console.log(`\n════════════════════════════════════════════════════════════════════════`);
        console.log(`  Phase 4A.2.12.1 Test Summary: ${passed} passed, ${failed} failed`);
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

runStrictChecksumTests();
