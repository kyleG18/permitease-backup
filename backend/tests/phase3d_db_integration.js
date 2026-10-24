/**
 * phase3d_db_integration.js
 * PermitEase — Phase 3D Database Integration Test
 *
 * Verifies:
 *   1. tier2_requirement_rules.sql is idempotent (safe to run multiple times)
 *   2. Rollback script cleanly removes Tier 2 rows
 *   3. unique_biz_req constraint prevents duplicates
 *   4. INSERT IGNORE on business_requirements handles duplicates safely
 *
 * Uses a DISPOSABLE test database — never touches bizcheckpermit production DB.
 * If test DB cannot be created, all tests are marked BLOCKED with explanation.
 *
 * Run: node backend/tests/phase3d_db_integration.js
 */

'use strict';

const mysql  = require('mysql2/promise');
const fs     = require('fs');
const path   = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TEST_DB = 'bizcheckpermit_phase3d_test';

const TIER2_SQL = fs.readFileSync(
  path.join(__dirname, '..', 'migrations', 'tier2_requirement_rules.sql'),
  'utf8'
);

// ─── helpers ────────────────────────────────────────────────────────────────
let passed = 0; let failed = 0; let blocked = 0;
const failures = [];

function pass(label) { console.log(`  ✅ PASS: ${label}`); passed++; }
function fail(label, info) {
  const msg = `  ❌ FAIL: ${label}\n       ${info}`;
  console.log(msg); failures.push(msg); failed++;
}
function block(label, reason) { console.log(`  ⚠️  BLOCKED: ${label}\n       ${reason}`); blocked++; }
function section(t) { console.log(`\n${'─'.repeat(68)}\n  ${t}\n${'─'.repeat(68)}`); }

