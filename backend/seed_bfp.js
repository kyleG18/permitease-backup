const mysql = require('mysql2/promise');
mysql.createConnection({host:'localhost',user:'root',database:'smartpermit_db'})
.then(async con => {
  // Remove old BFP rule if any
  await con.query("DELETE FROM tax_fee_rules WHERE name LIKE '%Fire Safety%' OR name LIKE '%BFP%'");

  // Insert BFP FSIC rule
  await con.query(`
    INSERT INTO tax_fee_rules (name, description, category, basis, rate, fixed_amount, condition_field, condition_value, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'BFP Fire Safety Inspection Fee',
    'Bureau of Fire Protection FSIC fee: 15% of applicable LGU fees, minimum ₱500. Per BFP Citizen\'s Charter and Roxas LGU requirements.',
    'Fire Safety Fee',
    'bfp_fsic',
    0.15,
    500.00,
    'always',
    '',
    1
  ]);

  console.log('BFP FSIC rule inserted.');
  const [rules] = await con.query('SELECT id, name, basis, rate, fixed_amount FROM tax_fee_rules WHERE is_active=1 ORDER BY id');
  console.log('All active rules:', rules);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
