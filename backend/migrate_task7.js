const db = require('./config/db');

const migrate = async () => {
    try {
        console.log('Starting Task 7 Database Migrations...');

        // Add event_key for duplicate-notification protection
        await db.query(`ALTER TABLE notifications ADD COLUMN event_key VARCHAR(200) NULL`).catch(e => {
            if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
                console.log('event_key column already exists.');
            } else { console.log('Notice on event_key:', e.message); }
        });

        // Add UNIQUE index on event_key
        await db.query(`ALTER TABLE notifications ADD UNIQUE KEY uk_notification_event (event_key)`).catch(e => {
            if (e.message.includes('Duplicate key') || e.message.includes('Duplicate entry') || e.code === 'ER_DUP_KEYNAME') {
                console.log('event_key unique index already exists.');
            } else { console.log('Notice on unique index:', e.message); }
        });

        // Add type column for categorization
        await db.query(`ALTER TABLE notifications ADD COLUMN type VARCHAR(50) NULL`).catch(e => {
            if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
                console.log('type column already exists.');
            } else { console.log('Notice on type:', e.message); }
        });

        // Add related_application_id
        await db.query(`ALTER TABLE notifications ADD COLUMN related_application_id INT NULL`).catch(e => {
            if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
                console.log('related_application_id column already exists.');
            } else { console.log('Notice on related_application_id:', e.message); }
        });

        // Add related_permit_id
        await db.query(`ALTER TABLE notifications ADD COLUMN related_permit_id INT NULL`).catch(e => {
            if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
                console.log('related_permit_id column already exists.');
            } else { console.log('Notice on related_permit_id:', e.message); }
        });

        // Add email_sent
        await db.query(`ALTER TABLE notifications ADD COLUMN email_sent TINYINT(1) NOT NULL DEFAULT 0`).catch(e => {
            if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
                console.log('email_sent column already exists.');
            } else { console.log('Notice on email_sent:', e.message); }
        });

        // Add email_sent_at
        await db.query(`ALTER TABLE notifications ADD COLUMN email_sent_at DATETIME NULL`).catch(e => {
            if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
                console.log('email_sent_at column already exists.');
            } else { console.log('Notice on email_sent_at:', e.message); }
        });

        console.log('✅ Migrations for Task 7 completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migrate();
