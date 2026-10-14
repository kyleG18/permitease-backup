const db = require('./config/db');
(async () => {
  // Find Roxas City Capiz
  const [rows] = await db.query("SELECT cm.id, cm.name, p.name as province FROM ph_cities_municipalities cm JOIN ph_provinces p ON p.id = cm.province_id WHERE cm.name LIKE '%Roxas%' AND cm.type = 'City'");
  console.log('All cities named Roxas:', rows);
  
  // Verify Calamba Laguna
  const [calamba] = await db.query("SELECT cm.id, cm.name, p.name as province, cm.type FROM ph_cities_municipalities cm JOIN ph_provinces p ON p.id = cm.province_id WHERE cm.name LIKE '%Calamba%'");
  console.log('Calamba entries:', calamba);
  process.exit(0);
})();
