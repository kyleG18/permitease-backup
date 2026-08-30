require('dotenv').config();
const db = require('./config/db');

async function run() {
  await db.query('DELETE FROM permit_requirements');
  const sql = `INSERT INTO permit_requirements (permit_name, description, applicable_business_type, renewal_period, condition_field, condition_value, is_mandatory, required_documents) VALUES
('Barangay Business Clearance', 'Required for all businesses before applying for a Mayor\\'s Permit.', 'All', 'Annual', 'always', '', 1, 'Proof of Business Registration, Contract of Lease or Transfer Certificate of Title'),
('Sanitary Permit', 'Ensures the establishment complies with local health and sanitation standards.', 'Food & Beverage', 'Annual', 'industry_category', 'Food & Beverage', 1, 'Medical Certificates of Employees, Water Potability Test'),
('Fire Safety Inspection Certificate', 'Certifies that the establishment is compliant with the Fire Code of the Philippines.', 'All', 'Annual', 'always', '', 1, 'Fire Extinguisher Receipt, Floor Plan'),
('CENRO Environmental Clearance', 'Clearance for compliance with solid waste management and environmental regulations.', 'All', 'Annual', 'always', '', 1, 'Waste Management Plan'),
('Building Permit', 'Required if you are constructing or renovating a physical structure.', 'All', 'One-time', 'business_status', 'New Application', 0, 'Building Plans, Property Title')`;
  
  await db.query(sql);
  console.log('Inserted real requirements');
}

run().catch(console.error).finally(() => process.exit());
