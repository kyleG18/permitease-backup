/**
 * Test Database Safety Guard
 * 
 * Protects production and development databases from accidental data writes
 * during automated testing.
 * 
 * Strict requirement:
 * - Validates the database name on the ACTIVE connection using `SELECT DATABASE()`.
 * - Requires an explicit database name matching prefix `smartpermit_test_`.
 * - If the active database is missing, null, or does not start with `smartpermit_test_`,
 *   aborts immediately with a fatal error.
 */

const REQUIRED_PREFIX = 'smartpermit_test_';

/**
 * Asserts that the provided database connection is connected to a dedicated,
 * disposable test database matching the strict prefix `smartpermit_test_`.
 * 
 * @param {Object} dbConnection - Active mysql2/promise connection or pool
 * @returns {Promise<string>} The verified test database name
 */
async function assertTestDatabase(dbConnection) {
    if (!dbConnection || typeof dbConnection.query !== 'function') {
        throw new Error('[TEST DB GUARD FATAL] Invalid database connection object provided to guard.');
    }

    const [[row]] = await dbConnection.query('SELECT DATABASE() AS active_db');
    const activeDb = row ? row.active_db : null;

    if (!activeDb) {
        const errorMsg = `[TEST DB GUARD FATAL] No active database selected on connection! Destructive tests require an explicit disposable database with prefix "${REQUIRED_PREFIX}". Aborting immediately to protect system integrity.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    if (!activeDb.startsWith(REQUIRED_PREFIX)) {
        const errorMsg = `[TEST DB GUARD FATAL] Unsafe database "${activeDb}" detected on active connection! Destructive test suites MUST NEVER run against production or default development databases. Expected prefix: "${REQUIRED_PREFIX}". Set DB_NAME=smartpermit_test_<name> before running this test. Aborting immediately.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    return activeDb;
}

module.exports = { assertTestDatabase, REQUIRED_PREFIX };
