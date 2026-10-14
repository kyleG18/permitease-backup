const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  console.log('Fetching from PSGC API...');

  const islands = await get('https://psgc.gitlab.io/api/island-groups/');
  const regions = await get('https://psgc.gitlab.io/api/regions/');
  const provinces = await get('https://psgc.gitlab.io/api/provinces/');
  const cities = await get('https://psgc.gitlab.io/api/cities-municipalities/');

  // Find Oriental Mindoro province
  const omProvince = provinces.find(p => p.name.toLowerCase().includes('oriental mindoro'));
  console.log('Oriental Mindoro:', omProvince);

  // Find Roxas in Oriental Mindoro
  const roxas = cities.find(c => c.name.toLowerCase().includes('roxas') && c.provinceCode === omProvince.code);
  console.log('Roxas:', roxas);

  // Get barangays of Roxas
  const barangays = await get(`https://psgc.gitlab.io/api/cities-municipalities/${roxas.code}/barangays/`);
  console.log('Barangays count:', barangays.length);

  // Find MIMAROPA region
  const mimaropa = regions.find(r => r.name.toLowerCase().includes('mimaropa') || r.name.toLowerCase().includes('iv-b'));
  console.log('Region:', mimaropa);

  // Find island group for MIMAROPA
  const igForMimaropa = islands.find(ig => ig.name.toLowerCase().includes('luzon'));

  // Generate SQL
  let sql = '-- PermitEase Location Seed SQL (Oriental Mindoro / Roxas)\n\n';

  // Island groups
  sql += '-- Island Groups\n';
  for (const ig of islands) {
    sql += `INSERT IGNORE INTO ph_island_groups (id, name) VALUES ('${ig.code}', '${ig.name.replace(/'/g,"\\'")}');\n`;
  }

  // Regions
  sql += '\n-- Regions\n';
  for (const r of regions) {
    const igCode = r.code.substring(0, 2); // approximate
    sql += `INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('${r.code}', '${r.name.replace(/'/g,"\\'")}', NULL);\n`;
  }

  // Just Oriental Mindoro province
  sql += `\n-- Province: Oriental Mindoro\n`;
  sql += `INSERT IGNORE INTO ph_provinces (id, name, region_id) VALUES ('${omProvince.code}', '${omProvince.name}', '${omProvince.regionCode}');\n`;

  // All cities in Oriental Mindoro
  const omCities = cities.filter(c => c.provinceCode === omProvince.code);
  sql += `\n-- Cities/Municipalities of Oriental Mindoro\n`;
  for (const c of omCities) {
    const type = c.name.toLowerCase().includes('city') ? 'City' : 'Municipality';
    sql += `INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('${c.code}', '${c.name.replace(/'/g,"\\'")}', '${type}', '${c.provinceCode}', '${c.regionCode}');\n`;
  }

  // Barangays of Roxas
  sql += `\n-- Barangays of Roxas, Oriental Mindoro\n`;
  for (const b of barangays) {
    sql += `INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('${b.code}', '${b.name.replace(/'/g,"\\'")}', '${roxas.code}');\n`;
  }

  fs.writeFileSync('location_seed.sql', sql);
  console.log('\nDone! SQL written to location_seed.sql');
  console.log('Total lines:', sql.split('\n').length);
}

run().catch(e => { console.error(e.message); process.exit(1); });
