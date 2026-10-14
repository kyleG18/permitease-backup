const fs = require('fs');
const path = './controllers/businessController.js';
let content = fs.readFileSync(path, 'utf8');

// Replace createBusiness
content = content.replace(
  /const createBusiness = async \(req, res\) => {[\s\S]*?res\.status\(201\)\.json\({ id: result\.insertId, message: 'Business created successfully' }\);\n    } catch \(error\)/,
  `const createBusiness = async (req, res) => {
    try {
        const { 
            business_name, business_type, industry_category, address, 
            employees, business_status, date_established, 
            capitalization, gross_sales, floor_area,
            owner_name, contact_number, barangay, business_description,
            ownership_type, primary_products, island_group_id, region_id, province_id, city_municipality_id, barangay_id, premises_type, business_characteristics
        } = req.body;

        if (!business_name || !business_type || !industry_category || !address) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        let charStr = null;
        if (business_characteristics) {
            charStr = typeof business_characteristics === 'string' ? business_characteristics : JSON.stringify(business_characteristics);
        }

        const [result] = await db.query(
            'INSERT INTO businesses (user_id, business_name, business_type, industry_category, address, employees, business_status, date_established, capitalization, gross_sales, floor_area, owner_name, contact_number, barangay, business_description, ownership_type, primary_products, island_group_id, region_id, province_id, city_municipality_id, barangay_id, premises_type, business_characteristics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, business_name, business_type, industry_category, address, employees || 0, business_status || 'New Application', date_established || null, capitalization || 0, gross_sales || 0, floor_area || 0, owner_name || null, contact_number || null, barangay || null, business_description || null, ownership_type || null, primary_products || null, island_group_id || null, region_id || null, province_id || null, city_municipality_id || null, barangay_id || null, premises_type || null, charStr]
        );

        res.status(201).json({ id: result.insertId, message: 'Business created successfully' });
    } catch (error)`
);

// Replace updateBusiness
content = content.replace(
  /const updateBusiness = async \(req, res\) => {[\s\S]*?res\.json\({ message: 'Business updated successfully' }\);\n    } catch \(error\)/,
  `const updateBusiness = async (req, res) => {
    try {
        const { 
            business_name, business_type, industry_category, address, 
            employees, business_status, date_established, 
            capitalization, gross_sales, floor_area,
            owner_name, contact_number, barangay, business_description,
            ownership_type, primary_products, island_group_id, region_id, province_id, city_municipality_id, barangay_id, premises_type, business_characteristics
        } = req.body;

        const [existing] = await db.query('SELECT id FROM businesses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Business not found or unauthorized' });
        }

        let charStr = null;
        if (business_characteristics) {
            charStr = typeof business_characteristics === 'string' ? business_characteristics : JSON.stringify(business_characteristics);
        }

        await db.query(
            'UPDATE businesses SET business_name = ?, business_type = ?, industry_category = ?, address = ?, employees = ?, business_status = ?, date_established = ?, capitalization = ?, gross_sales = ?, floor_area = ?, owner_name = ?, contact_number = ?, barangay = ?, business_description = ?, ownership_type = ?, primary_products = ?, island_group_id = ?, region_id = ?, province_id = ?, city_municipality_id = ?, barangay_id = ?, premises_type = ?, business_characteristics = ? WHERE id = ?',
            [business_name, business_type, industry_category, address, employees || 0, business_status || 'New Application', date_established || null, capitalization || 0, gross_sales || 0, floor_area || 0, owner_name || null, contact_number || null, barangay || null, business_description || null, ownership_type || null, primary_products || null, island_group_id || null, region_id || null, province_id || null, city_municipality_id || null, barangay_id || null, premises_type || null, charStr, req.params.id]
        );

        res.json({ message: 'Business updated successfully' });
    } catch (error)`
);

fs.writeFileSync(path, content);
console.log('Updated businessController.js');
