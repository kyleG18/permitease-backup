const fs = require('fs');
const path = './backend/controllers/applicationController.js';
let content = fs.readFileSync(path, 'utf8');

const oldSelect = `b.business_name, b.business_type, b.industry_category, b.address,
                    b.employees, b.business_status, b.date_established,
                    b.capitalization, b.gross_sales, b.floor_area,`;
                    
const newSelect = `b.business_name, b.business_type, b.industry_category, b.address,
                    b.employees, b.business_status, b.date_established,
                    b.capitalization, b.gross_sales, b.floor_area,
                    b.ownership_type, b.primary_products, b.premises_type, b.business_characteristics,
                    b.island_group_id, b.region_id, b.province_id, b.city_municipality_id, b.barangay_id,`;

content = content.replace(oldSelect, newSelect);
fs.writeFileSync(path, content);
console.log('Patched applicationController.js query');
