/**
 * PermitEase — Canonical TLV Fingerprint Serializer (TLV_CANONICAL_V1)
 * 
 * Provides deterministic, collision-proof binary serialization (injective mapping)
 * for MySQL database records. Driven strictly by column metadata from information_schema.
 */

const crypto = require('crypto');

const TLV_VERSION = 'TLV_CANONICAL_V1';

const TYPE_MARKERS = {
    NULL: 0x00,
    EMPTY_STRING: 0x01,
    INT: 0x02,
    DECIMAL: 0x03,
    STRING: 0x04,
    DATE: 0x05,
    DATETIME: 0x06,
    TIMESTAMP: 0x07,
    BOOLEAN: 0x08
};

const TRAILER_BYTE = 0xEE;

const MAX_LENGTHS = {
    INT: 20,           // Fits 64-bit signed int (-9223372036854775808)
    DECIMAL: 66,       // Fits MySQL max DECIMAL(65, 30)
    STRING: 65535,     // 64 KB limit for TEXT fields in PermitEase baseline
    DATE: 10,          // 'YYYY-MM-DD'
    DATETIME: 19,      // 'YYYY-MM-DD HH:mm:ss'
    TIMESTAMP: 24,     // 'YYYY-MM-DDTHH:mm:ss.sssZ'
    BOOLEAN: 1
};

/**
 * Encodes a single database value using column metadata.
 * @param {*} value The projected value (string, number, boolean, or null)
 * @param {string} colType MySQL data type ('int', 'decimal', 'varchar', 'text', 'enum', 'date', 'datetime', 'timestamp', 'tinyint')
 * @param {number|null} scale Scale for decimal columns
 * @returns {Buffer} Encoded TLV field buffer: [Type 1B][Length 4B][Payload NB]
 */
