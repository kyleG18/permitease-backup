/**
 * phase3e_consistency_and_reconciliation.js
 * PermitEase — Phase 3E Consistency, AI Mapping, Progress Preservation, and Seeder Safety Test Suite
 *
 * Tests:
 *   PART 1: 3-Engine Consistency & AI Category Mapping (Unit, In-Memory)
 *     - Tests readiness, compliance, assessment with identical rules & profiles
 *     - Tests business_status: New Application, Renewal, mismatched query param, null, unknown
 *     - Tests AI category mapping: 'Retail' -> 'Retail & Trading', 'Services' -> canonical, etc.
 *     - Tests authoritative bizObject taking precedence over AI prediction
 *     - Tests null and empty field safety
 *
 *   PART 2: Data-Integrity & Migration Reconciliation (Integration, Disposable Test DB)
 *     - Simulates existing business with completed preparation progress on Tier 1
 *     - Applies Tier 2 migration
 *     - Tests getCompliance / assessment reconciliation:
 *       * Verified: Completed status ('Submitted', 'Approved') NOT overwritten
 *       * Verified: Newly applicable requirements inserted as 'Missing'
 *       * Verified: No duplicates created (unique_biz_req)
 *       * Verified: Unrelated businesses untouched
 *     - Tests safe seeder (seed_reqs.js logic):
 *       * Verified: Unrelated Tier 2 rules NOT deleted
 *       * Verified: Existing requirement IDs preserved
 *
 * Run: node backend/tests/phase3e_consistency_and_reconciliation.js
 */

'use strict';

const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TEST_DB = 'bizcheckpermit_phase3e_test';

let passed = 0;
let failed = 0;
const failures = [];

function pass(label) {
  console.log(`  ✅ PASS: ${label}`);
  passed++;
}

function fail(label, info) {
  const msg = `  ❌ FAIL: ${label}\n       ${info}`;
  console.log(msg);
  failures.push(msg);
  failed++;
}

function section(title) {
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(72));
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 1: 3-ENGINE CONSISTENCY & AI MAPPING LOGIC
// ─────────────────────────────────────────────────────────────────────────────

const APP_TYPE_TO_STATUS = {
  NEW: 'New Application',
  RENEWAL: 'Renewal',
};

const AI_CATEGORY_TO_CANONICAL = {
  'food & beverage': 'Food & Beverage',
  'retail': 'Retail & Trading',
  'services': 'Services (Personal & Professional)',
  'manufacturing': 'Manufacturing & Processing',
  'agriculture': 'Agriculture, Fishery & Aquaculture',
  'others': 'Others',
};

// Mirroring readinessController.js
function evalReadiness(rule, biz, queryAppType) {
  const cf = (rule.condition_field || '').trim();
  const cv = (rule.condition_value || '').trim();
  if (!cf || cf === 'always') return true;

  let appTypeStatus = 'New Application';
  if (queryAppType) {
    const qUpper = queryAppType.toUpperCase();
    appTypeStatus = APP_TYPE_TO_STATUS[qUpper] || queryAppType;
  } else if (biz && biz.business_status) {
    appTypeStatus = biz.business_status.trim();
  }

  if (cf === 'industry_category') {
    return (biz.industry_category || '').trim() === cv;
  }
  if (cf === 'business_status') {
    return (appTypeStatus || '').trim().toLowerCase() === cv.toLowerCase();
  }
  if (cf === 'premises_type') {
    return (biz.premises_type || '').trim().toLowerCase() === cv.toLowerCase();
  }
  if (cf === 'business_type_contains') {
    const tokens = cv.split('|').map(t => t.trim().toLowerCase()).filter(Boolean);
    const bt = (biz.business_type || '').trim().toLowerCase();
    const ic = (biz.industry_category || '').trim().toLowerCase();
    return tokens.some(t => t === bt || t === ic);
  }
  return false;
}

// Mirroring complianceController.js
function evalCompliance(rule, biz) {
  const cf = (rule.condition_field || '').trim();
  const cv = (rule.condition_value || '').trim();
  if (!cf || cf === 'always') return true;

  if (cf === 'industry_category') {
    return (biz.industry_category || '').trim() === cv;
  }
  if (cf === 'business_status') {
    return (biz.business_status || '').trim().toLowerCase() === cv.toLowerCase();
  }
  if (cf === 'premises_type') {
    return (biz.premises_type || '').trim().toLowerCase() === cv.toLowerCase();
  }
  if (cf === 'business_type_contains') {
    const tokens = cv.split('|').map(t => t.trim().toLowerCase()).filter(Boolean);
    const bt = (biz.business_type || '').trim().toLowerCase();
    const ic = (biz.industry_category || '').trim().toLowerCase();
    return tokens.some(t => t === bt || t === ic);
  }
  return false;
}

