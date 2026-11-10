#!/usr/bin/env node
/**
 * PermitEase — Schema Reconciliation and Recovery Tool
 * 
 * Supports:
 *   --resume          Applies missing DDL, runs assertions, updates SUCCESS
 *   --mark-success    Validates 100% compliant schema, asserts data preservation, updates SUCCESS
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const db = require('../config/db');
const migration = require('./20261110_001_phase4a2');
const { verifyBaseline } = require('./baseline_manager');
const { isProductionEnvironment, assertMigrationChecksum } = require('./run_migration');

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

async function reconcileSchema({
    version = '20261110_001_phase4a2',
    action = 'resume', // 'resume' or 'mark-success'
    operatorId = process.env.OPERATOR_ID || 'recovery_operator',
    testMode = false,
    mockPromptAnswer = null,
    customDb = null
} = {}) {
    const connection = customDb || db;
    console.log(`\n================ SCHEMA RECONCILIATION & RECOVERY ================`);
    console.log(`Version:  ${version}`);
    console.log(`Action:   ${action.toUpperCase()}`);
    console.log(`Operator: ${operatorId}`);

    try {
        const [[dbRow]] = await connection.query('SELECT DATABASE() AS current_db');
        const currentDb = dbRow.current_db;
        const isProd = isProductionEnvironment(currentDb, process.env.DB_HOST);

        console.log(`Target Database: ${currentDb} (${isProd ? 'PRODUCTION' : 'TEST/ISOLATED'})`);

        // 1. Verify migration script exists on disk and compute checksum
        const scriptFilename = `${version}.js`;
        const scriptPath = path.join(__dirname, scriptFilename);
        if (!fs.existsSync(scriptPath)) {
            throw new Error(`[Recovery Error] Script file "${scriptFilename}" not found at ${scriptPath}`);
        }
        let scriptContent;
        try {
            scriptContent = fs.readFileSync(scriptPath);
        } catch (readErr) {
            throw new Error(`[Recovery Error] Script file "${scriptFilename}" is unreadable: ${readErr.message}`);
        }
        const diskChecksum = crypto.createHash('sha256').update(scriptContent).digest('hex');
        console.log(`Script SHA-256 (Disk): ${diskChecksum}`);

        // 2. Check existing migration record
        const [records] = await connection.query(
            'SELECT * FROM schema_migrations WHERE version = ?',
            [version]
        );
        if (records.length === 0) {
            throw new Error(`[Recovery Error] No record found in schema_migrations for version ${version}. Use run_migration.js first.`);
        }
        const record = records[0];
        console.log(`Current Recorded State: ${record.status} (Execution ID: ${record.execution_id})`);
        console.log(`Recorded SHA-256 (DB):  ${record.checksum}`);

        // 3. Strict checksum identity verification before proceeding
        assertMigrationChecksum(version, record.checksum, diskChecksum, 'Recovery');

        if (record.status === 'SUCCESS' && action !== 'mark-success') {
            console.log(`[Notice] Migration ${version} is already marked SUCCESS. No action needed.`);
            return { status: 'ALREADY_SUCCESS' };
        }

        // 2. Schema compatibility assessment
        const preCheck = await migration.verifyPreSchema(connection);
        if (!preCheck.compliant) {
            console.error(`[Fatal Conflict] Schema has conflicting columns:`, preCheck.conflicts);
            throw new Error(`Schema contains ${preCheck.conflicts.length} conflicting columns. Cannot reconcile automatically.`);
        }

        // 3. Baseline verification if available
        let baselineResult = null;
        const hmacSecret = process.env.BASELINE_HMAC_SECRET;
        if (hmacSecret) {
            baselineResult = await verifyBaseline(connection, {
                migrationVersion: version,
                hmacSecret,
                assertAgainstDatabase: false // Check file integrity
            });
        }

        // 4. Interactive Confirmation
        if (isProd) {
            if (!process.stdin.isTTY && !testMode) {
                throw new Error('[FATAL SECURITY] Production reconciliation requires an interactive TTY. Automated execution prohibited.');
            }

            console.log(`\n⚠️  RECOVERY CONFIRMATION REQUIRED ⚠️`);
            console.log(`Database: ${currentDb}`);
            console.log(`Action:   ${action}`);
            console.log(`Type 'CONFIRM_RECOVERY' to proceed.`);

            const answer = mockPromptAnswer !== null ? mockPromptAnswer : await promptConfirmation('Confirm: ');
            if (answer !== 'CONFIRM_RECOVERY') {
                throw new Error('[ABORT] Operator declined recovery confirmation.');
            }
        } else if (testMode && mockPromptAnswer !== null) {
            if (mockPromptAnswer !== 'CONFIRM_RECOVERY') {
                throw new Error('[ABORT] Test confirmation mismatch.');
            }
        }

        // 5. Action Execution
        if (action === 'resume') {
            console.log(`[Resume] Applying missing columns (${preCheck.missing.length})...`);
            await migration.up(connection);
        }

        // 6. Assertions (Mandatory for both resume and mark-success!)
        console.log(`[Assertions] Running mandatory integrity assertions...`);
        const assertionResult = await migration.verifyPostAssertions(
            connection,
            baselineResult ? baselineResult.baselineData : null
        );
        console.log(`[Assertions] Assertions passed: ${assertionResult.assertions.length}`);

        // 7. Update to SUCCESS preserving original error_details, execution_id, and checksum
        await connection.query(
            `UPDATE schema_migrations 
             SET status = 'SUCCESS', finished_at = CURRENT_TIMESTAMP, operator_id = ?, recovery_action = ? 
             WHERE version = ?`,
            [operatorId, action.toUpperCase(), version]
        );
        console.log(`[Recovery Complete] Migration ${version} successfully reconciled to SUCCESS (original failure details preserved).\n`);

        return {
            status: 'SUCCESS',
            version,
            action,
            assertions: assertionResult.assertions.length
        };

    } catch (err) {
        console.error(`[Recovery Failure] ${err.message}`);
        throw err;
    } finally {
        if (!customDb && connection && typeof connection.end === 'function') {
            await connection.end();
        }
    }
}

if (require.main === module) {
    const versionArg = process.argv.find(a => a.startsWith('--version='))?.split('=')[1] || '20261110_001_phase4a2';
    const actionArg = process.argv.includes('--mark-success') ? 'mark-success' : 'resume';
    const operatorArg = process.argv.find(a => a.startsWith('--operator-id='))?.split('=')[1] || 'recovery_operator';

    reconcileSchema({ version: versionArg, action: actionArg, operatorId: operatorArg })
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { reconcileSchema };
