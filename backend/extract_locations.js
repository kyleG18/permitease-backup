const mysql = require('mysql2/promise');
async function extract() {
  const db = await mysql.createConnection({host:'localhost',user:'root',password:'',database:'smartpermit_db'});

  const [islands] = await db.query('SELECT * FROM ph_island_groups');
  const [regions] = await db.query('SELECT * FROM ph_regions');
  const [provinces] = await db.query("SELECT * FROM ph_provinces WHERE name LIKE '%Oriental Mindoro%'");
  const [cities] = await db.query("SELECT c.* FROM ph_cities_municipalities c JOIN ph_provinces p ON c.province_id = p.id WHERE p.name LIKE '%Oriental Mindoro%'");
  
  let roxasId = null;
  for (const c of cities) {
    if (c.name.toLowerCase().includes('roxas')) { roxasId = c.id; break; }
  }
  
  let barangays = [];
  if (roxasId) {
    const [b] = await db.query('SELECT * FROM ph_barangays WHERE city_municipality_id = ?', [roxasId]);
    barangays = b;
  }

  const fs = require('fs');
  const out = { islands, regions, provinces, cities, barangays, roxasId };
  fs.writeFileSync('location_extract.json', JSON.stringify(out, null, 2));
  console.log('Done. islands:', islands.length, 'regions:', regions.length, 'provinces:', provinces.length, 'cities:', cities.length, 'barangays:', barangays.length);
  await db.end();
}
extract().catch(e => console.error(e.message));
