const db = require('./config/db');
(async () => {
  const [rows] = await db.query("SELECT * FROM ph_cities_municipalities WHERE name LIKE '%Roxas%' AND province_id = (SELECT id FROM ph_provinces WHERE name = 'Oriental Mindoro')");
  console.log(rows);
  process.exit(0);
})();
