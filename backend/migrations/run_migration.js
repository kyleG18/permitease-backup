#!/usr/bin/env node
/**
 * PermitEase — Explicit Production Migration Runner
 * 
 * Usage:
 *   node backend/migrations/run_migration.js --version=20261110_001_phase4a2 [--operator-id="..."]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const db = require('../config/db');
const { verifyBaseline } = require('./baseline_manager');

const CONFIRMATION_PHRASE = 'CONFIRM_EXECUTE_PHASE4A2';

/**
 * Checks whether the target database environment is production.
 * smartpermit_db is ALWAYS treated as production regardless of NODE_ENV.
 */
function isProductionEnvironment(dbName = process.env.DB_NAME, host = process.env.DB_HOST) {
    const env = (process.env.NODE_ENV || '').toLowerCase();
    const name = (dbName || '').toLowerCase();
    const h = (host || '').toLowerCase();

    const isProdEnv = env === 'production';
    const isProdDb = name === 'smartpermit_db';
    const isRemote = h && !['localhost', '127.0.0.1'].includes(h) && !h.includes('test');

    return isProdEnv || isProdDb || isRemote;
}

/**
 * Prompts user for exact interactive confirmation in TTY.
 */
function promptConfirmation(query) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

/**
 * Validates whether a value is a strictly valid 64-hexadecimal character SHA-256 string.
 */
function isValidSha256(value) {
    return typeof value === 'string' && SHA256_HEX_REGEX.test(value);
}

/**
 * Strict assertion of migration checksum identity.
 * Rejects NULL, empty, malformed, and mismatched checksums before any DDL or state mutation.
 */
function assertMigrationChecksum(targetVersion, storedChecksum, diskChecksum, context = 'Execution') {
    if (!isValidSha256(diskChecksum)) {
        throw new Error(
            `[FATAL CHECKSUM ERROR] Migration ${targetVersion} file on disk produced an invalid SHA-256 checksum ("${diskChecksum}"). ` +
            `${context} aborted to protect database integrity.`
        );
    }
    if (storedChecksum === null || storedChecksum === undefined) {
        throw new Error(
            `[FATAL CHECKSUM ERROR] Migration ${targetVersion} has a NULL or missing checksum in the database. ` +
            `Recorded migration identity is invalid. ${context} aborted to protect database integrity.`
        );
    }
    if (typeof storedChecksum !== 'string' || storedChecksum === '') {
        throw new Error(
            `[FATAL CHECKSUM ERROR] Migration ${targetVersion} has an empty checksum in the database. ` +
            `Recorded migration identity is invalid. ${context} aborted to protect database integrity.`
        );
    }
    if (!isValidSha256(storedChecksum)) {
        throw new Error(
            `[FATAL CHECKSUM ERROR] Migration ${targetVersion} has a malformed checksum in the database ("${storedChecksum}"). ` +
            `Expected exactly 64 hexadecimal characters. ${context} aborted to protect database integrity.`
        );
    }
    if (storedChecksum.toLowerCase() !== diskChecksum.toLowerCase()) {
        throw new Error(
            `[FATAL CHECKSUM MISMATCH] Migration ${targetVersion} file on disk has checksum "${diskChecksum}", ` +
            `which does not match recorded database checksum "${storedChecksum}". ` +
            `${context} aborted to protect database integrity.`
        );
    }
}

/**
 * Ensures the schema_migrations tracking table exists.
 */
async function ensureMigrationTable(connection) {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            version VARCHAR(100) NOT NULL UNIQUE,
            status ENUM('RUNNING', 'SUCCESS', 'FAILED') NOT NULL,
            checksum CHAR(64) NOT NULL,
            execution_id CHAR(36) NOT NULL,
            operator_id VARCHAR(150) NULL,
            recovery_action VARCHAR(50) NULL,
            confirmed_fingerprint CHAR(64) NULL,
            started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            finished_at TIMESTAMP NULL,
            execution_duration_ms INT NULL,
            error_details TEXT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
}

/**
 * Main migration execution routine.
 */