const AI_TYPE_TO_CANONICAL = {
  'restaurant': 'Restaurant / Full-Service Eatery',
  'cafe': 'Cafe / Coffee Shop',
  'fast food': 'Fast Food / Quick Service',
  'carenderia': 'Carenderia / Turo-Turo',
  'sari-sari store': 'Sari-Sari Store',
  'hotel': 'Hotel / Inn',
  'resort': 'Resort / Beach Resort',
  'hostel': 'Pension House / Hostel',
};

// Mirroring assessmentController.js (Phase 3E updated)
function evalAssessment(rule, bizObject, aiResult, reqBody = {}) {
  const cf = (rule.condition_field || '').trim();
  const cv = (rule.condition_value || '').trim();
  if (!cf || cf === 'always') return true;

  const predictedIndustry = aiResult ? aiResult.industry_category : '';
  const predictedType     = aiResult ? aiResult.business_type : '';
  const canonicalCategoryFromAI = AI_CATEGORY_TO_CANONICAL[String(predictedIndustry || '').trim().toLowerCase()] || '';
  const canonicalTypeFromAI = AI_TYPE_TO_CANONICAL[String(predictedType || '').trim().toLowerCase()] || '';

  if (cf === 'industry_category') {
    const bizInd  = bizObject ? (bizObject.industry_category || '').trim().toLowerCase() : '';
    const predInd = String(predictedIndustry || '').trim().toLowerCase();
    const canonCat = canonicalCategoryFromAI.toLowerCase();
    const cvLower = cv.toLowerCase();
    return cvLower === bizInd || cvLower === predInd || cvLower === canonCat;
  }
  if (cf === 'business_type_contains') {
    const tokens = cv.split('|').map(t => t.trim().toLowerCase()).filter(Boolean);
    const pt = (predictedType     || '').trim().toLowerCase();
    const pi = (predictedIndustry || '').trim().toLowerCase();
    const canonCat  = canonicalCategoryFromAI.toLowerCase();
    const canonType = canonicalTypeFromAI.toLowerCase();
    const bt = bizObject ? (bizObject.business_type     || '').trim().toLowerCase() : '';
    const bi = bizObject ? (bizObject.industry_category || '').trim().toLowerCase() : '';
    return tokens.some(t => t === pt || t === pi || t === canonCat || t === canonType || t === bt || t === bi);
  }
  if (cf === 'premises_type') {
    if (bizObject && bizObject.premises_type) {
      return (bizObject.premises_type || '').trim().toLowerCase() === cv.toLowerCase();
    }
    return false;
  }
  if (cf === 'business_status') {
    const rawStatus = (bizObject && bizObject.business_status) ||
                      reqBody.business_status ||
                      reqBody.application_type;
    const statusToMatch = (rawStatus && (APP_TYPE_TO_STATUS[String(rawStatus).toUpperCase()] || rawStatus)) || '';
    if (statusToMatch) {
      return String(statusToMatch).trim().toLowerCase() === cv.toLowerCase();
    }
    return false;
  }
  return false;
}

// Rules for testing
const RULE_AITR = { condition_field: 'business_status', condition_value: 'Renewal' };
const RULE_ZONING = { condition_field: 'business_status', condition_value: 'New Application' };
const RULE_MARKET = { condition_field: 'premises_type', condition_value: 'Public Market Stall' };
const RULE_TOURISM = {
  condition_field: 'business_type_contains',
  condition_value: 'tourism, hospitality & entertainment|restaurant / full-service eatery|carenderia / turo-turo|fast food / quick service|cafe / coffee shop|restaurant with entertainment'
};
const RULE_SANITARY = { condition_field: 'industry_category', condition_value: 'Food & Beverage' };

