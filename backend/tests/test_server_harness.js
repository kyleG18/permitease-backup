const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
const { assertTestDatabase, REQUIRED_PREFIX } = require('./test_db_guard');

const RESTORE_BASE_DB = 'smartpermit_restore_test_20261109145038_453';

/**
 * Creates and seeds a dedicated disposable test sandbox database.
 */
async function provisionSandboxDatabase(sandboxDbName) {
    if (!sandboxDbName || !sandboxDbName.startsWith(REQUIRED_PREFIX) || sandboxDbName === 'smartpermit_db') {
        throw new Error(`[TEST HARNESS FATAL] Invalid sandbox database name "${sandboxDbName}". Must start with "${REQUIRED_PREFIX}".`);
    }

    const rootConn = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : ''
    });

    try {
        await rootConn.query(`DROP DATABASE IF EXISTS \`${sandboxDbName}\``);
        await rootConn.query(`CREATE DATABASE \`${sandboxDbName}\``);

        // Clone all baseline tables
        const [tables] = await rootConn.query(`SHOW TABLES FROM \`${RESTORE_BASE_DB}\``);
        for (const t of tables) {
            const tblName = Object.values(t)[0];
            await rootConn.query(`CREATE TABLE \`${sandboxDbName}\`.\`${tblName}\` LIKE \`${RESTORE_BASE_DB}\`.\`${tblName}\``);
            await rootConn.query(`INSERT INTO \`${sandboxDbName}\`.\`${tblName}\` SELECT * FROM \`${RESTORE_BASE_DB}\`.\`${tblName}\``);
        }

        // Initialize known test credentials for LGU Admin and System Admin in the isolated sandbox
        const adminHash = await bcrypt.hash('Admin@12345', 10);
        await rootConn.query(`
            INSERT INTO \`${sandboxDbName}\`.\`users\` (full_name, email, password, role, status)
            VALUES ('LGU Admin', 'admin@bizcheckpermit.gov.ph', ?, 'lgu_admin', 'active')
            ON DUPLICATE KEY UPDATE password = VALUES(password), role = 'lgu_admin', status = 'active'
        `, [adminHash]);

        await rootConn.query(`
            INSERT INTO \`${sandboxDbName}\`.\`users\` (full_name, email, password, role, status)
            VALUES ('System Administrator', 'sysadmin@bizcheckpermit.gov.ph', ?, 'system_admin', 'active')
            ON DUPLICATE KEY UPDATE password = VALUES(password), role = 'system_admin', status = 'active'
        `, [adminHash]);

        return { sandboxDbName, tableCount: tables.length };
    } finally {
        await rootConn.end();
    }
}

/**
 * Drops a disposable test sandbox database.
 */
async function dropSandboxDatabase(sandboxDbName) {
    if (!sandboxDbName || !sandboxDbName.startsWith(REQUIRED_PREFIX) || sandboxDbName === 'smartpermit_db') {
        throw new Error(`[TEST HARNESS FATAL] Refusing to drop database "${sandboxDbName}". Safety violation.`);
    }

    const rootConn = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : ''
    });

    try {
        await rootConn.query(`DROP DATABASE IF EXISTS \`${sandboxDbName}\``);
    } finally {
        await rootConn.end();
    }
}

/**
 * Clears cached backend application modules to ensure fresh configuration.
 */
function clearBackendModuleCache() {
    const backendRoot = path.resolve(__dirname, '..');
    Object.keys(require.cache).forEach(key => {
        if (key.startsWith(backendRoot) && !key.includes('node_modules')) {
            delete require.cache[key];
        }
    });
}

/**
 * Starts an isolated Express HTTP test server connected exclusively to the verified sandbox.
 */
async function startIsolatedServer(sandboxDbName, options = {}) {
    // 1. Strict name guard
    if (!sandboxDbName || !sandboxDbName.startsWith(REQUIRED_PREFIX) || sandboxDbName === 'smartpermit_db') {
        throw new Error(`[ISOLATED SERVER FATAL] Refusing to start test server: database "${sandboxDbName}" is not an authorized test sandbox.`);
    }

    // 2. Set environment variables
    process.env.DB_NAME = sandboxDbName;
    process.env.SKIP_MIGRATION_CHECK = 'true';
    process.env.NODE_ENV = 'test';
    if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = 'test_jwt_secret_permitease_isolated_server';
    }

    // 3. Clear cache so db.js initializes with fresh process.env.DB_NAME
    clearBackendModuleCache();

    // 4. Require the database pool and strictly assert active database
    const db = require('../config/db');
    const activeDb = await assertTestDatabase(db);

    if (activeDb !== sandboxDbName) {
        throw new Error(`[ISOLATED SERVER FATAL] Active database mismatch: expected "${sandboxDbName}", got "${activeDb}".`);
    }

    // 5. Require app and listen on ephemeral port (0 = OS assigns free port)
    const { app } = require('../server');
    const serverPort = options.port || 0;

    const server = app.listen(serverPort, '127.0.0.1');
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });

    const boundPort = server.address().port;
    const apiBase = `http://127.0.0.1:${boundPort}/api`;

    return {
        server,
        port: boundPort,
        apiBase,
        db,
        activeDb,
        close: async () => {
            await new Promise(resolve => server.close(resolve));
            try {
                if (db && typeof db.end === 'function') {
                    await db.end();
                }
            } catch (err) {
                // Ignore pool closing errors
            }
        }
    };
}

module.exports = {
    provisionSandboxDatabase,
    dropSandboxDatabase,
    startIsolatedServer,
    REQUIRED_PREFIX
};
