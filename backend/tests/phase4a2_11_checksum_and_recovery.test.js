/**
 * PermitEase — Phase 4A.2.11 Checksum Integrity and Recovery History Test Suite
 * 
 * Verifies:
 * Part 1: Checksum Identity Enforcement (10 tests)
 * Part 2: Recovery History Preservation (6 tests)
 * 
 * STRICT ISOLATION: Runs exclusively against disposable database smartpermit_test_sandbox_p4a211
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const {
    ensureMigrationTable,
    executeMigration
} = require('../migrations/run_migration');

const { diagnoseSchema } = require('../migrations/diagnose_schema');
const { reconcileSchema } = require('../migrations/reconcile_schema');
const migration = require('../migrations/20261110_001_phase4a2');

const SANDBOX_DB = 'smartpermit_test_sandbox_p4a211';
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

async function runChecksumAndRecoveryTests() {
    console.log(`\n════════════════════════════════════════════════════════════════════════`);
    console.log(`  PermitEase Phase 4A.2.11 — Checksum & Recovery Test Suite`);
    console.log(`════════════════════════════════════════════════════════════════════════\n`);

    const rootConn = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        multipleStatements: true
    });

    try {
        // Setup disposable sandbox
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

        // =====================================================================
        // PART 1: CHECKSUM IDENTITY ENFORCEMENT (10 TESTS)
        // =====================================================================
        console.log(`\n--- [Part 1: Checksum Tests (10 tests)] ---`);

        // Test 1: Matching file and stored checksums permit the expected operation
        console.log(`\n[Test 1] Matching file and stored checksums permit expected operation`);
        await ensureMigrationTable(sandboxPool);
        await sandboxPool.query(
            `INSERT INTO schema_migrations (version, status, checksum, execution_id, operator_id, started_at, finished_at)
             VALUES (?, 'SUCCESS', ?, 'test-uuid-match-1', 'test_op', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [AUTHENTIC_VERSION, authenticChecksum]
        );

        const matchResult = await executeMigration({
            targetVersion: AUTHENTIC_VERSION,
            operatorId: 'test_op',
            testMode: true,
            customDb: sandboxPool
        });
        report('Matching checksum allows clean exit for SUCCESS record', matchResult.status === 'ALREADY_COMPLETED');

        // Test 2: Modified migration file causes a checksum mismatch failure
        console.log(`\n[Test 2] Modified migration file causes checksum mismatch failure`);
        const tamperedStoredChecksum = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
        await sandboxPool.query(
            `UPDATE schema_migrations SET checksum = ?, status = 'FAILED' WHERE version = ?`,
            [tamperedStoredChecksum, AUTHENTIC_VERSION]
        );

        let mismatchError = null;
        try {
            await executeMigration({
                targetVersion: AUTHENTIC_VERSION,
                operatorId: 'test_op',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            mismatchError = err;
        }
        report('Checksum mismatch throws fatal error', mismatchError !== null && mismatchError.message.includes('[FATAL CHECKSUM MISMATCH]'));
        report('Error message reports disk and stored checksum values', mismatchError !== null && mismatchError.message.includes(authenticChecksum) && mismatchError.message.includes(tamperedStoredChecksum));

        // Test 3: Mismatch prevents migration.up() from being invoked
        console.log(`\n[Test 3] Mismatch prevents migration.up() from being invoked`);
        let upInvoked = false;
        const originalUp = migration.up;
        migration.up = async (conn) => {
            upInvoked = true;
            return originalUp(conn);
        };

        try {
            await executeMigration({
                targetVersion: AUTHENTIC_VERSION,
                operatorId: 'test_op',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (e) {}
        report('migration.up() was NOT invoked during checksum mismatch', upInvoked === false);
        migration.up = originalUp;

        // Test 4: Mismatch does not modify the existing tracking record
        console.log(`\n[Test 4] Mismatch does not modify existing tracking record`);
        const [rowsAfterMismatch] = await sandboxPool.query(
            'SELECT * FROM schema_migrations WHERE version = ?',
            [AUTHENTIC_VERSION]
        );
        report('Existing tracking record checksum remained unchanged', rowsAfterMismatch[0].checksum === tamperedStoredChecksum);
        report('Existing tracking record status remained unchanged', rowsAfterMismatch[0].status === 'FAILED');
        report('Existing tracking record execution_id remained unchanged', rowsAfterMismatch[0].execution_id === 'test-uuid-match-1');

        // Test 5: Missing migration file aborts safely
        console.log(`\n[Test 5] Missing migration file aborts safely`);
        let missingFileError = null;
        try {
            await executeMigration({
                targetVersion: 'nonexistent_migration_v999',
                operatorId: 'test_op',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            missingFileError = err;
        }
        report('Missing migration file aborts with clear error', missingFileError !== null && missingFileError.message.includes('not found at'));

        // Test 6: Unreadable migration file aborts safely
        console.log(`\n[Test 6] Unreadable migration file aborts safely`);
        const tempUnreadable = path.join(__dirname, '../migrations/temp_unreadable_v998.js');
        fs.writeFileSync(tempUnreadable, 'module.exports = {};', 'utf8');
        // Simulate read error by monkeypatching readFileSync for this file only
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
                operatorId: 'test_op',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            unreadableError = err;
        }
        fs.readFileSync = origReadFileSync;
        if (fs.existsSync(tempUnreadable)) fs.unlinkSync(tempUnreadable);

        report('Unreadable migration file aborts safely with EACCES', unreadableError !== null && unreadableError.message.includes('is unreadable: EACCES'));

        // Test 7: --resume rejects a checksum mismatch
        console.log(`\n[Test 7] --resume rejects checksum mismatch`);
        let resumeMismatchError = null;
        try {
            await reconcileSchema({
                version: AUTHENTIC_VERSION,
                action: 'resume',
                operatorId: 'recovery_tester',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            resumeMismatchError = err;
        }
        report('reconcileSchema --resume rejects checksum mismatch', resumeMismatchError !== null && resumeMismatchError.message.includes('[FATAL CHECKSUM MISMATCH]'));

        // Test 8: --mark-success rejects a checksum mismatch when migration identity is required
        console.log(`\n[Test 8] --mark-success rejects checksum mismatch`);
        let markSuccessMismatchError = null;
        try {
            await reconcileSchema({
                version: AUTHENTIC_VERSION,
                action: 'mark-success',
                operatorId: 'recovery_tester',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            markSuccessMismatchError = err;
        }
        report('reconcileSchema --mark-success rejects checksum mismatch', markSuccessMismatchError !== null && markSuccessMismatchError.message.includes('[FATAL CHECKSUM MISMATCH]'));

        // Test 9: Diagnostic output identifies a mismatch without modifying database state
        console.log(`\n[Test 9] Diagnostic output identifies a mismatch without modifying database state`);
        const diagResult = await diagnoseSchema(sandboxPool);
        const diagMismatch = diagResult.checksumStatus.find(c => c.version === AUTHENTIC_VERSION);
        report('diagnoseSchema identifies checksum mismatch', diagMismatch && diagMismatch.match === false);
        report('diagnoseSchema reports disk checksum correctly', diagMismatch && diagMismatch.diskChecksum === authenticChecksum);
        report('diagnoseSchema reports stored checksum correctly', diagMismatch && diagMismatch.storedChecksum === tamperedStoredChecksum);

        const [dbRowsAfterDiag] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('Database state unchanged after diagnosis', dbRowsAfterDiag[0].checksum === tamperedStoredChecksum);

        // Test 10: An initial migration with no prior tracking record computes and stores actual file checksum
        console.log(`\n[Test 10] Initial migration computes and stores actual file checksum`);
        await sandboxPool.query(`DELETE FROM schema_migrations WHERE version = ?`, [AUTHENTIC_VERSION]);

        // Run fresh migration
        const freshRun = await executeMigration({
            targetVersion: AUTHENTIC_VERSION,
            operatorId: 'operator_initial',
            testMode: true,
            customDb: sandboxPool
        });

        report('Initial migration executes successfully', freshRun.status === 'SUCCESS');
        const [freshDbRow] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('Stored checksum matches actual disk checksum exactly', freshDbRow[0].checksum === authenticChecksum);


        // =====================================================================
        // PART 2: RECOVERY HISTORY PRESERVATION (6 TESTS)
        // =====================================================================
        console.log(`\n--- [Part 2: Recovery History Tests (6 tests)] ---`);

        // Setup a simulated FAILED record with real failure reason
        const initialFailedError = 'Lock wait timeout exceeded during DDL statement (simulated)';
        const initialExecutionId = 'original-exec-uuid-7777';
        await sandboxPool.query(
            `UPDATE schema_migrations 
             SET status = 'FAILED', execution_id = ?, execution_duration_ms = 9999, error_details = ?, recovery_action = NULL
             WHERE version = ?`,
            [initialExecutionId, initialFailedError, AUTHENTIC_VERSION]
        );

        // Test 1: Original error details remain unchanged after successful recovery
        console.log(`\n[Test 1] Original error details remain unchanged after recovery`);
        const recResult = await reconcileSchema({
            version: AUTHENTIC_VERSION,
            action: 'resume',
            operatorId: 'recovery_specialist',
            testMode: true,
            customDb: sandboxPool
        });

        report('reconcileSchema completed successfully', recResult.status === 'SUCCESS');
        const [recDbRow] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('Original error_details remained unchanged after recovery', recDbRow[0].error_details === initialFailedError);

        // Test 2: Original execution ID remains unchanged
        console.log(`\n[Test 2] Original execution ID remains unchanged`);
        report('Original execution_id remained unchanged after recovery', recDbRow[0].execution_id === initialExecutionId);

        // Test 3: Original checksum remains unchanged
        console.log(`\n[Test 3] Original checksum remains unchanged`);
        report('Original checksum remained unchanged after recovery', recDbRow[0].checksum === authenticChecksum);

        // Test 4: Recovery action is recorded correctly
        console.log(`\n[Test 4] Recovery action is recorded correctly`);
        report('recovery_action recorded as RESUME', recDbRow[0].recovery_action === 'RESUME');
        report('status updated to SUCCESS', recDbRow[0].status === 'SUCCESS');

        // Test 5: Failed post-migration assertions do not produce SUCCESS
        console.log(`\n[Test 5] Failed assertions prevent SUCCESS`);
        // Reset to FAILED
        await sandboxPool.query(
            `UPDATE schema_migrations SET status = 'FAILED', error_details = 'Corrupted state' WHERE version = ?`,
            [AUTHENTIC_VERSION]
        );
        // Temporarily break assertion by inserting non-null in applicability_type
        const originalVerifyPost = migration.verifyPostAssertions;
        migration.verifyPostAssertions = async () => {
            throw new Error('[Assertion Failure] Simulated post-assertion failure.');
        };

        let assertFailError = null;
        try {
            await reconcileSchema({
                version: AUTHENTIC_VERSION,
                action: 'resume',
                operatorId: 'recovery_tester',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            assertFailError = err;
        }
        migration.verifyPostAssertions = originalVerifyPost;

        const [rowAfterAssertFail] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('Assertion failure aborted recovery', assertFailError !== null && assertFailError.message.includes('Simulated post-assertion failure'));
        report('Status was NOT marked SUCCESS after assertion failure', rowAfterAssertFail[0].status === 'FAILED');
        report('Error details not cleared on assertion failure', rowAfterAssertFail[0].error_details === 'Corrupted state');

        // Test 6: Repeated recovery does not erase previous failure information
        console.log(`\n[Test 6] Repeated recovery does not erase previous failure information`);
        const repeatedRecovery = await reconcileSchema({
            version: AUTHENTIC_VERSION,
            action: 'resume',
            operatorId: 'second_recovery_specialist',
            testMode: true,
            customDb: sandboxPool
        });

        const [finalRow] = await sandboxPool.query('SELECT * FROM schema_migrations WHERE version = ?', [AUTHENTIC_VERSION]);
        report('Repeated recovery succeeded', repeatedRecovery.status === 'SUCCESS');
        report('Original failure text preserved across repeated recovery', finalRow[0].error_details === 'Corrupted state');
        report('Original execution ID preserved across repeated recovery', finalRow[0].execution_id === initialExecutionId);
        report('Original checksum preserved across repeated recovery', finalRow[0].checksum === authenticChecksum);

        // Cleanup
        await sandboxPool.end();
        await rootConn.query(`DROP DATABASE IF EXISTS \`${SANDBOX_DB}\``);
        await rootConn.end();

        console.log(`\n════════════════════════════════════════════════════════════════════════`);
        console.log(`  Phase 4A.2.11 Test Summary: ${passed} passed, ${failed} failed`);
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

runChecksumAndRecoveryTests();
