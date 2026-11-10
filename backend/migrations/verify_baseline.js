#!/usr/bin/env node
/**
 * PermitEase — Baseline Verification CLI
 * Verifies signed baseline JSON against HMAC secret and active database state.
 */

require('dotenv').config();
const db = require('../config/db');
const { verifyBaseline } = require('./baseline_manager');

async function main() {
    const version = process.argv.find(arg => arg.startsWith('--version='))?.split('=')[1] || '20261110_001_phase4a2';
    const secret = process.env.BASELINE_HMAC_SECRET;

    if (!secret) {
        console.error('[FATAL] BASELINE_HMAC_SECRET environment variable is missing.');
        process.exit(1);
    }

    try {
        console.log(`[Baseline Verifier] Verifying baseline for version: ${version}...`);
        const result = await verifyBaseline(db, {
            migrationVersion: version,
            hmacSecret: secret,
            assertAgainstDatabase: true
        });

        if (!result.valid) {
            console.error(`[Baseline Verifier] VERIFICATION FAILED: ${result.reason}`);
            if (result.table) {
                console.error(`  Table: ${result.table}`);
                console.error(`  Expected: ${result.expected}`);
                console.error(`  Actual:   ${result.actual}`);
            }
            process.exit(1);
        }

        console.log(`[Baseline Verifier] VERIFICATION PASSED. All baseline tables and signatures match 100%.`);
    } catch (err) {
        console.error('[Baseline Verifier] Error:', err.message);
        process.exit(1);
    } finally {
        if (db && typeof db.end === 'function') {
            await db.end();
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = main;
