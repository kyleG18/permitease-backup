const db = require('./config/db');

const migrate = async () => {
    try {
        console.log('Starting Task 6 Database Migrations...');

        // Add application_id
        await db.query(`
            ALTER TABLE permits 
            ADD COLUMN application_id INT NULL,
            ADD CONSTRAINT fk_permit_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
            ADD UNIQUE KEY unique_application_permit (application_id);
        `).catch(e => {
            if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_CANT_DROP_FIELD_OR_KEY' || e.message.includes('Duplicate')) {
                console.log('application_id column or key may already exist.');
            } else {
                console.log('Notice on application_id:', e.message);
            }
        });

        // Add verification_code
        await db.query(`
            ALTER TABLE permits 
            ADD COLUMN verification_code VARCHAR(100) NULL,
            ADD UNIQUE KEY unique_verification_code (verification_code);
        `).catch(e => {
             if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_CANT_DROP_FIELD_OR_KEY' || e.message.includes('Duplicate')) {
                console.log('verification_code column or key may already exist.');
            } else {
                console.log('Notice on verification_code:', e.message);
            }
        });

        // Add pdf_path
        await db.query(`
            ALTER TABLE permits 
            ADD COLUMN pdf_path VARCHAR(255) NULL;
        `).catch(e => {
             if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate')) {
                console.log('pdf_path column already exists.');
            } else {
                console.log('Notice on pdf_path:', e.message);
            }
        });

        console.log('✅ Migrations for Task 6 completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migrate();
