#!/usr/bin/env node
/**
 * PermitEase — Baseline Generation CLI
 * Generates signed baseline JSON from the connected database.
 */

require('dotenv').config();
const path = require('path');
const db = require('../config/db');
const { generateBaseline } = require('./baseline_manager');

async function main() {
    const version = process.argv.find(arg => arg.startsWith('--version='))?.split('=')[1] || '20261110_001_phase4a2';
    const secret = process.env.BASELINE_HMAC_SECRET;

    if (!secret) {
        console.error('[FATAL] BASELINE_HMAC_SECRET environment variable is missing.');
        console.error('Provide BASELINE_HMAC_SECRET in your environment before generating baseline.');
        process.exit(1);
    }

    try {
        console.log(`[Baseline Generator] Computing canonical TLV baseline for version: ${version}...`);
        const result = await generateBaseline(db, {
            migrationVersion: version,
            hmacSecret: secret,
            dbInfo: {
                database: process.env.DB_NAME || 'smartpermit_db',
                host: process.env.DB_HOST || '127.0.0.1',
                port: process.env.DB_PORT || 3306
            }
        });

        console.log(`[Baseline Generator] Baseline written successfully:`);
        console.log(`  JSON: ${result.baselinePath}`);
        console.log(`  SIG:  ${result.sigPath}`);
        console.log(`  Tables fingerprinted: ${Object.keys(result.baselineData.tables).join(', ')}`);
    } catch (err) {
        console.error('[Baseline Generator] Generation failed:', err.message);
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
