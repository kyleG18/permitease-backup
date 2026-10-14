const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function syncUsers() {
  const db = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'smartpermit_db'});
  
  const adminHash = bcrypt.hashSync('Admin@12345', 10);
  const kyleHash = bcrypt.hashSync('Kyle@12345', 10);

  // 1. System Admin
  await db.query(`
    INSERT INTO users (full_name, email, password, role, status) 
    VALUES ('System Administrator', 'sysadmin@bizcheckpermit.gov.ph', ?, 'system_admin', 'active')
    ON DUPLICATE KEY UPDATE password = ?, role = 'system_admin', status = 'active'
  `, [adminHash, adminHash]);

  // 2. LGU Admin
  await db.query(`
    INSERT INTO users (full_name, email, password, role, status) 
    VALUES ('LGU Admin', 'admin@bizcheckpermit.gov.ph', ?, 'lgu_admin', 'active')
    ON DUPLICATE KEY UPDATE password = ?, role = 'lgu_admin', status = 'active'
  `, [adminHash, adminHash]);

  // 3. MSME (Kyle)
  await db.query(`
    INSERT INTO users (full_name, email, password, role, status) 
    VALUES ('Kyle Gacula', 'kyle21023@gmail.com', ?, 'business_owner', 'active')
    ON DUPLICATE KEY UPDATE password = ?, role = 'business_owner', status = 'active'
  `, [kyleHash, kyleHash]);

  console.log('Local credentials synced successfully!');
  await db.end();
}
syncUsers().catch(console.error);
