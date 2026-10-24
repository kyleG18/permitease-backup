const mysql = require('mysql2');
require('dotenv').config();

// Auto-detect Railway MySQL variables (MYSQL_URL, DATABASE_URL, MYSQLHOST, etc.)
const host = process.env.DB_HOST || process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost';
const user = process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER || 'root';
const password = process.env.DB_PASSWORD !== undefined 
    ? process.env.DB_PASSWORD 
    : (process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '');
const database = process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'smartpermit_db';
const port = parseInt(process.env.DB_PORT || process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306', 10);

const connectionConfig = (process.env.MYSQL_URL || process.env.DATABASE_URL)
    ? { uri: process.env.MYSQL_URL || process.env.DATABASE_URL }
    : { host, user, password, database, port };

const pool = mysql.createPool({
    ...connectionConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Convert pool to use promises
const promisePool = pool.promise();

// Startup connection verification
promisePool.query('SELECT 1')
    .then(() => {
        console.log(`[Database] Connected successfully to MySQL (${host}:${port}/${database})`);
    })
    .catch((err) => {
        console.error('[Database] Connection check failed:', err.message);
    });

module.exports = promisePool;
