const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
    try {
        console.log('Connecting to MySQL...');
        // Connect to MySQL server (without specifying database initially, just in case)
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true // Crucial for running the whole schema file
        });

        console.log('Connected! Reading schema file...');
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema script...');
        await connection.query(schema);

        console.log('Database schema imported successfully into smartpermit_db!');
        await connection.end();
    } catch (error) {
        console.error('Error importing schema:', error);
    }
}

setupDatabase();
