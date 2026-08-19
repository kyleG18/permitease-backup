/**
 * Migration: Create applications and application_history tables
 * Run with: node migrate_applications.js
 */
const db = require('./config/db');

async function migrate() {
    console.log('Running applications migration...');
    
    try {
        // 1. Create applications table
        await db.query(`
            CREATE TABLE IF NOT EXISTS applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_number VARCHAR(100) UNIQUE NULL,
                user_id INT NOT NULL,
                business_id INT NOT NULL,
                application_type ENUM('NEW','RENEWAL') NOT NULL DEFAULT 'NEW',
                status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','NEEDS_CORRECTION','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
                submitted_at TIMESTAMP NULL,
                reviewed_at TIMESTAMP NULL,
                reviewed_by INT NULL,
                rejection_reason TEXT NULL,
                correction_notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
                FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✓ applications table created (or already exists)');

        // 2. Create application_history table
        await db.query(`
            CREATE TABLE IF NOT EXISTS application_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_id INT NOT NULL,
                actor_user_id INT NOT NULL,
                action VARCHAR(255) NOT NULL,
                old_status VARCHAR(50) NULL,
                new_status VARCHAR(50) NULL,
                remarks TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
                FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✓ application_history table created (or already exists)');

        console.log('\nMigration complete!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
