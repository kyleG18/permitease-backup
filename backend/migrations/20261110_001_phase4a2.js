/**
 * PermitEase — Migration 20261110_001_phase4a2
 * 
 * Target Schema Expansions:
 * 1. knowledge_base: document_key, category, legal_basis, provision_section,
 *    issuing_authority, source_url, content, status, verification_status,
 *    is_manually_curated, effective_date, verified_by, last_verified_at.
 * 2. permit_requirements: requirement_code, is_advisory, requires_lgu_review, verification_status.
 * 3. business_requirements: applicability_type (NULL DEFAULT NULL), applicability_reason (NULL).
 */

const { TABLE_SPECS, computeTableFingerprint } = require('./tlv_serializer');

const VERSION = '20261110_001_phase4a2';
const DESCRIPTION = 'Phase 4A.2 Regulatory Knowledge-Base & Applicability Schema Expansion';

// Expected column additions and specifications
const TARGET_COLUMNS = {
    knowledge_base: [
        { name: 'document_key', type: 'varchar(100)', null: 'YES', default: null, unique: true },
        { name: 'category', type: 'varchar(100)', null: 'YES', default: null },
        { name: 'legal_basis', type: 'varchar(255)', null: 'YES', default: null },
        { name: 'provision_section', type: 'varchar(100)', null: 'YES', default: null },
        { name: 'issuing_authority', type: 'varchar(150)', null: 'YES', default: null },
        { name: 'source_url', type: 'varchar(500)', null: 'YES', default: null },
        { name: 'content', type: 'text', null: 'YES', default: null },
        { name: 'status', type: "enum('DRAFT','PUBLISHED','ARCHIVED')", null: 'NO', default: "'DRAFT'" },
        { name: 'verification_status', type: "enum('VERIFIED','UNVERIFIED','FLAGGED')", null: 'NO', default: "'UNVERIFIED'" },
        { name: 'is_manually_curated', type: 'tinyint(1)', null: 'NO', default: '0' },
        { name: 'effective_date', type: 'date', null: 'YES', default: null },
        { name: 'verified_by', type: 'int', null: 'YES', default: null },
        { name: 'last_verified_at', type: 'timestamp', null: 'YES', default: null }
    ],
    permit_requirements: [
        { name: 'requirement_code', type: 'varchar(100)', null: 'YES', default: null, unique: true },
        { name: 'is_advisory', type: 'tinyint(1)', null: 'NO', default: '0' },
        { name: 'requires_lgu_review', type: 'tinyint(1)', null: 'NO', default: '0' },
        { name: 'verification_status', type: "enum('verified','unverified')", null: 'NO', default: "'unverified'" }
    ],
    business_requirements: [
        { name: 'applicability_type', type: "enum('REQUIRED','CONDITIONAL','OPTIONAL','EXEMPT')", null: 'YES', default: null },
        { name: 'applicability_reason', type: 'varchar(255)', null: 'YES', default: null }
    ]
};

/**
 * Validates pre-migration schema: target columns must NOT exist, or if they exist, must match spec.
 */
async function verifyPreSchema(connection) {
    const report = { compliant: true, conflicts: [], existing: [], missing: [] };

    for (const [table, cols] of Object.entries(TARGET_COLUMNS)) {
        const [existing] = await connection.query(
            'SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
            [table]
        );
        const existingMap = new Map(existing.map(c => [c.COLUMN_NAME.toLowerCase(), c]));

        for (const target of cols) {
            const col = existingMap.get(target.name.toLowerCase());
            if (col) {
                // Check if compatible
                const typeMatches = col.COLUMN_TYPE.toLowerCase() === target.type.toLowerCase();
                const nullMatches = col.IS_NULLABLE === target.null;
                if (!typeMatches || !nullMatches) {
                    report.compliant = false;
                    report.conflicts.push({
                        table,
                        column: target.name,
                        expected: target,
                        actual: col
                    });
                } else {
                    report.existing.push({ table, column: target.name });
                }
            } else {
                report.missing.push({ table, column: target.name });
            }
        }
    }

    return report;
}

/**
 * Executes migration DDL.
 */
