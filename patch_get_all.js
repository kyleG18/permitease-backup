const fs = require('fs');
const path = './backend/controllers/applicationController.js';
let c = fs.readFileSync(path, 'utf8');

const oldQ = `SELECT a.*, b.business_name, b.business_type,
                     u.full_name AS owner_name, u.email AS owner_email
              FROM applications a
              JOIN businesses b ON a.business_id = b.id
              JOIN users u ON a.user_id = u.id`;

const newQ = `SELECT a.*, b.business_name, b.business_type, b.industry_category,
                     u.full_name AS owner_name, u.email AS owner_email,
                     (SELECT COUNT(*) FROM business_requirements WHERE business_id = b.id) as total_reqs,
                     (SELECT COUNT(*) FROM business_requirements WHERE business_id = b.id AND status IN ('Submitted', 'Approved')) as ready_reqs
              FROM applications a
              JOIN businesses b ON a.business_id = b.id
              JOIN users u ON a.user_id = u.id`;

c = c.replace(oldQ, newQ);
fs.writeFileSync(path, c);
console.log('Patched getAllApplications');