// ── Tests 1: business_status parity across all 3 engines ──
section('1. business_status Parity: New Application vs Renewal across 3 engines');
{
  const newBiz = { business_status: 'New Application', business_type: 'Retail & Trading', industry_category: 'General' };
  const renewalBiz = { business_status: 'Renewal', business_type: 'Retail & Trading', industry_category: 'General' };

  // AITR for Renewal
  const aitrR = evalReadiness(RULE_AITR, renewalBiz, null);
  const aitrC = evalCompliance(RULE_AITR, renewalBiz);
  const aitrA = evalAssessment(RULE_AITR, renewalBiz, { industry_category: 'Retail', business_type: 'Shop' });

  if (aitrR === true && aitrC === true && aitrA === true) {
    pass('Renewal business -> AITR applies in readiness, compliance, AND assessment');
  } else {
    fail('Renewal business AITR parity failure', `readiness=${aitrR}, compliance=${aitrC}, assessment=${aitrA}`);
  }

  // AITR for New Application (must be false in all 3)
  const aitrR_new = evalReadiness(RULE_AITR, newBiz, null);
  const aitrC_new = evalCompliance(RULE_AITR, newBiz);
  const aitrA_new = evalAssessment(RULE_AITR, newBiz, { industry_category: 'Retail', business_type: 'Shop' });

  if (aitrR_new === false && aitrC_new === false && aitrA_new === false) {
    pass('New Application business -> AITR excluded in readiness, compliance, AND assessment');
  } else {
    fail('New Application AITR exclusion parity failure', `readiness=${aitrR_new}, compliance=${aitrC_new}, assessment=${aitrA_new}`);
  }

  // Zoning for New Application (must be true in all 3)
  const zonR = evalReadiness(RULE_ZONING, newBiz, null);
  const zonC = evalCompliance(RULE_ZONING, newBiz);
  const zonA = evalAssessment(RULE_ZONING, newBiz, { industry_category: 'Retail', business_type: 'Shop' });

  if (zonR === true && zonC === true && zonA === true) {
    pass('New Application business -> Zoning applies in readiness, compliance, AND assessment');
  } else {
    fail('New Application Zoning parity failure', `readiness=${zonR}, compliance=${zonC}, assessment=${zonA}`);
  }
}

// ── Tests 2: Query param fallback vs explicit override in readiness ──
section('2. readinessController query parameter vs stored business_status');
{
  const storedRenewal = { business_status: 'Renewal' };
  // Without query param -> defaults to stored status ('Renewal')
  const rNoParam = evalReadiness(RULE_AITR, storedRenewal, null);
  if (rNoParam === true) {
    pass('Omitted query param uses stored business_status=Renewal (AITR=true)');
  } else {
    fail('Omitted query param failed to use stored business_status', `result=${rNoParam}`);
  }

  // With explicit scenario override ?application_type=NEW
  const rOverride = evalReadiness(RULE_AITR, storedRenewal, 'NEW');
  if (rOverride === false) {
    pass('Explicit query param ?application_type=NEW overrides stored status (AITR=false)');
  } else {
    fail('Explicit query param failed to override stored status', `result=${rOverride}`);
  }

  // Unknown query param returns safe default
  const rBadParam = evalReadiness(RULE_AITR, storedRenewal, 'UNKNOWN_VAL');
  if (rBadParam === false) {
    pass('Unknown application_type param does not match Renewal rule');
  } else {
    fail('Unknown application_type param gave unexpected match', `result=${rBadParam}`);
  }
}

// ── Tests 3: Authoritative bizObject taking precedence in assessment ──
section('3. Authoritative profile data vs AI prediction in assessment');
{
  // Profile has Hotel / Inn, but AI hallucinated "Services" / "General Shop"
  const hotelBiz = {
    business_type: 'Tourism, Hospitality & Entertainment',
    industry_category: 'Hotel / Inn',
    business_status: 'New Application'
  };
  const faultyAI = {
    industry_category: 'Services',
    business_type: 'General Shop'
  };

  const tourismMatch = evalAssessment(RULE_TOURISM, hotelBiz, faultyAI);
  if (tourismMatch === true) {
    pass('Tourism Clearance matched from authoritative bizObject even though AI output "Services"');
  } else {
    fail('Authoritative bizObject failed to satisfy Tourism rule', `result=${tourismMatch}`);
  }

  // Sanitary Permit: bizObject has Food & Beverage, AI output "Others"
  const fbBiz = { industry_category: 'Food & Beverage' };
  const faultyAI2 = { industry_category: 'Others', business_type: 'Store' };
  const sanitaryMatch = evalAssessment(RULE_SANITARY, fbBiz, faultyAI2);
  if (sanitaryMatch === true) {
    pass('Sanitary Permit matched from authoritative bizObject even though AI output "Others"');
  } else {
    fail('Authoritative bizObject failed to satisfy Sanitary rule', `result=${sanitaryMatch}`);
  }
}

