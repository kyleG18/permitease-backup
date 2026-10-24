const db = require('./config/db');
const bcrypt = require('bcryptjs');

const resetAdmin = async () => {
    try {
        // Read password from environment variable - fail if not set
        const password = process.env.ADMIN_RESET_PASSWORD;
        if (!password) {
            console.error('ADMIN_RESET_PASSWORD environment variable must be set');
            process.exit(1);
        }
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        
        await db.query(
            'UPDATE users SET password = ?, role = "system_admin", status = "active" WHERE email = ?',
            [hash, 'admin@bizcheckpermit.gov.ph']
        );
        console.log('Successfully reset admin password');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

resetAdmin();
