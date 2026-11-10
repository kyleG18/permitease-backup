#!/usr/bin/env node
/**
 * PermitEase — Read-Only Schema Diagnosis Tool
 * 
 * Inspects active schema state, checks schema_migrations tracking status,
 * categorizes columns as COMPLIANT, MISSING, or CONFLICTING, and verifies
 * data preservation without executing any modifications.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const migration = require('./20261110_001_phase4a2');
const { computeAllFingerprints } = require('./tlv_serializer');
const { isValidSha256 } = require('./run_migration');

async function diagnoseSchema(customDb = null) {
    const connection = customDb || db;
    console.log(`\n================ SCHEMA DIAGNOSTIC INSPECTION ================`);

    try {
        const [[dbRow]] = await connection.query('SELECT DATABASE() AS current_db');
        console.log(`Connected Database: ${dbRow.current_db}`);

        // 1. Check schema_migrations and verify checksum identity
        const [hasTracking] = await connection.query("SHOW TABLES LIKE 'schema_migrations'");
        let checksumStatus = [];
        let records = [];
        if (hasTracking.length === 0) {
            console.log(`Tracking Table (schema_migrations): NOT CREATED`);
        } else {
            const [rows] = await connection.query('SELECT * FROM schema_migrations ORDER BY id DESC');
            records = rows;
            console.log(`Tracking Table (schema_migrations): FOUND (${records.length} records)`);
            console.table(records);

            console.log(`\n--- Checksum Identity Verification ---`);
            for (const rec of records) {
                const scriptFilename = `${rec.version}.js`;
                const scriptPath = path.join(__dirname, scriptFilename);
                if (!fs.existsSync(scriptPath)) {
                    console.warn(`[CHECKSUM WARNING] Migration script "${scriptFilename}" not found on disk.`);
                    checksumStatus.push({
                        version: rec.version,
                        storedChecksum: rec.checksum,
                        diskChecksum: 'FILE_NOT_FOUND',
                        match: false
                    });
                } else {
                    let diskHash = null;
                    try {
                        const content = fs.readFileSync(scriptPath);
                        diskHash = crypto.createHash('sha256').update(content).digest('hex');
                    } catch (e) {
                        diskHash = `UNREADABLE: ${e.message}`;
                    }
                    const isStoredValid = isValidSha256(rec.checksum);
                    const isDiskValid = isValidSha256(diskHash);
                    const match = isStoredValid && isDiskValid && diskHash.toLowerCase() === rec.checksum.toLowerCase();
                    checksumStatus.push({
                        version: rec.version,
                        storedChecksum: rec.checksum,
                        diskChecksum: diskHash,
                        isStoredValid,
                        isDiskValid,
                        match
                    });
                    if (!isStoredValid) {
                        console.warn(`[CHECKSUM WARNING] Version ${rec.version} database record has invalid/missing checksum ("${rec.checksum}")!`);
                    } else if (!match) {
                        console.warn(`[CHECKSUM MISMATCH WARNING] Version ${rec.version} disk checksum (${diskHash}) DOES NOT MATCH database record (${rec.checksum})!`);
                    } else {
                        console.log(`[Checksum OK] Version ${rec.version} file checksum matches database record.`);
                    }
                }
            }
        }

        // 2. Pre-schema verification for target columns
        console.log(`\n--- Target Columns Assessment ---`);
        const preCheck = await migration.verifyPreSchema(connection);
        console.log(`Pre-check Compliant: ${preCheck.compliant}`);
        console.log(`Existing Compliant Columns: ${preCheck.existing.length}`);
        console.log(`Missing Columns:            ${preCheck.missing.length}`);
        console.log(`Conflicting Columns:        ${preCheck.conflicts.length}`);

        if (preCheck.conflicts.length > 0) {
            console.error(`Conflicts detected:`, preCheck.conflicts);
        }

        // 3. Current Live Fingerprints
        console.log(`\n--- Live TLV Fingerprints ---`);
        const fingerprints = await computeAllFingerprints(connection);
        console.table(fingerprints);

        return {
            database: dbRow.current_db,
            hasTrackingTable: hasTracking.length > 0,
            records,
            checksumStatus,
            preCheck,
            fingerprints
        };
    } catch (err) {
        console.error(`[Diagnosis Error] Failed to diagnose schema:`, err.message);
        throw err;
    } finally {
        if (!customDb && connection && typeof connection.end === 'function') {
            await connection.end();
        }
    }
}

if (require.main === module) {
    diagnoseSchema()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { diagnoseSchema };
