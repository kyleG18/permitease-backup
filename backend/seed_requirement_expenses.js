const db = require('./config/db');

async function run() {
  await db.query('UPDATE permit_requirements SET estimated_fee = 230.00 WHERE id = 14');
  
  // Check if Food Handler already exists
  const [f] = await db.query('SELECT id FROM permit_requirements WHERE permit_name LIKE ?', ['%Food Handler%']);
  if (f.length === 0) {
    await db.query(`INSERT INTO permit_requirements (permit_name, description, applicable_business_type, renewal_period, required_documents, condition_field, condition_value, is_mandatory, issuing_agency, ordinance_reference, estimated_fee) VALUES (
      'Food Handler Health Examination & Laboratory Clearance',
      'Mandatory medical diagnostic tests (Chest X-Ray, Stool & Urine exams) and official health cards for food and beverage handling personnel.',
      'Food & Beverage',
      'Annual',
      'Chest X-Ray, Stool Exam, Urinalysis, 1x1 Photos',
      'industry_category',
      'Food & Beverage',
      1,
      'Municipal Health Office (MHO)',
      'Code on Sanitation (PD 856)',
      450.00
    )`);
  }

  // Check if Weights and Measures already exists
  const [w] = await db.query('SELECT id FROM permit_requirements WHERE permit_name LIKE ?', ['%Weights and Measures%']);
  if (w.length === 0) {
    await db.query(`INSERT INTO permit_requirements (permit_name, description, applicable_business_type, renewal_period, required_documents, condition_field, condition_value, is_mandatory, issuing_agency, ordinance_reference, estimated_fee) VALUES (
      'Calibration & Sealing of Weights and Measures (Timbangan)',
      'Annual inspection, testing and official tamper-proof sealing of weighing scales and measurement devices used in commercial retail trading.',
      'Retail',
      'Annual',
      'Weighing Scale, Official Receipt of Device',
      'industry_category',
      'Retail',
      1,
      'Municipal Treasurer Office (MTO)',
      'RA 7160 Sec 148 / Municipal Revenue Code',
      150.00
    )`);
  }

  // Check if Professional / Occupational Tax Clearance already exists
  const [s] = await db.query('SELECT id FROM permit_requirements WHERE permit_name LIKE ?', ['%Occupational Tax%']);
  if (s.length === 0) {
    await db.query(`INSERT INTO permit_requirements (permit_name, description, applicable_business_type, renewal_period, required_documents, condition_field, condition_value, is_mandatory, issuing_agency, ordinance_reference, estimated_fee) VALUES (
      'Professional / Occupational Tax Clearance (PTR/OTR)',
      'Occupational tax receipt and municipal clearance for registered service professionals, therapists, technicians, and specialized service personnel.',
      'Services',
      'Annual',
      'PRC ID / Technical Certification, Cedula',
      'industry_category',
      'Services',
      1,
      'Municipal Treasurer Office (MTO)',
      'RA 7160 Sec 139 / Municipal Revenue Code',
      300.00
    )`);
  }

  console.log('Successfully seeded requirement fees and type-specific requirements!');
  const [rows] = await db.query('SELECT id, permit_name, condition_field, condition_value, estimated_fee FROM permit_requirements');
  console.table(rows);
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