async function executeMigration({
    targetVersion = '20261110_001_phase4a2',
    operatorId = process.env.OPERATOR_ID || 'operator_admin',
    testMode = false,
    mockPromptAnswer = null,
    customDb = null
} = {}) {
    const connection = customDb || db;
    let executionId = crypto.randomUUID();
    let startTime = Date.now();
    let scriptChecksum = null;

    try {
        console.log(`\n================ PERMITEASE MIGRATION RUNNER ================`);
        console.log(`Target Version: ${targetVersion}`);
        console.log(`Execution ID:   ${executionId}`);
        console.log(`Operator ID:    ${operatorId}`);

        // 1. Verify target database identity
        const [[dbRow]] = await connection.query('SELECT DATABASE() AS current_db');
        const currentDb = dbRow.current_db;
        console.log(`Connected Database: ${currentDb}`);

        const isProd = isProductionEnvironment(currentDb, process.env.DB_HOST);
        console.log(`Production Safeguards Active: ${isProd ? 'YES (MANDATORY)' : 'NO (TEST/ISOLATED)'}`);

        // 2. Load migration script and compute checksum
        const scriptFilename = `${targetVersion}.js`;
        const scriptPath = path.join(__dirname, scriptFilename);
        if (!fs.existsSync(scriptPath)) {
            throw new Error(`[Migration Error] Script file "${scriptFilename}" not found at ${scriptPath}`);
        }

        let scriptContent;
        try {
            scriptContent = fs.readFileSync(scriptPath);
        } catch (readErr) {
            throw new Error(`[Migration Error] Script file "${scriptFilename}" is unreadable: ${readErr.message}`);
        }
        scriptChecksum = crypto.createHash('sha256').update(scriptContent).digest('hex');
        if (!isValidSha256(scriptChecksum)) {
            throw new Error(`[Migration Error] Computed checksum for "${scriptFilename}" is invalid.`);
        }
        console.log(`Script SHA-256: ${scriptChecksum}`);

        const migration = require(scriptPath);

        // 3. Pre-migration schema inspection
        console.log(`[Pre-Flight] Checking schema compatibility...`);
        const preCheck = await migration.verifyPreSchema(connection);
        if (!preCheck.compliant) {
            console.error(`[Pre-Flight Error] Existing schema has conflicts with migration:`, preCheck.conflicts);
            throw new Error(`Pre-migration schema has ${preCheck.conflicts.length} conflicting columns. Cannot proceed.`);
        }
        console.log(`[Pre-Flight] Schema compatible. Missing columns to apply: ${preCheck.missing.length}`);

        // 4. Verify baseline and HMAC signature
        console.log(`[Pre-Flight] Verifying pre-migration signed baseline...`);
        const hmacSecret = process.env.BASELINE_HMAC_SECRET;
        let baselineResult = null;
        if (hmacSecret) {
            baselineResult = await verifyBaseline(connection, {
                migrationVersion: targetVersion,
                hmacSecret,
                assertAgainstDatabase: true
            });
            if (!baselineResult.valid) {
                throw new Error(`[Baseline Error] Pre-migration baseline verification failed: ${baselineResult.reason}`);
            }
            console.log(`[Pre-Flight] Baseline verified successfully. Signed pre-migration state confirmed.`);
        } else {
            if (isProd) {
                throw new Error('[Security Error] Production migration requires BASELINE_HMAC_SECRET to verify pre-migration baseline.');
            }
            console.warn(`[Pre-Flight Warning] Non-production test run without BASELINE_HMAC_SECRET.`);
        }

        // 5. Pre-check existing tracking status if table already exists
        const [hasTablePre] = await connection.query("SHOW TABLES LIKE 'schema_migrations'");
        if (hasTablePre.length > 0) {
            const [preExisting] = await connection.query(
                'SELECT status, checksum, execution_id, error_details FROM schema_migrations WHERE version = ?',
                [targetVersion]
            );
            if (preExisting.length > 0) {
                // Strict checksum identity verification
                assertMigrationChecksum(targetVersion, preExisting[0].checksum, scriptChecksum, 'Execution');

                const currentStatus = preExisting[0].status;
                if (currentStatus === 'SUCCESS') {
                    console.log(`[Notice] Migration ${targetVersion} already executed with status SUCCESS. Exiting cleanly.`);
                    return { status: 'ALREADY_COMPLETED', version: targetVersion };
                }
                if (currentStatus === 'RUNNING' || currentStatus === 'FAILED') {
                    throw new Error(
                        `[FATAL] Migration ${targetVersion} is currently in ${currentStatus} state. ` +
                        `Ordinary migration execution is prohibited. Diagnose and recover using the dedicated reconciliation tool.\n` +
                        `Suggested diagnosis command:  node backend/migrations/diagnose_schema.js\n` +
                        `Suggested recovery command:   node backend/migrations/reconcile_schema.js --resume`
                    );
                }
                throw new Error(`[FATAL] Migration ${targetVersion} is in an unknown state "${currentStatus}". Aborting safely.`);
            }
        }

        // 6. Enforce Production TTY and Confirmation BEFORE ANY DDL
        if (isProd) {
            if (!process.stdin.isTTY && !testMode) {
                throw new Error('[FATAL SECURITY] Production migration requires an interactive TTY terminal. Automated execution is strictly prohibited.');
            }

            console.log(`\n⚠️  PRODUCTION MIGRATION CONFIRMATION REQUIRED ⚠️`);
            console.log(`Target: ${currentDb} on 127.0.0.1:3306`);
            console.log(`Version: ${targetVersion}`);
            console.log(`To proceed, type the exact confirmation phrase: ${CONFIRMATION_PHRASE}`);

            const answer = mockPromptAnswer !== null ? mockPromptAnswer : await promptConfirmation('Confirm: ');
            if (answer !== CONFIRMATION_PHRASE) {
                throw new Error(`[ABORT] Confirmation phrase "${answer}" did not match "${CONFIRMATION_PHRASE}". Migration aborted before any DDL.`);
            }
            console.log(`[Confirmation] Operator confirmed. Proceeding to execution.`);
        } else if (testMode && mockPromptAnswer !== null) {
            if (mockPromptAnswer !== CONFIRMATION_PHRASE) {
                throw new Error(`[ABORT] Confirmation phrase did not match.`);
            }
        }

        // 7. Bootstrap tracking table and record RUNNING
        console.log(`[Tracking] Bootstrapping schema_migrations table...`);
        await ensureMigrationTable(connection);

        // Check migration record rules before any DDL
        const [existing] = await connection.query(
            'SELECT status, checksum, execution_id, error_details FROM schema_migrations WHERE version = ?',
            [targetVersion]
        );

        if (existing.length > 0) {
            // Strict checksum identity verification
            assertMigrationChecksum(targetVersion, existing[0].checksum, scriptChecksum, 'Execution');

            const currentStatus = existing[0].status;
            if (currentStatus === 'SUCCESS') {
                console.log(`[Notice] Migration ${targetVersion} already executed with status SUCCESS. Exiting cleanly.`);
                return { status: 'ALREADY_COMPLETED', version: targetVersion };
            }
            if (currentStatus === 'RUNNING' || currentStatus === 'FAILED') {
                throw new Error(
                    `[FATAL] Migration ${targetVersion} is currently in ${currentStatus} state. ` +
                    `Ordinary migration execution is prohibited. Diagnose and recover using the dedicated reconciliation tool.\n` +
                    `Suggested diagnosis command:  node backend/migrations/diagnose_schema.js\n` +
                    `Suggested recovery command:   node backend/migrations/reconcile_schema.js --resume`
                );
            }
            throw new Error(`[FATAL] Migration ${targetVersion} is in an unknown state "${currentStatus}". Aborting safely.`);
        }

        // Only insert if no existing record exists
        await connection.query(
            `INSERT INTO schema_migrations (version, status, checksum, execution_id, operator_id, started_at)
             VALUES (?, 'RUNNING', ?, ?, ?, CURRENT_TIMESTAMP)`,
            [targetVersion, scriptChecksum, executionId, operatorId]
        );
        console.log(`[Tracking] Recorded migration status as RUNNING.`);

        // 8. Execute Migration DDL
        console.log(`[DDL] Executing schema expansion statements...`);
        await migration.up(connection);
        console.log(`[DDL] Schema additions applied.`);

        // 8. Run Post-Migration Assertions
        console.log(`[Assertions] Running post-migration integrity assertions...`);
        const assertionResult = await migration.verifyPostAssertions(
            connection,
            baselineResult ? baselineResult.baselineData : null
        );
        console.log(`[Assertions] All ${assertionResult.assertions.length} assertions passed 100%.`);

        // 9. Mark SUCCESS
        const durationMs = Date.now() - startTime;
        await connection.query(
            `UPDATE schema_migrations 
             SET status = 'SUCCESS', finished_at = CURRENT_TIMESTAMP, execution_duration_ms = ?, error_details = NULL 
             WHERE version = ? AND execution_id = ?`,
            [durationMs, targetVersion, executionId]
        );
        console.log(`[Success] Migration ${targetVersion} completed and marked SUCCESS (${durationMs}ms).\n`);

        return {
            status: 'SUCCESS',
            version: targetVersion,
            executionId,
            durationMs
        };

    } catch (fatalErr) {
        console.error(`\n[FATAL MIGRATION FAILURE] ${fatalErr.message}`);

        // Record failure state in schema_migrations if table exists and execution started
        try {
            const durationMs = Date.now() - startTime;
            const [updateResult] = await connection.query(
                `UPDATE schema_migrations 
                 SET status = 'FAILED', finished_at = CURRENT_TIMESTAMP, execution_duration_ms = ?, error_details = ? 
                 WHERE version = ? AND execution_id = ?`,
                [durationMs, fatalErr.message, targetVersion, executionId]
            );
            if (updateResult && updateResult.affectedRows > 0) {
                console.error(`[Tracking] Recorded migration state as FAILED in schema_migrations.`);
            }
        } catch (trackErr) {
            console.error(`[Tracking Error] Could not record FAILED state in schema_migrations:`, trackErr.message);
        }

        throw fatalErr;
    } finally {
        // Pool cleanup
        if (!customDb && connection && typeof connection.end === 'function') {
            await connection.end();
            console.log(`[Shutdown] Database pool closed.`);
        }
    }
}

// Entrypoint
if (require.main === module) {
    const versionArg = process.argv.find(a => a.startsWith('--version='))?.split('=')[1] || '20261110_001_phase4a2';
    const operatorArg = process.argv.find(a => a.startsWith('--operator-id='))?.split('=')[1] || 'operator_admin';

    executeMigration({ targetVersion: versionArg, operatorId: operatorArg })
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = {
    CONFIRMATION_PHRASE,
    SHA256_HEX_REGEX,
    isValidSha256,
    assertMigrationChecksum,
    isProductionEnvironment,
    ensureMigrationTable,
    executeMigration
};