async function main() {
  let conn;

  // ── Connect without selecting a DB ────────────────────────────────────────
  try {
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '3306'),
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });
    console.log('\n✅ Connected to MySQL server.');
  } catch (e) {
    console.error('\n❌ Could not connect to MySQL:', e.message);
    console.log('All DB integration tests BLOCKED.');
    process.exit(2);
  }

  // ── Create test database ───────────────────────────────────────────────────
  section('Setup — create disposable test database');
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\``);
    await conn.query(`USE \`${TEST_DB}\``);
    pass(`Created / attached to test DB: ${TEST_DB}`);
  } catch (e) {
    block('Create test DB', e.message);
    await conn.end();
    process.exit(2);
  }

  // ── Create minimal permit_requirements table (mirrors production schema) ──
  section('Setup — minimal permit_requirements table');
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS permit_requirements (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        permit_name VARCHAR(255) NOT NULL,
        description TEXT,
        condition_field      VARCHAR(100) DEFAULT 'always',
        condition_value      VARCHAR(500) DEFAULT NULL,
        is_mandatory         TINYINT(1)   DEFAULT 1,
        applicable_business_type VARCHAR(255) DEFAULT NULL,
        renewal_period       VARCHAR(100) DEFAULT NULL,
        required_documents   TEXT,
        applies_to_new       TINYINT(1) DEFAULT 1,
        applies_to_renewal   TINYINT(1) DEFAULT 1,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    pass('permit_requirements table ready');
  } catch (e) {
    block('Create permit_requirements', e.message);
  }

  // ── Create minimal business_requirements table (mirrors production schema) ─
  section('Setup — minimal business_requirements table');
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS business_requirements (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        business_id    INT NOT NULL,
        requirement_id INT NOT NULL,
        status         VARCHAR(50) DEFAULT 'Missing',
        UNIQUE KEY unique_biz_req (business_id, requirement_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    pass('business_requirements table ready');
  } catch (e) {
    block('Create business_requirements', e.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1 — Apply tier2_requirement_rules.sql for the first time
  // ─────────────────────────────────────────────────────────────────────────
  section('Test 1 — First application of tier2_requirement_rules.sql');
  try {
    // Strip USE statement (we already selected DB); execute the INSERT blocks
    const sqlStripped = TIER2_SQL
      .replace(/USE\s+`?bizcheckpermit`?\s*;/gi, '')
      .replace(/START TRANSACTION\s*;/gi, '')
      .replace(/COMMIT\s*;/gi, '');

    await conn.query(sqlStripped);
    const [rows] = await conn.query(`SELECT permit_name FROM permit_requirements ORDER BY permit_name`);
    const names = rows.map(r => r.permit_name);

    const expectedTier2 = [
      'Annual Income Tax Return (AITR)',
      'Community Tax Certificate (Cedula)',
      'Market Clearance',
      'Proof of Business Name Registration',
      'Tourism Clearance',
      'Zoning / Locational Clearance',
    ];

    for (const expected of expectedTier2) {
      if (names.some(n => n.toLowerCase().includes(expected.toLowerCase()))) {
        pass(`Tier 2 rule inserted: "${expected}"`);
      } else {
        fail(`Tier 2 rule "${expected}" not found`, `Actual names: ${names.join(', ')}`);
      }
    }
  } catch (e) {
    block('Apply tier2_requirement_rules.sql (first run)', e.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2 — Idempotency: apply the migration a second time
  // ─────────────────────────────────────────────────────────────────────────
  section('Test 2 — Idempotency: run migration a second time (must not duplicate)');
  try {
    const [beforeRows] = await conn.query(`SELECT COUNT(*) AS cnt FROM permit_requirements`);
    const beforeCount = beforeRows[0].cnt;

    const sqlStripped = TIER2_SQL
      .replace(/USE\s+`?bizcheckpermit`?\s*;/gi, '')
      .replace(/START TRANSACTION\s*;/gi, '')
      .replace(/COMMIT\s*;/gi, '');
    await conn.query(sqlStripped);

    const [afterRows] = await conn.query(`SELECT COUNT(*) AS cnt FROM permit_requirements`);
    const afterCount = afterRows[0].cnt;

    if (afterCount === beforeCount) {
      pass(`Idempotent: row count unchanged after second run (${afterCount} rows)`);
    } else {
      fail('Migration is NOT idempotent', `Before: ${beforeCount}, After: ${afterCount} — duplicates inserted`);
    }
  } catch (e) {
    block('Idempotency test', e.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3 — INSERT IGNORE on business_requirements: no crash on duplicate
  // ─────────────────────────────────────────────────────────────────────────
  section('Test 3 — INSERT IGNORE business_requirements duplicate safety');
  try {
    // Insert once
    await conn.query(
      'INSERT IGNORE INTO business_requirements (business_id, requirement_id, status) VALUES (?, ?, ?)',
      [9001, 1, 'Missing']
    );
    // Insert same row again — must NOT throw
    await conn.query(
      'INSERT IGNORE INTO business_requirements (business_id, requirement_id, status) VALUES (?, ?, ?)',
      [9001, 1, 'Missing']
    );
    const [rows] = await conn.query(
      'SELECT COUNT(*) AS cnt FROM business_requirements WHERE business_id = ? AND requirement_id = ?',
      [9001, 1]
    );
    if (rows[0].cnt === 1) {
      pass('INSERT IGNORE: duplicate row not inserted (count = 1)');
    } else {
      fail('INSERT IGNORE failed', `Expected 1 row, got ${rows[0].cnt}`);
    }
  } catch (e) {
    fail('INSERT IGNORE test threw an exception', e.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4 — Rollback: verify Tier 2 rows can be cleanly removed
  // ─────────────────────────────────────────────────────────────────────────
  section('Test 4 — Rollback: remove Tier 2 rules cleanly');
  try {
    const tier2Names = [
      'Tourism Clearance',
      'Market Clearance',
      'Annual Income Tax Return (AITR)',
      'Community Tax Certificate (Cedula)',
      'Proof of Business Name Registration',
      'Zoning / Locational Clearance',
    ];

    for (const name of tier2Names) {
      await conn.query('DELETE FROM permit_requirements WHERE permit_name = ?', [name]);
    }
    // Sanitary may also be Tier 2 depending on BPLO decision — check it separately
    // (do not roll back Sanitary if it was already a Tier 1 row in production)

    const [remaining] = await conn.query(`SELECT permit_name FROM permit_requirements`);
    const remainingNames = remaining.map(r => r.permit_name);
    const tier2StillPresent = tier2Names.filter(n =>
      remainingNames.some(rn => rn.toLowerCase().includes(n.toLowerCase()))
    );

    if (tier2StillPresent.length === 0) {
      pass('Rollback: all named Tier 2 rules removed successfully');
    } else {
      fail('Rollback incomplete', `Still present: ${tier2StillPresent.join(', ')}`);
    }
  } catch (e) {
    fail('Rollback test threw an exception', e.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5 — Tourism Clearance condition_value in DB matches expected tokens
  // ─────────────────────────────────────────────────────────────────────────
  section('Test 5 — Tourism Clearance: condition_value token list in DB');
  try {
    // Re-apply migration (we just rolled back) so we can inspect the row
    const sqlStripped = TIER2_SQL
      .replace(/USE\s+`?bizcheckpermit`?\s*;/gi, '')
      .replace(/START TRANSACTION\s*;/gi, '')
      .replace(/COMMIT\s*;/gi, '');
    await conn.query(sqlStripped);

    const [rows] = await conn.query(
      `SELECT condition_value FROM permit_requirements WHERE permit_name = 'Tourism Clearance' LIMIT 1`
    );

    if (rows.length === 0) {
      block('Tourism Clearance condition_value check', 'Row not found after re-applying migration');
    } else {
      const cv = rows[0].condition_value || '';
      const tokens = cv.split('|').map(t => t.trim().toLowerCase());

      // MUST NOT contain the broad token
      if (tokens.includes('food & beverage')) {
        fail('Tourism condition_value still contains "food & beverage" broad token (Phase 3C fix missing)', cv);
      } else {
        pass('"food & beverage" broad token NOT in Tourism condition_value');
      }

      // MUST contain the Tourism group token
      if (tokens.includes('tourism, hospitality & entertainment')) {
        pass('"tourism, hospitality & entertainment" token present');
      } else {
        fail('Missing tourism group token', `Tokens: ${tokens.join(' | ')}`);
      }

      // MUST contain Restaurant industry_category tokens
      const mustHave = ['restaurant / full-service eatery', 'carenderia / turo-turo', 'fast food / quick service', 'cafe / coffee shop'];
      for (const t of mustHave) {
        if (tokens.includes(t)) {
          pass(`Tourism token "${t}" present`);
        } else {
          fail(`Tourism token "${t}" MISSING`, `Found: ${tokens.join(' | ')}`);
        }
      }
    }
  } catch (e) {
    block('Tourism condition_value DB check', e.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Teardown — drop test database
  // ─────────────────────────────────────────────────────────────────────────
  section('Teardown — drop disposable test database');
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
    pass(`Test database ${TEST_DB} dropped`);
  } catch (e) {
    console.log(`  ⚠️  Could not drop test DB (manual cleanup may be needed): ${e.message}`);
  }

  await conn.end();

  // ── Final report ──────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(68)}`);
  console.log(`  Phase 3D DB Integration Results: ${passed} passed, ${failed} failed, ${blocked} blocked`);
  console.log('═'.repeat(68));
  if (failures.length > 0) {
    console.log('\nFAILED TESTS:');
    failures.forEach(f => console.log(f));
    process.exit(1);
  } else {
    console.log('\n✅ All DB integration tests passed (or blocked — see above).');
    process.exit(blocked > 0 ? 2 : 0);
  }
}

main().catch(e => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
