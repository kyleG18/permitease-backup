const fs = require('fs');
const path = './backend/controllers/locationController.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('resolveLocationNames')) {
    const newFn = `
exports.resolveLocationNames = async (req, res) => {
  try {
    const { islandGroup, region, province, city, barangay } = req.query;
    
    let result = {
      islandGroup: '',
      region: '',
      province: '',
      city: '',
      barangay: ''
    };

    if (islandGroup) {
      const [r] = await db.query('SELECT name FROM ph_island_groups WHERE id = ?', [islandGroup]);
      if (r.length) result.islandGroup = r[0].name;
    }
    if (region) {
      const [r] = await db.query('SELECT name FROM ph_regions WHERE id = ?', [region]);
      if (r.length) result.region = r[0].name;
    }
    if (province) {
      const [r] = await db.query('SELECT name FROM ph_provinces WHERE id = ?', [province]);
      if (r.length) result.province = r[0].name;
    }
    if (city) {
      const [r] = await db.query('SELECT name FROM ph_cities_municipalities WHERE id = ?', [city]);
      if (r.length) result.city = r[0].name;
    }
    if (barangay) {
      const [r] = await db.query('SELECT name FROM ph_barangays WHERE id = ?', [barangay]);
      if (r.length) result.barangay = r[0].name;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
`;
    content = content + newFn;
    fs.writeFileSync(path, content);
    console.log('Added resolveLocationNames to locationController.js');
}
