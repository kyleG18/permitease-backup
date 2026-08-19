const db = require('./config/db');
const bcrypt = require('bcryptjs');

const resetAdmin = async () => {
    try {
        const password = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        
        await db.query(
            'UPDATE users SET password = ?, role = "system_admin", status = "active" WHERE email = ?',
            [hash, 'admin@bizcheckpermit.gov.ph']
        );
        console.log('Successfully reset admin password to: ' + password);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

resetAdmin();
