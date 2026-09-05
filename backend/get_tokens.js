require('dotenv').config();
const db = require('./config/db');
const jwt = require('jsonwebtoken');

(async () => {
  // Get one business_owner with a business profile set up
  const [bizOwners] = await db.query(`
    SELECT u.id, u.full_name, u.email, u.role, u.status
    FROM users u
    INNER JOIN businesses b ON b.user_id = u.id
    WHERE u.role = 'business_owner' AND u.status = 'active'
    LIMIT 1
  `);

  // Get lgu_admin
  const [lguAdmins] = await db.query(`
    SELECT id, full_name, email, role, status FROM users 
    WHERE role = 'lgu_admin' AND status = 'active' 
    LIMIT 1
  `);

  // Get system_admin (the main one)
  const [sysAdmins] = await db.query(`
    SELECT id, full_name, email, role, status FROM users 
    WHERE email = 'admin@bizcheckpermit.gov.ph'
    LIMIT 1
  `);

  const makeToken = (user) => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });

  const result = {
    business_owner: bizOwners[0] ? { ...bizOwners[0], token: makeToken(bizOwners[0]) } : null,
    lgu_admin: lguAdmins[0] ? { ...lguAdmins[0], token: makeToken(lguAdmins[0]) } : null,
    system_admin: sysAdmins[0] ? { ...sysAdmins[0], token: makeToken(sysAdmins[0]) } : null,
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
