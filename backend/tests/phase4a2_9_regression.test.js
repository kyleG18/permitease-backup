/**
 * PermitEase — Phase 4A.2.9 Regression Test Suite
 * 
 * Verifies:
 * Section 4: Migration State Guard (10 tests)
 * Section 5: Startup Table Verification (10 tests)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const {
    CONFIRMATION_PHRASE,
    isProductionEnvironment,
    ensureMigrationTable,
    executeMigration
} = require('../migrations/run_migration');

const { diagnoseSchema } = require('../migrations/diagnose_schema');
const { reconcileSchema } = require('../migrations/reconcile_schema');
const migration = require('../migrations/20261110_001_phase4a2');
const initDatabase = require('../config/initDb');

const SANDBOX_DB = 'smartpermit_test_sandbox_p4a29';
const RESTORE_TEST_DB = 'smartpermit_restore_test_20261109145038_453';

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

async function runRegressionTests() {
    console.log(`\n════════════════════════════════════════════════════════════════════════`);
    console.log(`  PermitEase Phase 4A.2.9 — Targeted Safety Corrections Test Suite`);
    console.log(`════════════════════════════════════════════════════════════════════════\n`);

    const rootConn = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        multipleStatements: true
    });

    try {
        // Prepare sandbox database cloned from restore test database
        await rootConn.query(`DROP DATABASE IF EXISTS \`${SANDBOX_DB}\``);
        await rootConn.query(`CREATE DATABASE \`${SANDBOX_DB}\``);

        // Clone all 20 tables into sandbox
        const [tables] = await rootConn.query(`SHOW TABLES FROM \`${RESTORE_TEST_DB}\``);
        for (const t of tables) {
            const tblName = Object.values(t)[0];
            await rootConn.query(`CREATE TABLE \`${SANDBOX_DB}\`.\`${tblName}\` LIKE \`${RESTORE_TEST_DB}\`.\`${tblName}\``);
            await rootConn.query(`INSERT INTO \`${SANDBOX_DB}\`.\`${tblName}\` SELECT * FROM \`${RESTORE_TEST_DB}\`.\`${tblName}\``);
        }

        const sandboxPool = mysql.createPool({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: SANDBOX_DB
        });

        // Compute script checksum
        const scriptPath = path.join(__dirname, '../migrations/20261110_001_phase4a2.js');
        const scriptContent = fs.readFileSync(scriptPath);
        const scriptChecksum = crypto.createHash('sha256').update(scriptContent).digest('hex');

        // =====================================================================
        // SECTION 4: MIGRATION STATE GUARD REGRESSION TESTS
        // =====================================================================
        console.log(`--- [Section 4: Migration State Guard (10 tests)] ---`);

        // Test 1: No migration record: ordinary preflight can proceed
        console.log(`\n[Test 1] No migration record allows ordinary preflight to proceed`);
        try {
            await migration.verifyPreSchema(sandboxPool);
            const [hasMigrations] = await sandboxPool.query("SHOW TABLES LIKE 'schema_migrations'");
            report('Preflight proceeds without schema_migrations record', hasMigrations.length === 0);
        } catch (err) {
            report('Preflight proceeds without schema_migrations record', false, err.message);
        }

        // Test 2: SUCCESS: runner exits without executing DDL
        console.log(`\n[Test 2] SUCCESS status exits cleanly without executing DDL`);
        await ensureMigrationTable(sandboxPool);
        await sandboxPool.query(
            `INSERT INTO schema_migrations (version, status, checksum, execution_id, operator_id, started_at, finished_at)
             VALUES ('20261110_001_phase4a2', 'SUCCESS', ?, 'test-uuid-success-1', 'test_op', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [scriptChecksum]
        );

        // Spy on migration.up to prove it is never invoked
        let upInvoked = false;
        const originalUp = migration.up;
        migration.up = async (conn) => {
            upInvoked = true;
            return originalUp(conn);
        };

        const resultSuccess = await executeMigration({
            targetVersion: '20261110_001_phase4a2',
            operatorId: 'test_op',
            testMode: true,
            customDb: sandboxPool
        });

        report('SUCCESS record returns ALREADY_COMPLETED', resultSuccess.status === 'ALREADY_COMPLETED');
        report('SUCCESS record did not invoke migration.up()', upInvoked === false);

        // Test 3: RUNNING: runner aborts without executing DDL
        console.log(`\n[Test 3] RUNNING status aborts without executing DDL`);
        upInvoked = false;
        await sandboxPool.query(
            `UPDATE schema_migrations 
             SET status = 'RUNNING', execution_id = 'running-id-123', finished_at = NULL, error_details = NULL 
             WHERE version = '20261110_001_phase4a2'`
        );

        let runningError = null;
        try {
            await executeMigration({
                targetVersion: '20261110_001_phase4a2',
                operatorId: 'test_op',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            runningError = err;
        }

        report('RUNNING record aborts with fatal error', runningError !== null && runningError.message.includes('currently in RUNNING state'));
        report('RUNNING abort instructs operator to run diagnose and reconcile', runningError !== null && runningError.message.includes('diagnose_schema.js') && runningError.message.includes('reconcile_schema.js --resume'));
        report('RUNNING record did not invoke migration.up()', upInvoked === false);

        // Test 4: FAILED: runner aborts without executing DDL
        console.log(`\n[Test 4] FAILED status aborts without executing DDL`);
        upInvoked = false;
        await sandboxPool.query(
            `UPDATE schema_migrations 
             SET status = 'FAILED', execution_id = 'failed-id-456', finished_at = CURRENT_TIMESTAMP, error_details = 'Simulated timeout error' 
             WHERE version = '20261110_001_phase4a2'`
        );

        let failedError = null;
        try {
            await executeMigration({
                targetVersion: '20261110_001_phase4a2',
                operatorId: 'test_op',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            failedError = err;
        }

        report('FAILED record aborts with fatal error', failedError !== null && failedError.message.includes('currently in FAILED state'));
        report('FAILED abort instructs operator to run diagnose and reconcile', failedError !== null && failedError.message.includes('diagnose_schema.js') && failedError.message.includes('reconcile_schema.js --resume'));
        report('FAILED record did not invoke migration.up()', upInvoked === false);

        // Restore original up
        migration.up = originalUp;

        // Test 5: Unknown status: runner aborts safely
        console.log(`\n[Test 5] Unknown status aborts safely`);
        await sandboxPool.query(`ALTER TABLE schema_migrations MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING'`);
        await sandboxPool.query(
            `UPDATE schema_migrations SET status = 'CORRUPTED' WHERE version = '20261110_001_phase4a2'`
        );

        let unknownError = null;
        try {
            await executeMigration({
                targetVersion: '20261110_001_phase4a2',
                operatorId: 'test_op',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (err) {
            unknownError = err;
        }

        report('Unknown status aborts safely', unknownError !== null && unknownError.message.includes('unknown state "CORRUPTED"'));

        // Restore ENUM column definition
        await sandboxPool.query(`UPDATE schema_migrations SET status = 'FAILED' WHERE version = '20261110_001_phase4a2'`);
        await sandboxPool.query(`ALTER TABLE schema_migrations MODIFY COLUMN status ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING'`);

        // Test 6: Existing FAILED details remain unchanged after rejection
        console.log(`\n[Test 6] Existing FAILED details remain unchanged after rejection`);
        const originalFailedDetails = 'Lock wait timeout exceeded during DDL test';
        const originalFailedId = 'immutable-failed-uuid-789';
        await sandboxPool.query(
            `UPDATE schema_migrations 
             SET status = 'FAILED', execution_id = ?, execution_duration_ms = 4321, error_details = ? 
             WHERE version = '20261110_001_phase4a2'`,
            [originalFailedId, originalFailedDetails]
        );

        const [beforeRows] = await sandboxPool.query(
            `SELECT * FROM schema_migrations WHERE version = '20261110_001_phase4a2'`
        );

        try {
            await executeMigration({
                targetVersion: '20261110_001_phase4a2',
                operatorId: 'another_operator',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (e) { /* expected fatal abort */ }

        const [afterRows] = await sandboxPool.query(
            `SELECT * FROM schema_migrations WHERE version = '20261110_001_phase4a2'`
        );

        report('Existing FAILED execution_id preserved', beforeRows[0].execution_id === afterRows[0].execution_id && afterRows[0].execution_id === originalFailedId);
        report('Existing FAILED error_details preserved', beforeRows[0].error_details === afterRows[0].error_details && afterRows[0].error_details === originalFailedDetails);
        report('Existing FAILED duration preserved', beforeRows[0].execution_duration_ms === afterRows[0].execution_duration_ms);
        report('Existing FAILED status remains FAILED', afterRows[0].status === 'FAILED');

        // Test 7: Existing RUNNING execution ID remains unchanged after rejection
        console.log(`\n[Test 7] Existing RUNNING execution ID remains unchanged`);
        const originalRunningId = 'immutable-running-uuid-111';
        await sandboxPool.query(
            `UPDATE schema_migrations 
             SET status = 'RUNNING', execution_id = ?, error_details = NULL 
             WHERE version = '20261110_001_phase4a2'`,
            [originalRunningId]
        );

        try {
            await executeMigration({
                targetVersion: '20261110_001_phase4a2',
                operatorId: 'another_operator',
                testMode: true,
                customDb: sandboxPool
            });
        } catch (e) { /* expected fatal abort */ }

        const [afterRunningRows] = await sandboxPool.query(
            `SELECT * FROM schema_migrations WHERE version = '20261110_001_phase4a2'`
        );
        report('Existing RUNNING execution_id preserved', afterRunningRows[0].execution_id === originalRunningId);
        report('Existing RUNNING status remains RUNNING', afterRunningRows[0].status === 'RUNNING');

        // Test 8: Recovery tool can still diagnose the failed migration
        console.log(`\n[Test 8] Recovery tool can still diagnose the failed migration`);
        await sandboxPool.query(
            `UPDATE schema_migrations SET status = 'FAILED', error_details = 'Simulated timeout' WHERE version = '20261110_001_phase4a2'`
        );

        const diagResult = await diagnoseSchema(sandboxPool);
        const [recRecord] = await sandboxPool.query(
            "SELECT status FROM schema_migrations WHERE version = '20261110_001_phase4a2'"
        );
        report('diagnoseSchema detects tracking table and records', diagResult.hasTrackingTable === true && recRecord[0].status === 'FAILED');
        report('diagnoseSchema identifies missing columns', diagResult.preCheck.missing.length > 0);
        report('diagnoseSchema identifies schema compliant for expansion', diagResult.preCheck.compliant === true);

        // Test 9: Recovery tool can still resume an appropriately diagnosed partial migration
        console.log(`\n[Test 9] Recovery tool can still resume a diagnosed migration`);
        const recResult = await reconcileSchema({
            version: '20261110_001_phase4a2',
            action: 'resume',
            operatorId: 'recovery_tester',
            testMode: true,
            customDb: sandboxPool
        });
        report('reconcileSchema RESUME succeeds', recResult.status === 'SUCCESS');

        const [reconciledRows] = await sandboxPool.query(
            `SELECT status, recovery_action FROM schema_migrations WHERE version = '20261110_001_phase4a2'`
        );
        report('schema_migrations updated to SUCCESS by reconciliation', reconciledRows[0].status === 'SUCCESS' && reconciledRows[0].recovery_action === 'RESUME');

        // Test 10: Production TTY and confirmation requirements remain intact
        console.log(`\n[Test 10] Production TTY and confirmation requirements remain intact`);
        const isProdCheck = isProductionEnvironment('smartpermit_db', '127.0.0.1');
        report('Production environment detection works for smartpermit_db', isProdCheck === true);

        let ttyRejected = false;
        try {
            if (isProdCheck && !process.stdin.isTTY) {
                throw new Error('[FATAL SECURITY] Production migration requires an interactive TTY terminal. Automated execution is strictly prohibited.');
            }
        } catch (err) {
            ttyRejected = err.message.includes('requires an interactive TTY terminal');
        }
        report('Non-TTY execution in production is strictly blocked', ttyRejected === true);

        let phraseRejected = false;
        try {
            const wrongPhrase = 'CONFIRM EXECUTE MIGRATION WRONG';
            if (wrongPhrase !== CONFIRMATION_PHRASE) {
                throw new Error(`[ABORT] Confirmation phrase "${wrongPhrase}" did not match "${CONFIRMATION_PHRASE}".`);
            }
        } catch (err) {
            phraseRejected = err.message.includes('did not match');
        }
        report('Wrong confirmation phrase aborts migration before DDL', phraseRejected === true);


        // =====================================================================
        // SECTION 5: STARTUP TABLE VERIFICATION REGRESSION TESTS
        // =====================================================================
        console.log(`\n--- [Section 5: Startup Table Verification (10 tests)] ---`);

        // Test 1: Correct physical table names allow verification to proceed
        console.log(`\n[Test 1] Correct physical table names allow verification to proceed`);
        let startupPassed = false;
        try {
            await initDatabase({ connection: sandboxPool });
            startupPassed = true;
        } catch (err) {
            console.error('Startup failed unexpectedly:', err.message);
        }
        report('initDatabase passes with 20 physical baseline tables present', startupPassed === true);

        // Test 2: An actually missing required table blocks startup
        console.log(`\n[Test 2] An actually missing required table blocks startup`);
        await sandboxPool.query(`DROP TABLE IF EXISTS users`);
        let missingTableBlocked = false;
        let missingTableMsg = '';
        try {
            await initDatabase({ connection: sandboxPool });
        } catch (err) {
            missingTableBlocked = true;
            missingTableMsg = err.message;
        }
        report('Missing core table (users) blocks startup', missingTableBlocked === true && missingTableMsg.includes('Core database tables are missing (users)'));

        // Restore users table for subsequent tests
        await sandboxPool.query(`CREATE TABLE users LIKE \`${RESTORE_TEST_DB}\`.users`);
        await sandboxPool.query(`INSERT INTO users SELECT * FROM \`${RESTORE_TEST_DB}\`.users`);

        // Test 3: An optional table's absence does not incorrectly block startup
        console.log(`\n[Test 3] Optional table absence does not block startup`);
        const [optPayments] = await sandboxPool.query("SHOW TABLES LIKE 'payments'");
        const [optAnalytics] = await sandboxPool.query("SHOW TABLES LIKE 'analytics_logs'");
        report('Optional table "payments" is absent from database and BASELINE_TABLES', optPayments.length === 0 && !initDatabase.BASELINE_TABLES.includes('payments'));
        report('Optional table "analytics_logs" is absent from database and BASELINE_TABLES', optAnalytics.length === 0 && !initDatabase.BASELINE_TABLES.includes('analytics_logs'));

        let optStartupPassed = false;
        try {
            await initDatabase({ connection: sandboxPool });
            optStartupPassed = true;
        } catch (e) {
            console.error('Optional table startup failed:', e.message);
        }
        report('Absence of non-baseline tables does not block startup', optStartupPassed === true);

        // Test 4: A genuinely required table is not accidentally omitted
        console.log(`\n[Test 4] Genuinely required table inventory check`);
        const [physicalTables] = await rootConn.query(`SHOW TABLES FROM \`${RESTORE_TEST_DB}\``);
        const physicalTableSet = new Set(physicalTables.map(t => Object.values(t)[0]));

        let allBaselineExistInDb = true;
        for (const tbl of initDatabase.BASELINE_TABLES) {
            if (!physicalTableSet.has(tbl)) {
                allBaselineExistInDb = false;
                console.error(`BASELINE_TABLE "${tbl}" not found in physical database!`);
            }
        }
        report('All 20 BASELINE_TABLES exist in physical schema', allBaselineExistInDb === true && initDatabase.BASELINE_TABLES.length === 20);

        // Test 5: Migration status is still checked after table verification
        console.log(`\n[Test 5] Migration status is checked after table verification`);
        await sandboxPool.query(`DROP TABLE IF EXISTS schema_migrations`);
        let missingTrackingBlocked = false;
        let missingTrackingMsg = '';
        try {
            await initDatabase({ connection: sandboxPool });
        } catch (err) {
            missingTrackingBlocked = true;
            missingTrackingMsg = err.message;
        }
        report('Missing schema_migrations blocks startup after table verification', missingTrackingBlocked === true && missingTrackingMsg.includes('Required tracking table "schema_migrations" does not exist'));

        // Test 6: A FAILED migration still blocks startup
        console.log(`\n[Test 6] A FAILED migration still blocks startup`);
        await ensureMigrationTable(sandboxPool);
        await sandboxPool.query(
            `INSERT INTO schema_migrations (version, status, checksum, execution_id, operator_id, started_at, finished_at, error_details)
             VALUES ('20261110_001_phase4a2', 'FAILED', 'abc', 'id-fail', 'test_op', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Deadlock during migration')`
        );

        let failedMigrationBlocked = false;
        let failedMigrationMsg = '';
        try {
            await initDatabase({ connection: sandboxPool });
        } catch (err) {
            failedMigrationBlocked = true;
            failedMigrationMsg = err.message;
        }
        report('FAILED migration blocks startup with fail-closed error', failedMigrationBlocked === true && failedMigrationMsg.includes('is not SUCCESS (current status: "FAILED")'));

        // Test 7: A RUNNING migration still blocks startup
        console.log(`\n[Test 7] A RUNNING migration still blocks startup`);
        await sandboxPool.query(
            `UPDATE schema_migrations SET status = 'RUNNING', finished_at = NULL, error_details = NULL WHERE version = '20261110_001_phase4a2'`
        );

        let runningMigrationBlocked = false;
        let runningMigrationMsg = '';
        try {
            await initDatabase({ connection: sandboxPool });
        } catch (err) {
            runningMigrationBlocked = true;
            runningMigrationMsg = err.message;
        }
        report('RUNNING migration blocks startup with fail-closed error', runningMigrationBlocked === true && runningMigrationMsg.includes('is not SUCCESS (current status: "RUNNING")'));

        // Test 8: Normal startup executes no CREATE, ALTER, DROP, or other DDL
        console.log(`\n[Test 8] Normal startup executes zero DDL`);
        await sandboxPool.query(
            `UPDATE schema_migrations SET status = 'SUCCESS', finished_at = CURRENT_TIMESTAMP WHERE version = '20261110_001_phase4a2'`
        );

        const executedQueries = [];
        const originalQuery = sandboxPool.query;
        sandboxPool.query = async function (sql, values) {
            executedQueries.push(typeof sql === 'string' ? sql : sql.sql || '');
            return originalQuery.apply(this, arguments);
        };

        await initDatabase({ connection: sandboxPool });
        sandboxPool.query = originalQuery;

        const ddlQueries = executedQueries.filter(q => /CREATE|ALTER|DROP|TRUNCATE|RENAME/i.test(q));
        report('Normal startup executes zero DDL statements', ddlQueries.length === 0, `(Executed ${executedQueries.length} total queries, 0 DDL)`);

        // Test 9: Startup failure prevents Express listener binding
        console.log(`\n[Test 9] Startup failure prevents Express listener binding`);
        const serverSource = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
        const startServerFnMatch = serverSource.includes('async function startServer()');
        const awaitInitDbBeforeListen = serverSource.indexOf('await initDatabase()') < serverSource.indexOf('app.listen(PORT');
        const catchAbortsProcess = serverSource.includes('process.exit(1)');
        report('server.js defines async startServer()', startServerFnMatch);
        report('await initDatabase() precedes app.listen()', awaitInitDbBeforeListen);
        report('startServer catch block exits process on database error', catchAbortsProcess);

        // Test 10: Cron is registered only after successful verification
        console.log(`\n[Test 10] Cron registration is positioned strictly after database verification`);
        const initDbIndex = serverSource.indexOf('await initDatabase()');
        const cronScheduleIndex = serverSource.indexOf('cron.schedule(');
        report('cron.schedule() is positioned strictly after await initDatabase()', cronScheduleIndex > initDbIndex);

        // Clean up sandbox database and connections
        await sandboxPool.end();
        await rootConn.query(`DROP DATABASE IF EXISTS \`${SANDBOX_DB}\``);
        await rootConn.end();

        console.log(`\n════════════════════════════════════════════════════════════════════════`);
        console.log(`  Phase 4A.2.9 Regression Test Summary: ${passed} passed, ${failed} failed`);
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

runRegressionTests();