function encodeField(value, colType, scale = null) {
    if (value === null || value === undefined) {
        const buf = Buffer.alloc(5);
        buf.writeUInt8(TYPE_MARKERS.NULL, 0);
        buf.writeUInt32BE(0, 1);
        return buf;
    }

    const type = colType.toLowerCase();

    // INTEGER / BIGINT
    if (type === 'int' || type === 'bigint') {
        const str = String(value).trim();
        if (!/^-?\d+$/.test(str)) {
            throw new Error(`[TLV Error] Invalid integer value: "${value}" for type ${colType}`);
        }
        const valBuf = Buffer.from(str, 'ascii');
        if (valBuf.length > MAX_LENGTHS.INT) {
            throw new Error(`[TLV Error] Integer string length ${valBuf.length} exceeds maximum ${MAX_LENGTHS.INT}`);
        }
        const buf = Buffer.alloc(5 + valBuf.length);
        buf.writeUInt8(TYPE_MARKERS.INT, 0);
        buf.writeUInt32BE(valBuf.length, 1);
        valBuf.copy(buf, 5);
        return buf;
    }

    // DECIMAL
    if (type === 'decimal') {
        const str = String(value).trim();
        if (scale !== null && scale !== undefined) {
            const regex = new RegExp(`^-?\\d+\\.\\d{${scale}}$`);
            if (!regex.test(str)) {
                throw new Error(`[TLV Error] DECIMAL value "${str}" does not match required scale ${scale}`);
            }
        } else {
            if (!/^-?\d+(\.\d+)?$/.test(str)) {
                throw new Error(`[TLV Error] Invalid decimal format: "${str}"`);
            }
        }
        const valBuf = Buffer.from(str, 'ascii');
        if (valBuf.length > MAX_LENGTHS.DECIMAL) {
            throw new Error(`[TLV Error] DECIMAL string length ${valBuf.length} exceeds maximum ${MAX_LENGTHS.DECIMAL}`);
        }
        const buf = Buffer.alloc(5 + valBuf.length);
        buf.writeUInt8(TYPE_MARKERS.DECIMAL, 0);
        buf.writeUInt32BE(valBuf.length, 1);
        valBuf.copy(buf, 5);
        return buf;
    }

    // BOOLEAN / TINYINT(1)
    if (type === 'tinyint' || type === 'tinyint(1)') {
        const num = (value === 1 || value === true || value === '1') ? 1 : 0;
        const buf = Buffer.alloc(6);
        buf.writeUInt8(TYPE_MARKERS.BOOLEAN, 0);
        buf.writeUInt32BE(1, 1);
        buf.writeUInt8(num, 5);
        return buf;
    }

    // DATE
    if (type === 'date') {
        const str = String(value).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            throw new Error(`[TLV Error] Invalid DATE format: "${str}". Expected YYYY-MM-DD.`);
        }
        const valBuf = Buffer.from(str, 'ascii');
        const buf = Buffer.alloc(5 + 10);
        buf.writeUInt8(TYPE_MARKERS.DATE, 0);
        buf.writeUInt32BE(10, 1);
        valBuf.copy(buf, 5);
        return buf;
    }

    // DATETIME
    if (type === 'datetime') {
        const str = String(value).trim();
        if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
            throw new Error(`[TLV Error] Invalid DATETIME format: "${str}". Expected YYYY-MM-DD HH:mm:ss.`);
        }
        const valBuf = Buffer.from(str, 'ascii');
        const buf = Buffer.alloc(5 + 19);
        buf.writeUInt8(TYPE_MARKERS.DATETIME, 0);
        buf.writeUInt32BE(19, 1);
        valBuf.copy(buf, 5);
        return buf;
    }

    // TIMESTAMP
    if (type === 'timestamp') {
        const str = String(value).trim();
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(str)) {
            throw new Error(`[TLV Error] Invalid TIMESTAMP format: "${str}". Expected UTC ISO-8601.`);
        }
        const valBuf = Buffer.from(str, 'ascii');
        const buf = Buffer.alloc(5 + 24);
        buf.writeUInt8(TYPE_MARKERS.TIMESTAMP, 0);
        buf.writeUInt32BE(24, 1);
        valBuf.copy(buf, 5);
        return buf;
    }

    // STRING (VARCHAR, TEXT, ENUM)
    if (['varchar', 'text', 'enum'].includes(type)) {
        const str = String(value);
        if (str === '') {
            const buf = Buffer.alloc(5);
            buf.writeUInt8(TYPE_MARKERS.EMPTY_STRING, 0);
            buf.writeUInt32BE(0, 1);
            return buf;
        }
        const valBuf = Buffer.from(str, 'utf8');
        if (valBuf.length > MAX_LENGTHS.STRING) {
            throw new Error(`[TLV Error] String byte length ${valBuf.length} exceeds maximum ${MAX_LENGTHS.STRING}`);
        }
        const buf = Buffer.alloc(5 + valBuf.length);
        buf.writeUInt8(TYPE_MARKERS.STRING, 0);
        buf.writeUInt32BE(valBuf.length, 1);
        valBuf.copy(buf, 5);
        return buf;
    }

    throw new Error(`[TLV Error] Unsupported database type: "${colType}"`);
}

/**
 * Encodes a complete row into a canonical record frame.
 * @param {Array<{value: *, colType: string, scale?: number}>} fields Ordered fields
 * @returns {Buffer} [PayloadLen 4B][FieldCount 2B][Field 1]...[Field N][Trailer 0xEE]
 */
function encodeRecord(fields) {
    if (!Array.isArray(fields) || fields.length === 0) {
        throw new Error('[TLV Error] Cannot encode empty record frame.');
    }

    const encodedFields = fields.map(f => encodeField(f.value, f.colType, f.scale));
    const payloadLen = encodedFields.reduce((sum, b) => sum + b.length, 0);

    // Frame: 4B Header + 2B Count + Payload + 1B Trailer
    const frameBytes = 4 + 2 + payloadLen + 1;
    const recordBuf = Buffer.alloc(frameBytes);

    recordBuf.writeUInt32BE(payloadLen + 2 + 1, 0);
    recordBuf.writeUInt16BE(fields.length, 4);

    let offset = 6;
    for (const fBuf of encodedFields) {
        fBuf.copy(recordBuf, offset);
        offset += fBuf.length;
    }
    recordBuf.writeUInt8(TRAILER_BYTE, offset);
    return recordBuf;
}

/**
 * Table Field Definitions for Baseline Fingerprinting
 */
