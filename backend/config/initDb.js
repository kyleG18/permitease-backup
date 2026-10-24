const db = require('./db');
const bcrypt = require('bcryptjs');

const initDatabase = async () => {
    try {
        console.log('[DB Init] Running database health check & auto-initialization...');

        // 1. Ensure users table exists
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                contact_number VARCHAR(50),
                password VARCHAR(255) NOT NULL,
                role ENUM('business_owner', 'lgu_admin', 'system_admin') DEFAULT 'business_owner',
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Ensure audit_logs table exists
        await db.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                user_name VARCHAR(255),
                user_role VARCHAR(50),
                action VARCHAR(255) NOT NULL,
                details TEXT,
                ip_address VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // 3. Ensure default admin user exists
        const adminEmail = 'admin@bizcheckpermit.gov.ph';
        const [existing] = await db.query('SELECT id, role, status FROM users WHERE email = ?', [adminEmail]);

        if (existing.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            await db.query(`
                INSERT INTO users (full_name, email, contact_number, password, role, status)
                VALUES ('System Administrator', ?, '09000000000', ?, 'system_admin', 'active')
            `, [adminEmail, hashedPassword]);
            console.log(`[DB Init] Created default admin account: ${adminEmail} (password: admin123)`);
        } else {
            // Ensure admin is active and has system_admin role
            if (existing[0].role !== 'system_admin' || existing[0].status !== 'active') {
                await db.query(`
                    UPDATE users SET role = 'system_admin', status = 'active' WHERE email = ?
                `, [adminEmail]);
                console.log(`[DB Init] Updated ${adminEmail} to active system_admin`);
            }
        }

        // 4. Ensure email column exists on businesses table if businesses table exists
        try {
            const [tables] = await db.query("SHOW TABLES LIKE 'businesses'");
            if (tables.length > 0) {
                const [cols] = await db.query("SHOW COLUMNS FROM businesses LIKE 'email'");
                if (cols.length === 0) {
                    await db.query("ALTER TABLE businesses ADD COLUMN email VARCHAR(255) NULL AFTER contact_number");
                    console.log("[DB Init] Added email column to businesses table");
                }
            }
        } catch (colErr) {
            // Ignored if table doesn't exist yet
        }

        console.log('[DB Init] Database health check completed successfully.');
    } catch (err) {
        console.error('[DB Init] Database initialization notice:', err.message);
    }
};

module.exports = initDatabase;
