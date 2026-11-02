/**
 * migrate_bplo_schedule.js
 * Run once: node migrate_bplo_schedule.js
 * Creates bplo_schedule table and seeds Philippine public holidays + special
 * non-working days for 2025-2026.
 */

const db = require('./config/db');

async function run() {
  // 1. Create table
  await db.query(`
    CREATE TABLE IF NOT EXISTS bplo_schedule (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      schedule_date DATE NOT NULL UNIQUE,
      day_type      ENUM('holiday', 'special_nonworking', 'bplo_closed') NOT NULL,
      label         VARCHAR(255),
      is_active     TINYINT(1) NOT NULL DEFAULT 1,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ bplo_schedule table ready.');

  // 2. Seed data — Philippine public holidays & special non-working days
  const entries = [
    // ── 2025 ────────────────────────────────────────────────────────────
    ['2025-01-01', 'holiday',           "New Year's Day"],
    ['2025-01-29', 'holiday',           "Chinese Lunar New Year"],
    ['2025-02-25', 'holiday',           "EDSA People Power Revolution Anniversary"],
    ['2025-04-09', 'holiday',           "Araw ng Kagitingan (Day of Valor)"],
    ['2025-04-17', 'holiday',           "Maundy Thursday"],
    ['2025-04-18', 'holiday',           "Good Friday"],
    ['2025-04-19', 'special_nonworking',"Black Saturday"],
    ['2025-05-01', 'holiday',           "Labor Day / Araw ng Manggagawa"],
    ['2025-06-12', 'holiday',           "Independence Day"],
    ['2025-08-21', 'holiday',           "Ninoy Aquino Day"],
    ['2025-08-25', 'holiday',           "National Heroes Day"],
    ['2025-11-01', 'holiday',           "All Saints' Day"],
    ['2025-11-02', 'special_nonworking',"All Souls' Day"],
    ['2025-11-30', 'holiday',           "Bonifacio Day"],
    ['2025-12-08', 'holiday',           "Feast of the Immaculate Conception"],
    ['2025-12-24', 'special_nonworking',"Christmas Eve"],
    ['2025-12-25', 'holiday',           "Christmas Day"],
    ['2025-12-30', 'holiday',           "Rizal Day"],
    ['2025-12-31', 'special_nonworking',"New Year's Eve"],

    // ── 2026 ────────────────────────────────────────────────────────────
    ['2026-01-01', 'holiday',           "New Year's Day"],
    ['2026-02-17', 'holiday',           "Chinese Lunar New Year"],
    ['2026-02-25', 'holiday',           "EDSA People Power Revolution Anniversary"],
    ['2026-04-02', 'holiday',           "Maundy Thursday"],
    ['2026-04-03', 'holiday',           "Good Friday"],
    ['2026-04-04', 'special_nonworking',"Black Saturday"],
    ['2026-04-09', 'holiday',           "Araw ng Kagitingan (Day of Valor)"],
    ['2026-05-01', 'holiday',           "Labor Day / Araw ng Manggagawa"],
    ['2026-06-12', 'holiday',           "Independence Day"],
    ['2026-08-21', 'holiday',           "Ninoy Aquino Day"],
    ['2026-08-31', 'holiday',           "National Heroes Day"],
    ['2026-11-01', 'holiday',           "All Saints' Day"],
    ['2026-11-02', 'special_nonworking',"All Souls' Day"],
    ['2026-11-30', 'holiday',           "Bonifacio Day"],
    ['2026-12-08', 'holiday',           "Feast of the Immaculate Conception"],
    ['2026-12-24', 'special_nonworking',"Christmas Eve"],
    ['2026-12-25', 'holiday',           "Christmas Day"],
    ['2026-12-30', 'holiday',           "Rizal Day"],
    ['2026-12-31', 'special_nonworking',"New Year's Eve"],
  ];

  let inserted = 0;
  for (const [date, type, label] of entries) {
    try {
      await db.query(
        `INSERT INTO bplo_schedule (schedule_date, day_type, label, is_active)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE day_type = VALUES(day_type), label = VALUES(label), is_active = 1`,
        [date, type, label]
      );
      inserted++;
    } catch (e) {
      console.warn(`  ⚠ Skipped ${date}: ${e.message}`);
    }
  }
  console.log(`✅ Seeded ${inserted} holiday/schedule entries.`);
  process.exit(0);
}

run().catch(e => { console.error('Migration failed:', e); process.exit(1); });