const TABLE_SPECS = {
    business_requirements: {
        tableName: 'business_requirements',
        fields: [
            { name: 'id', colType: 'int', sql: 'id' },
            { name: 'business_id', colType: 'int', sql: 'business_id' },
            { name: 'requirement_id', colType: 'int', sql: 'requirement_id' },
            { name: 'document_id', colType: 'int', sql: 'document_id' },
            { name: 'status', colType: 'enum', sql: 'status' },
            { name: 'remarks', colType: 'text', sql: 'remarks' },
            { name: 'created_at', colType: 'timestamp', sql: "DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.000Z')" },
            { name: 'updated_at', colType: 'timestamp', sql: "DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.000Z')" },
            { name: 'bplo_status', colType: 'enum', sql: 'bplo_status' },
            { name: 'bplo_notes', colType: 'text', sql: 'bplo_notes' },
            { name: 'bplo_verified_at', colType: 'timestamp', sql: "DATE_FORMAT(bplo_verified_at, '%Y-%m-%dT%H:%i:%s.000Z')" },
            { name: 'bplo_verified_by', colType: 'int', sql: 'bplo_verified_by' }
        ]
    },
    knowledge_base: {
        tableName: 'knowledge_base',
        fields: [
            { name: 'id', colType: 'int', sql: 'id' },
            { name: 'title', colType: 'varchar', sql: 'title' },
            { name: 'document_path', colType: 'varchar', sql: 'document_path' },
            { name: 'uploaded_at', colType: 'timestamp', sql: "DATE_FORMAT(uploaded_at, '%Y-%m-%dT%H:%i:%s.000Z')" }
        ]
    },
    permit_requirements: {
        tableName: 'permit_requirements',
        fields: [
            { name: 'id', colType: 'int', sql: 'id' },
            { name: 'permit_name', colType: 'varchar', sql: 'permit_name' },
            { name: 'description', colType: 'text', sql: 'description' },
            { name: 'applicable_business_type', colType: 'varchar', sql: 'applicable_business_type' },
            { name: 'renewal_period', colType: 'varchar', sql: 'renewal_period' },
            { name: 'required_documents', colType: 'text', sql: 'required_documents' },
            { name: 'created_at', colType: 'timestamp', sql: "DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.000Z')" },
            { name: 'condition_field', colType: 'varchar', sql: 'condition_field' },
            { name: 'condition_value', colType: 'varchar', sql: 'condition_value' },
            { name: 'is_mandatory', colType: 'tinyint', sql: 'is_mandatory' },
            { name: 'issuing_agency', colType: 'varchar', sql: 'issuing_agency' },
            { name: 'ordinance_reference', colType: 'varchar', sql: 'ordinance_reference' },
            { name: 'estimated_fee', colType: 'decimal', scale: 2, sql: 'estimated_fee' }
        ]
    }
};

/**
 * Computes the canonical SHA-256 fingerprint for a single table.
 * @param {object} connection Active mysql2 connection or pool
 * @param {string} tableName Name of the table
 * @param {object} tableSpec Specification containing field mappings
 * @returns {Promise<{rowCount: number, fingerprint: string}>}
 */
async function computeTableFingerprint(connection, tableName, tableSpec = TABLE_SPECS[tableName]) {
    if (!tableSpec) {
        throw new Error(`[TLV Error] No table specification found for table "${tableName}"`);
    }

    // Lock session to UTC timezone for consistent TIMESTAMP representation
    await connection.query("SET time_zone = '+00:00'");

    const selectCols = tableSpec.fields.map(f => `${f.sql} AS \`${f.name}\``).join(', ');
    const query = `SELECT ${selectCols} FROM \`${tableName}\` ORDER BY id ASC`;
    const [rows] = await connection.query(query);

    const hash = crypto.createHash('sha256');

    for (const row of rows) {
        const fields = tableSpec.fields.map(f => ({
            value: row[f.name],
            colType: f.colType,
            scale: f.scale
        }));
        const recordBuffer = encodeRecord(fields);
        hash.update(recordBuffer);
    }

    return {
        rowCount: rows.length,
        fingerprint: hash.digest('hex')
    };
}

/**
 * Computes canonical fingerprints for all 3 baseline tables.
 * @param {object} connection Active mysql2 connection or pool
 * @returns {Promise<Object>}
 */
async function computeAllFingerprints(connection) {
    const results = {};
    for (const [key, spec] of Object.entries(TABLE_SPECS)) {
        results[key] = await computeTableFingerprint(connection, key, spec);
    }
    return results;
}

module.exports = {
    TLV_VERSION,
    TYPE_MARKERS,
    TRAILER_BYTE,
    MAX_LENGTHS,
    TABLE_SPECS,
    encodeField,
    encodeRecord,
    computeTableFingerprint,
    computeAllFingerprints
};
