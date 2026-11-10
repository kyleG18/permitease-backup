/**
 * PermitEase — Baseline Manager
 * 
 * Handles generation, signing (HMAC-SHA256), and verification of pre-migration
 * database state baselines.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { TLV_VERSION, TABLE_SPECS, computeAllFingerprints } = require('./tlv_serializer');

const PHASE4A1_BACKUP_REFERENCE = {
    filename: 'pre_phase4_logical_backup_20261109145038.sql',
    sha256: '937dca7401c910b9e16d254e82c8ba0920df75047ce7f7534c19801fa037597e',
    byteSize: 2265660
};

/**
 * Computes HMAC-SHA256 signature for a given buffer or string.
 * @param {Buffer|string} data 
 * @param {string} secret 
 * @returns {string} Hex signature
 */
function computeSignature(data, secret) {
    if (!secret || typeof secret !== 'string' || secret.length < 16) {
        throw new Error('[Baseline Error] Valid HMAC secret (minimum 16 chars) is required.');
    }
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    return hmac.digest('hex');
}

/**
 * Generates the baseline object, computes fingerprints, writes JSON and .sig.
 */
async function generateBaseline(connection, {
    migrationVersion = '20261110_001_phase4a2',
    hmacSecret,
    outputDir,
    dbInfo = {}
}) {
    if (!hmacSecret) {
        throw new Error('[Baseline Error] hmacSecret must be provided for baseline generation.');
    }

    const fingerprints = await computeAllFingerprints(connection);

    const baselineData = {
        metadata: {
            format_version: TLV_VERSION,
            migration_version: migrationVersion,
            created_at: new Date().toISOString(),
            database: {
                name: dbInfo.database || 'smartpermit_db',
                host: dbInfo.host || '127.0.0.1',
                port: dbInfo.port || 3306
            },
            backup_manifest: PHASE4A1_BACKUP_REFERENCE
        },
        tables: {
            business_requirements: {
                rowCount: fingerprints.business_requirements.rowCount,
                sha256: fingerprints.business_requirements.fingerprint,
                fieldCount: TABLE_SPECS.business_requirements.fields.length
            },
            knowledge_base: {
                rowCount: fingerprints.knowledge_base.rowCount,
                sha256: fingerprints.knowledge_base.fingerprint,
                fieldCount: TABLE_SPECS.knowledge_base.fields.length
            },
            permit_requirements: {
                rowCount: fingerprints.permit_requirements.rowCount,
                sha256: fingerprints.permit_requirements.fingerprint,
                fieldCount: TABLE_SPECS.permit_requirements.fields.length
            }
        }
    };

    const targetDir = outputDir || path.resolve(__dirname, '../../backups/baselines');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const baselineFilename = `baseline_${migrationVersion}.json`;
    const sigFilename = `baseline_${migrationVersion}.sig`;

    const baselinePath = path.join(targetDir, baselineFilename);
    const sigPath = path.join(targetDir, sigFilename);

    const jsonString = JSON.stringify(baselineData, null, 2);
    fs.writeFileSync(baselinePath, jsonString, 'utf8');

    const signature = computeSignature(Buffer.from(jsonString, 'utf8'), hmacSecret);
    fs.writeFileSync(sigPath, signature, 'utf8');

    return {
        baselinePath,
        sigPath,
        baselineData,
        signature
    };
}

/**
 * Verifies the baseline file integrity, signature, and matches with active database state.
 */
async function verifyBaseline(connection, {
    migrationVersion = '20261110_001_phase4a2',
    hmacSecret,
    baselinesDir,
    assertAgainstDatabase = true
}) {
    const targetDir = baselinesDir || path.resolve(__dirname, '../../backups/baselines');
    const baselinePath = path.join(targetDir, `baseline_${migrationVersion}.json`);
    const sigPath = path.join(targetDir, `baseline_${migrationVersion}.sig`);

    if (!fs.existsSync(baselinePath)) {
        return { valid: false, reason: 'BASELINE_FILE_MISSING', path: baselinePath };
    }
    if (!fs.existsSync(sigPath)) {
        return { valid: false, reason: 'SIGNATURE_FILE_MISSING', path: sigPath };
    }

    const jsonContent = fs.readFileSync(baselinePath, 'utf8');
    const storedSig = fs.readFileSync(sigPath, 'utf8').trim();

    let baselineData;
    try {
        baselineData = JSON.parse(jsonContent);
    } catch (parseErr) {
        return { valid: false, reason: 'BASELINE_JSON_MALFORMED', error: parseErr.message };
    }

    if (!hmacSecret) {
        return { valid: false, reason: 'HMAC_SECRET_MISSING' };
    }

    const calculatedSig = computeSignature(Buffer.from(jsonContent, 'utf8'), hmacSecret);
    if (calculatedSig !== storedSig) {
        return { valid: false, reason: 'SIGNATURE_MISMATCH' };
    }

    if (assertAgainstDatabase && connection) {
        const liveFingerprints = await computeAllFingerprints(connection);
        for (const [table, spec] of Object.entries(baselineData.tables)) {
            const live = liveFingerprints[table];
            if (!live) {
                return { valid: false, reason: 'TABLE_MISSING_IN_DATABASE', table };
            }
            if (live.rowCount !== spec.rowCount) {
                return {
                    valid: false,
                    reason: 'ROW_COUNT_MISMATCH',
                    table,
                    expected: spec.rowCount,
                    actual: live.rowCount
                };
            }
            if (live.fingerprint !== spec.sha256) {
                return {
                    valid: false,
                    reason: 'FINGERPRINT_MISMATCH',
                    table,
                    expected: spec.sha256,
                    actual: live.fingerprint
                };
            }
        }
    }

    return {
        valid: true,
        baselineData,
        signature: storedSig
    };
}

module.exports = {
    PHASE4A1_BACKUP_REFERENCE,
    computeSignature,
    generateBaseline,
    verifyBaseline
};
