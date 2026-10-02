const db = require('../config/db');

async function migrate() {
  try {
    await db.query(
      'CREATE TABLE IF NOT EXISTS ph_island_groups (' +
      'id VARCHAR(10) PRIMARY KEY,' +
      'name VARCHAR(100) NOT NULL' +
      ')'
    );
    await db.query(
      'CREATE TABLE IF NOT EXISTS ph_regions (' +
      'id VARCHAR(20) PRIMARY KEY,' +
      'name VARCHAR(200) NOT NULL,' +
      'island_group_id VARCHAR(10),' +
      'FOREIGN KEY (island_group_id) REFERENCES ph_island_groups(id)' +
      ')'
    );
    await db.query(
      'CREATE TABLE IF NOT EXISTS ph_provinces (' +
      'id VARCHAR(20) PRIMARY KEY,' +
      'name VARCHAR(200) NOT NULL,' +
      'region_id VARCHAR(20),' +
      'FOREIGN KEY (region_id) REFERENCES ph_regions(id)' +
      ')'
    );
    await db.query(
      'CREATE TABLE IF NOT EXISTS ph_cities_municipalities (' +
      'id VARCHAR(20) PRIMARY KEY,' +
      'name VARCHAR(200) NOT NULL,' +
      'type ENUM(\'City\',\'Municipality\') NOT NULL DEFAULT \'Municipality\',' +
      'province_id VARCHAR(20),' +
      'FOREIGN KEY (province_id) REFERENCES ph_provinces(id)' +
      ')'
    );
    await db.query(
      'CREATE TABLE IF NOT EXISTS ph_barangays (' +
      'id VARCHAR(20) PRIMARY KEY,' +
      'name VARCHAR(200) NOT NULL,' +
      'city_municipality_id VARCHAR(20),' +
      'FOREIGN KEY (city_municipality_id) REFERENCES ph_cities_municipalities(id)' +
      ')'
    );
    console.log('Location tables OK.');

    const alterCols = [
      'ADD COLUMN ownership_type VARCHAR(100) NULL',
      'ADD COLUMN primary_products TEXT NULL',
      'ADD COLUMN island_group_id VARCHAR(10) NULL',
      'ADD COLUMN region_id VARCHAR(20) NULL',
      'ADD COLUMN province_id VARCHAR(20) NULL',
      'ADD COLUMN city_municipality_id VARCHAR(20) NULL',
      'ADD COLUMN barangay_id VARCHAR(20) NULL',
      'ADD COLUMN premises_type VARCHAR(100) NULL',
      'ADD COLUMN business_characteristics TEXT NULL'
    ];

    for (const stmt of alterCols) {
      try {
        await db.query('ALTER TABLE businesses ' + stmt);
        console.log('Added column: ' + stmt);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log('Already exists: ' + stmt);
        } else {
          throw e;
        }
      }
    }
    console.log('Migration complete!');
    process.exit(0);
  } catch (e) {
    console.error('Migration error:', e.message);
    process.exit(1);
  }
}

migrate();