async function up(connection) {
    // Prevent long locks from hanging application
    await connection.query('SET SESSION lock_wait_timeout = 10');

    // 1. knowledge_base
    const [kbCols] = await connection.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'knowledge_base'"
    );
    const kbSet = new Set(kbCols.map(c => c.COLUMN_NAME.toLowerCase()));

    for (const col of TARGET_COLUMNS.knowledge_base) {
        if (!kbSet.has(col.name.toLowerCase())) {
            let sql = `ALTER TABLE \`knowledge_base\` ADD COLUMN \`${col.name}\` ${col.type}`;
            if (col.null === 'NO') sql += ' NOT NULL';
            else sql += ' NULL';
            if (col.default !== null) sql += ` DEFAULT ${col.default}`;
            else sql += ' DEFAULT NULL';
            if (col.unique) sql += ' UNIQUE';

            await connection.query(sql);
        }
    }

    // 2. permit_requirements
    const [prCols] = await connection.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permit_requirements'"
    );
    const prSet = new Set(prCols.map(c => c.COLUMN_NAME.toLowerCase()));

    for (const col of TARGET_COLUMNS.permit_requirements) {
        if (!prSet.has(col.name.toLowerCase())) {
            let sql = `ALTER TABLE \`permit_requirements\` ADD COLUMN \`${col.name}\` ${col.type}`;
            if (col.null === 'NO') sql += ' NOT NULL';
            else sql += ' NULL';
            if (col.default !== null) sql += ` DEFAULT ${col.default}`;
            else sql += ' DEFAULT NULL';
            if (col.unique) sql += ' UNIQUE';

            await connection.query(sql);
        }
    }

    // 3. business_requirements
    const [brCols] = await connection.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_requirements'"
    );
    const brSet = new Set(brCols.map(c => c.COLUMN_NAME.toLowerCase()));

    for (const col of TARGET_COLUMNS.business_requirements) {
        if (!brSet.has(col.name.toLowerCase())) {
            let sql = `ALTER TABLE \`business_requirements\` ADD COLUMN \`${col.name}\` ${col.type}`;
            if (col.null === 'NO') sql += ' NOT NULL';
            else sql += ' NULL';
            sql += ' DEFAULT NULL';

            await connection.query(sql);
        }
    }
}

/**
 * Reverts migration DDL.
 */
async function down(connection) {
    await connection.query('SET SESSION lock_wait_timeout = 10');

    for (const col of TARGET_COLUMNS.business_requirements) {
        const [exists] = await connection.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_requirements' AND COLUMN_NAME = ?",
            [col.name]
        );
        if (exists.length > 0) {
            await connection.query(`ALTER TABLE \`business_requirements\` DROP COLUMN \`${col.name}\``);
        }
    }

    for (const col of TARGET_COLUMNS.permit_requirements) {
        const [exists] = await connection.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permit_requirements' AND COLUMN_NAME = ?",
            [col.name]
        );
        if (exists.length > 0) {
            await connection.query(`ALTER TABLE \`permit_requirements\` DROP COLUMN \`${col.name}\``);
        }
    }

    for (const col of TARGET_COLUMNS.knowledge_base) {
        const [exists] = await connection.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'knowledge_base' AND COLUMN_NAME = ?",
            [col.name]
        );
        if (exists.length > 0) {
            await connection.query(`ALTER TABLE \`knowledge_base\` DROP COLUMN \`${col.name}\``);
        }
    }
}

/**
 * Runs all mandatory post-migration assertions.
 * @param {object} connection Active mysql2 connection
 * @param {object} expectedBaseline Baseline object containing pre-migration fingerprints
 */
async function verifyPostAssertions(connection, expectedBaseline) {
    const assertions = [];

    // 1. Assert applicability_type IS NOT NULL count === 0
    const [brCheck] = await connection.query(
        "SELECT COUNT(*) AS cnt FROM `business_requirements` WHERE `applicability_type` IS NOT NULL"
    );
    const nonNullBr = brCheck[0].cnt;
    if (nonNullBr !== 0) {
        throw new Error(`[Assertion Failure] business_requirements.applicability_type has ${nonNullBr} non-NULL rows. Expected 0.`);
    }
    assertions.push({ assertion: 'applicability_type_all_null', passed: true });

    // 2. Assert knowledge_base.document_key IS NOT NULL count === 0
    const [kbCheck] = await connection.query(
        "SELECT COUNT(*) AS cnt FROM `knowledge_base` WHERE `document_key` IS NOT NULL"
    );
    const nonNullKb = kbCheck[0].cnt;
    if (nonNullKb !== 0) {
        throw new Error(`[Assertion Failure] knowledge_base.document_key has ${nonNullKb} non-NULL rows. Expected 0.`);
    }
    assertions.push({ assertion: 'document_key_all_null', passed: true });

    // 3. Assert historical row fingerprints match baseline 100%
    if (expectedBaseline && expectedBaseline.tables) {
        for (const [table, spec] of Object.entries(expectedBaseline.tables)) {
            const live = await computeTableFingerprint(connection, table, TABLE_SPECS[table]);
            if (live.rowCount !== spec.rowCount) {
                throw new Error(`[Assertion Failure] Row count mismatch on ${table}: expected ${spec.rowCount}, found ${live.rowCount}`);
            }
            if (live.fingerprint !== spec.sha256) {
                throw new Error(`[Assertion Failure] TLV fingerprint mismatch on ${table} post-DDL! Historical data was modified.`);
            }
            assertions.push({ assertion: `fingerprint_preservation_${table}`, passed: true });
        }
    }

    // 4. Assert all target columns now exist in schema
    const preCheck = await verifyPreSchema(connection);
    if (preCheck.conflicts.length > 0 || preCheck.missing.length > 0) {
        throw new Error(`[Assertion Failure] Schema is not 100% compliant after DDL: missing ${preCheck.missing.length}, conflicts ${preCheck.conflicts.length}`);
    }
    assertions.push({ assertion: 'all_target_columns_exist_and_compliant', passed: true });

    return {
        passed: true,
        assertions
    };
}

module.exports = {
    VERSION,
    DESCRIPTION,
    TARGET_COLUMNS,
    verifyPreSchema,
    up,
    down,
    verifyPostAssertions
};
