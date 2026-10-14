const axios = require('axios');
const db = require('./config/db');

async function seed() {
  try {
    console.log('Fetching island groups...');
    const { data: islands } = await axios.get('https://psgc.gitlab.io/api/island-groups/');
    for (const ig of islands) {
      await db.query('INSERT IGNORE INTO ph_island_groups (id, name) VALUES (?, ?)', [ig.code, ig.name]);
    }

    console.log('Fetching regions...');
    const { data: regions } = await axios.get('https://psgc.gitlab.io/api/regions/');
    for (const r of regions) {
      // Find island group for region
      let igCode = null;
      for (const ig of islands) {
        const { data: igRegions } = await axios.get(`https://psgc.gitlab.io/api/island-groups/${ig.code}/regions/`);
        if (igRegions.some(igr => igr.code === r.code)) {
          igCode = ig.code;
          break;
        }
      }
      await db.query('INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES (?, ?, ?)', [r.code, r.name, igCode]);
    }

    console.log('Fetching provinces...');
    const { data: provinces } = await axios.get('https://psgc.gitlab.io/api/provinces/');
    for (const p of provinces) {
      await db.query('INSERT IGNORE INTO ph_provinces (id, name, region_id) VALUES (?, ?, ?)', [p.code, p.name, p.regionCode]);
    }

    // Add NCR as a pseudo-province so cities can be linked to it, or just link cities to regions?
    // In my schema, ph_cities_municipalities has province_id.
    // NCR cities don't have a province. Let's make province_id nullable.
    await db.query('ALTER TABLE ph_cities_municipalities MODIFY province_id VARCHAR(20) NULL');
    await db.query('ALTER TABLE ph_cities_municipalities ADD COLUMN region_id VARCHAR(20) NULL AFTER province_id');

    console.log('Fetching cities and municipalities...');
    const { data: citiesMuns } = await axios.get('https://psgc.gitlab.io/api/cities-municipalities/');
    for (const cm of citiesMuns) {
      const type = cm.name.toLowerCase().includes('city') ? 'City' : 'Municipality';
      // For NCR, provinceCode is null
      await db.query('INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES (?, ?, ?, ?, ?)', 
        [cm.code, cm.name, type, cm.provinceCode || null, cm.regionCode || null]);
    }

    // Wait, fetching 42,000 barangays via API will take a long time due to rate limits or sheer volume?
    // https://psgc.gitlab.io/api/barangays/ returns ALL barangays.
    console.log('Fetching ALL barangays (this might take a bit)...');
    const { data: barangays } = await axios.get('https://psgc.gitlab.io/api/barangays/');
    console.log(`Fetched ${barangays.length} barangays. Inserting into DB...`);
    
    // Batch insert
    const batchSize = 1000;
    for (let i = 0; i < barangays.length; i += batchSize) {
      const batch = barangays.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];
      for (const b of batch) {
        placeholders.push('(?, ?, ?)');
        values.push(b.code, b.name, b.cityMunicipalityCode || null);
      }
      await db.query(`INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ${placeholders.join(',')}`, values);
      console.log(`Inserted ${i + batch.length} / ${barangays.length}`);
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error.message);
    process.exit(1);
  }
}
seed();