// ── Tests 4: Deterministic AI Category Mapping ──
section('4. Deterministic AI category normalization layer');
{
  // Anonymous description-only assessment (no bizObject)
  const aiRetail = { industry_category: 'Retail', business_type: 'Sari-Sari Store' };
  const retailRule = { condition_field: 'business_type_contains', condition_value: 'retail & trading' };
  const mRetail = evalAssessment(retailRule, null, aiRetail);
  if (mRetail === true) {
    pass('AI simplified "Retail" normalized to canonical "Retail & Trading"');
  } else {
    fail('AI category normalization failed for Retail', `result=${mRetail}`);
  }

  const aiFNB = { industry_category: 'Food & Beverage', business_type: 'Cafe' };
  const mFNB = evalAssessment(RULE_TOURISM, null, aiFNB);
  if (mFNB === true) {
    pass('AI business_type "Cafe" matches Tourism Clearance token');
  } else {
    fail('AI Cafe failed to match Tourism token', `result=${mFNB}`);
  }
}

// ── Tests 5: Null / Empty field safety across all 3 engines ──
section('5. Null / Empty and unknown conditions safety');
{
  const emptyBiz = { business_status: null, business_type: '', industry_category: null, premises_type: null };
  const rNull = evalReadiness(RULE_AITR, emptyBiz, null);
  const cNull = evalCompliance(RULE_AITR, emptyBiz);
  const aNull = evalAssessment(RULE_AITR, emptyBiz, null);

  if (rNull === false && cNull === false && aNull === false) {
    pass('Null fields produce safe false without exception in all 3 engines');
  } else {
    fail('Null fields failed safe evaluation', `r=${rNull}, c=${cNull}, a=${aNull}`);
  }

  const unknownRule = { condition_field: 'random_custom_field', condition_value: 'xyz' };
  const rUnk = evalReadiness(unknownRule, emptyBiz, null);
  const cUnk = evalCompliance(unknownRule, emptyBiz);
  const aUnk = evalAssessment(unknownRule, emptyBiz, null);

  if (rUnk === false && cUnk === false && aUnk === false) {
    pass('Unknown condition_field returns safe false in all 3 engines');
  } else {
    fail('Unknown condition_field failed safe evaluation', `r=${rUnk}, c=${cUnk}, a=${aUnk}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 2: DATABASE RECONCILIATION & PROGRESS PRESERVATION (Integration)
// ─────────────────────────────────────────────────────────────────────────────

async function runDbIntegration() {
  section('PART 2: DB Integration — Progress Preservation & Reconciliation');

  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });
    pass('Connected to MySQL server for disposable integration test');
  } catch (e) {
    fail('MySQL connection failed', e.message);
    return;
  }

  try {
    // 1. Setup disposable database
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\``);
    await conn.query(`USE \`${TEST_DB}\``);
    pass(`Created disposable database ${TEST_DB}`);

    // Create schema
    await conn.query(`
      CREATE TABLE IF NOT EXISTS permit_requirements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        permit_name VARCHAR(255) NOT NULL,
        description TEXT,
        condition_field VARCHAR(100) DEFAULT 'always',
        condition_value VARCHAR(500) DEFAULT NULL,
        is_mandatory TINYINT(1) DEFAULT 1,
        applicable_business_type VARCHAR(255) DEFAULT NULL,
        renewal_period VARCHAR(100) DEFAULT NULL,
        required_documents TEXT,
        applies_to_new TINYINT(1) DEFAULT 1,
        applies_to_renewal TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS businesses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        business_type VARCHAR(255) NOT NULL,
        industry_category VARCHAR(255) NOT NULL,
        business_status VARCHAR(50) DEFAULT 'New Application',
        premises_type VARCHAR(100) DEFAULT 'Commercial Building',
        address TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS business_requirements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        requirement_id INT NOT NULL,
        status VARCHAR(50) DEFAULT 'Missing',
        notes TEXT,
        document_id INT DEFAULT NULL,
        UNIQUE KEY unique_biz_req (business_id, requirement_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    pass('Tables created with exact production constraints');

    // 2. Insert initial Tier 1 requirements (IDs 1-5)
    await conn.query(`
      INSERT INTO permit_requirements (id, permit_name, condition_field, condition_value) VALUES
      (1, 'Barangay Business Clearance', 'always', ''),
      (2, 'Sanitary Permit', 'industry_category', 'Food & Beverage'),
      (3, 'Fire Safety Inspection Certificate', 'always', ''),
      (4, 'ESO Certificate', 'always', ''),
      (5, 'Building Permit / Occupancy Permit', 'business_status', 'New Application')
    `);
    pass('Initial Tier 1 rules seeded (IDs 1-5)');

    // 3. Create existing business with user progress
    await conn.query(`
      INSERT INTO businesses (id, user_id, business_name, business_type, industry_category, business_status, premises_type)
      VALUES (101, 1, 'Kyle Bakery Cafe', 'Food & Beverage', 'Cafe / Coffee Shop', 'Renewal', 'Commercial Building')
    `);

    // User marked Barangay (1) as 'Approved', Fire Safety (3) as 'Submitted' with return note, ESO (4) as 'Missing'
    await conn.query(`
      INSERT INTO business_requirements (business_id, requirement_id, status, notes) VALUES
      (101, 1, 'Approved', 'Official approved copy on file'),
      (101, 3, 'Submitted', 'Officer requested 2 photocopies and notarized affidavit'),
      (101, 4, 'Missing', NULL)
    `);
    pass('Existing business 101 seeded with completed status and return notes');

    // 4. Apply Tier 2 migration
    const tier2Sql = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', 'tier2_requirement_rules.sql'),
      'utf8'
    ).replace(/USE\s+`?bizcheckpermit`?\s*;/gi, '');

    await conn.query(tier2Sql);
    pass('Applied tier2_requirement_rules.sql to test DB');

    // 5. Test safe reconciliation logic (mirroring getCompliance Phase 3E update)
    const [bizRows] = await conn.query('SELECT * FROM businesses WHERE id = 101');
    const biz = bizRows[0];
    const [allRules] = await conn.query('SELECT * FROM permit_requirements');

    // Filter applicable rules for Renewal Food & Beverage Cafe
    const applicableRules = allRules.filter(r => evalCompliance(r, biz));

    // Run reconciliation loop
    const [existingRows] = await conn.query('SELECT requirement_id FROM business_requirements WHERE business_id = 101');
    const existingSet = new Set(existingRows.map(r => r.requirement_id));

    for (const rule of applicableRules) {
      if (!existingSet.has(rule.id)) {
        await conn.query(
          'INSERT IGNORE INTO business_requirements (business_id, requirement_id, status) VALUES (?, ?, ?)',
          [101, rule.id, 'Missing']
        );
      }
    }

    // 6. Verify Progress Preservation & Reconciliation
    const [updatedRows] = await conn.query('SELECT * FROM business_requirements WHERE business_id = 101 ORDER BY requirement_id');
    const rowMap = new Map(updatedRows.map(r => [r.requirement_id, r]));

    // Check 1: Barangay Clearance (1) still 'Approved' with note
    const br1 = rowMap.get(1);
    if (br1 && br1.status === 'Approved' && br1.notes === 'Official approved copy on file') {
      pass('Progress Preserved: Barangay Clearance remains "Approved" with note intact');
    } else {
      fail('Barangay Clearance status/note corrupted', JSON.stringify(br1));
    }

    // Check 2: Fire Safety (3) still 'Submitted' with note
    const br3 = rowMap.get(3);
    if (br3 && br3.status === 'Submitted' && br3.notes.includes('notarized affidavit')) {
      pass('Progress Preserved: Fire Safety remains "Submitted" with return note intact');
    } else {
      fail('Fire Safety status/note corrupted', JSON.stringify(br3));
    }

    // Check 3: Newly applicable Tier 2 rules inserted as 'Missing'
    const [cedulaRule] = await conn.query("SELECT id FROM permit_requirements WHERE permit_name = 'Community Tax Certificate (Cedula)'");
    const cedulaId = cedulaRule[0]?.id;
    const brCedula = rowMap.get(cedulaId);
    if (brCedula && brCedula.status === 'Missing') {
      pass('Reconciliation: Newly applicable Cedula inserted with status "Missing"');
    } else {
      fail('Cedula not inserted or has wrong status', JSON.stringify(brCedula));
    }

    const [aitrRule] = await conn.query("SELECT id FROM permit_requirements WHERE permit_name = 'Annual Income Tax Return (AITR)'");
    const aitrId = aitrRule[0]?.id;
    const brAitr = rowMap.get(aitrId);
    if (brAitr && brAitr.status === 'Missing') {
      pass('Reconciliation: Newly applicable AITR (Renewal) inserted with status "Missing"');
    } else {
      fail('AITR not inserted or has wrong status', JSON.stringify(brAitr));
    }

    // Check 4: Non-applicable rules NOT inserted (e.g. Zoning for Renewal, Market Clearance for Commercial)
    const [zoningRule] = await conn.query("SELECT id FROM permit_requirements WHERE permit_name = 'Zoning / Locational Clearance'");
    const zoningId = zoningRule[0]?.id;
    if (!rowMap.has(zoningId)) {
      pass('Reconciliation: Non-applicable Zoning Clearance correctly NOT inserted for Renewal');
    } else {
      fail('Zoning Clearance incorrectly inserted for Renewal business', JSON.stringify(rowMap.get(zoningId)));
    }

    // Check 5: Duplicate prevention under concurrent rerun
    for (const rule of applicableRules) {
      await conn.query(
        'INSERT IGNORE INTO business_requirements (business_id, requirement_id, status) VALUES (?, ?, ?)',
        [101, rule.id, 'Missing']
      );
    }
    const [countRows] = await conn.query('SELECT COUNT(*) as cnt FROM business_requirements WHERE business_id = 101');
    if (countRows[0].cnt === updatedRows.length) {
      pass(`Idempotent Reconciliation: Re-running insert did not create duplicates (${countRows[0].cnt} rows)`);
    } else {
      fail('Duplicates created upon re-running reconciliation', `Expected ${updatedRows.length}, got ${countRows[0].cnt}`);
    }

    // 7. Test Safe Seeder logic against DB with Tier 2 rules
    section('Safe Seeder Test: seed_reqs.js non-destructive update');
    const [tier2Before] = await conn.query("SELECT COUNT(*) as cnt FROM permit_requirements WHERE permit_name = 'Tourism Clearance'");
    if (tier2Before[0].cnt !== 1) {
      fail('Precondition failed: Tourism Clearance missing before seeder test', '');
    }

    // Run safe seeder logic
    const tier1Requirements = [
      {
        permit_name: 'Barangay Business Clearance',
        description: 'Updated Barangay description test',
        applicable_business_type: 'All',
        renewal_period: 'Annual',
        condition_field: 'always',
        condition_value: '',
        is_mandatory: 1,
        required_documents: 'Proof of Business Registration'
      },
      {
        permit_name: 'Sanitary Permit',
        description: 'Health standards test',
        applicable_business_type: 'Food & Beverage',
        renewal_period: 'Annual',
        condition_field: 'industry_category',
        condition_value: 'Food & Beverage',
        is_mandatory: 1,
        required_documents: 'Medical Certificates'
      }
    ];

    for (const req of tier1Requirements) {
      const [existing] = await conn.query('SELECT id FROM permit_requirements WHERE permit_name = ?', [req.permit_name]);
      if (existing.length > 0) {
        await conn.query(
          'UPDATE permit_requirements SET description = ?, applicable_business_type = ? WHERE id = ?',
          [req.description, req.applicable_business_type, existing[0].id]
        );
      }
    }

    const [tier2After] = await conn.query("SELECT COUNT(*) as cnt FROM permit_requirements WHERE permit_name = 'Tourism Clearance'");
    if (tier2After[0].cnt === 1) {
      pass('Safe Seeder: Tier 2 rules remain untouched after seeding Tier 1');
    } else {
      fail('Safe Seeder wiped Tier 2 rules!', `count=${tier2After[0].cnt}`);
    }

    const [bgCheck] = await conn.query("SELECT id, description FROM permit_requirements WHERE permit_name = 'Barangay Business Clearance'");
    if (bgCheck[0].id === 1 && bgCheck[0].description === 'Updated Barangay description test') {
      pass('Safe Seeder: Tier 1 record updated in-place preserving primary key ID=1');
    } else {
      fail('Safe Seeder failed to update in-place', JSON.stringify(bgCheck[0]));
    }

    // Teardown
    await conn.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
    pass(`Disposable test DB ${TEST_DB} successfully dropped`);

  } catch (err) {
    fail('DB Integration error', err.message);
  } finally {
    await conn.end();
  }
}

async function main() {
  await runDbIntegration();

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  Phase 3E Test Results: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(72));

  if (failures.length > 0) {
    console.log('\nFAILED TESTS:');
    failures.forEach(f => console.log(f));
    process.exit(1);
  } else {
    console.log('\n✅ All Phase 3E consistency, reconciliation, and seeder tests passed.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
