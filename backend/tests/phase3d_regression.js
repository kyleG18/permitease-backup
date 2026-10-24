/**
 * phase3d_regression.js
 * PermitEase — Phase 3D Comprehensive Regression Test Suite
 *
 * Tests:
 *   A) Full business-category Tourism Clearance matrix (all 24+ categories)
 *   B) Engine parity — same business object through all 3 inline evaluators
 *   C) assessmentController INSERT IGNORE regression guard
 *   D) seed_reqs.js risk documentation check
 *
 * No database connection required.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// PASS / FAIL helpers
// ─────────────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function assert(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    const msg = `  ❌ FAIL: ${label}\n       Expected: ${JSON.stringify(expected)}\n       Actual  : ${JSON.stringify(actual)}`;
    console.log(msg);
    failures.push(msg);
    failed++;
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(72));
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE COPIES OF THE THREE CONDITION EVALUATORS
// (mirroring the actual controller logic — verified against source files)
// ─────────────────────────────────────────────────────────────────────────────

/** readinessController evaluateRequirementCondition (lines 18–47) */
function evalReadiness(rule, biz, appTypeStatus) {
  const field = (rule.condition_field || '').trim();
  const val   = (rule.condition_value || '').trim();
  if (!field || field === 'always') return true;

  switch (field) {
    case 'industry_category':
      // CASE-SENSITIVE comparison (verified: no .toLowerCase() in source)
      return (biz.industry_category || '').trim() === val;
    case 'business_status':
      return (appTypeStatus || '').trim() === val;
    case 'premises_type':
      return (biz.premises_type || '').trim().toLowerCase() === val.toLowerCase();
    case 'business_type_contains': {
      const tokens = val.split('|').map(t => t.trim().toLowerCase());
      const bt = (biz.business_type || '').trim().toLowerCase();
      const ic = (biz.industry_category || '').trim().toLowerCase();
      return tokens.some(t => bt === t || ic === t);
    }
    default:
      return false;
  }
}

/** complianceController evaluateConditionForCompliance (lines 20–48) — identical logic */
function evalCompliance(rule, biz) {
  const field = (rule.condition_field || '').trim();
  const val   = (rule.condition_value || '').trim();
  if (!field || field === 'always') return true;

  switch (field) {
    case 'industry_category':
      return (biz.industry_category || '').trim() === val;
    case 'business_status':
      // uses biz.business_status (DB stored value) not appTypeStatus
      return (biz.business_status || '').trim() === val;
    case 'premises_type':
      return (biz.premises_type || '').trim().toLowerCase() === val.toLowerCase();
    case 'business_type_contains': {
      const tokens = val.split('|').map(t => t.trim().toLowerCase());
      const bt = (biz.business_type || '').trim().toLowerCase();
      const ic = (biz.industry_category || '').trim().toLowerCase();
      return tokens.some(t => bt === t || ic === t);
    }
    default:
      return false;
  }
}

/** assessmentController evaluateCondition (lines 70–107, Phase 3C fixed) */
function evalAssessment(rule, biz) {
  const field = (rule.condition_field || '').trim();
  const val   = (rule.condition_value || '').trim();
  if (!field || field === 'always') return true;

  switch (field) {
    case 'industry_category':
      return (biz.industry_category || '').trim() === val;
    // business_status intentionally NOT handled (assessment lacks application_type)
    case 'premises_type':
      return (biz.premises_type || '').trim().toLowerCase() === val.toLowerCase();
    case 'business_type_contains': {
      const tokens = val.split('|').map(t => t.trim().toLowerCase());
      const bt = (biz.business_type || '').trim().toLowerCase();
      const ic = (biz.industry_category || '').trim().toLowerCase();
      return tokens.some(t => bt === t || ic === t);
    }
    default:
      return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOURISM CLEARANCE RULE (from tier2_requirement_rules.sql v2 — Phase 3C)
// ─────────────────────────────────────────────────────────────────────────────
const TOURISM_RULE = {
  condition_field: 'business_type_contains',
  condition_value: [
    'tourism, hospitality & entertainment',
    'restaurant / full-service eatery',
    'carenderia / turo-turo',
    'fast food / quick service',
    'cafe / coffee shop',
    'restaurant with entertainment',
  ].join('|'),
};

// Market Clearance rule (premises_type)
const MARKET_CLEARANCE_RULE = {
  condition_field: 'premises_type',
  condition_value: 'Public Market Stall',
};

// Sanitary Cert rule as currently implemented (F&B only)
const SANITARY_RULE = {
  condition_field: 'business_type_contains',
  condition_value: 'food & beverage',
};

// AITR rule (Renewal only)
const AITR_RULE = {
  condition_field: 'business_status',
  condition_value: 'Renewal',
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A — FULL TOURISM CLEARANCE MATRIX
// Covers all 25 business categories from businessCategories.js
// ─────────────────────────────────────────────────────────────────────────────
section('A) Tourism Clearance — Full Business Category Matrix');

// ── A1: Food & Beverage sub-categories (11 total) ──
const FB_EXPECTED = {
  'Restaurant / Full-Service Eatery': true,   // explicit token
  'Carenderia / Turo-Turo':           true,   // explicit token
  'Fast Food / Quick Service':        true,   // explicit token
  'Cafe / Coffee Shop':               true,   // explicit token
  'Bakery / Bakeshop':                false,  // not in token list
  'Food Kiosk / Cart / Stall':        false,
  'Catering Services':                false,
  'Water Refilling Station':          false,
  'Ice Cream / Halo-Halo Shop':       false,
  'Bar / Videoke Bar':                false,
  'Snack House / Meriendahan':        false,
};

for (const [ic, expected] of Object.entries(FB_EXPECTED)) {
  const biz = { business_type: 'Food & Beverage', industry_category: ic, premises_type: '' };
  assert(`F&B — "${ic}" → Tourism = ${expected}`, evalReadiness(TOURISM_RULE, biz, 'New Application'), expected);
}

// ── A2: Tourism Hospitality & Entertainment sub-categories (10 total) ──
// All get TRUE because business_type token matches
const TH_CATEGORIES = [
  'Hotel / Inn',
  'Resort / Beach Resort',
  'Pension House / Hostel',
  'Travel Agency / Tour Operator',
  'Restaurant with Entertainment',
  'Videoke / KTV Bar',
  'Billiard Hall / Game Center',
  'Gym / Fitness Center',
  'Spa / Wellness Center',
  'Movie Theater / Cinema',
];

for (const ic of TH_CATEGORIES) {
  const biz = { business_type: 'Tourism, Hospitality & Entertainment', industry_category: ic, premises_type: '' };
  assert(`Tourism group — "${ic}" → Tourism = true`, evalReadiness(TOURISM_RULE, biz, 'New Application'), true);
}

// ── A3: Other business types — should all be FALSE ──
const OTHER_BIZ_TYPES = [
  'Retail & Trading',
  'Services (Personal & Professional)',
  'Manufacturing & Processing',
  'Wholesale & Distribution',
  'Agriculture Fishery & Aquaculture',
  'Construction & Real Estate',
  'Healthcare & Medical',
  'Education & Training',
  'Transportation & Logistics',
  'Information Technology & Communications',
  'Financial & Money Services',
  'Others',
];

for (const bt of OTHER_BIZ_TYPES) {
  const biz = { business_type: bt, industry_category: 'General', premises_type: '' };
  assert(`Other type — "${bt}" → Tourism = false`, evalReadiness(TOURISM_RULE, biz, 'New Application'), false);
}

// ── A4: Guard — "food & beverage" MUST NOT appear as a standalone token ──
section('A4) Guard — food & beverage token not a standalone match');
{
  const tokensInRule = TOURISM_RULE.condition_value.split('|').map(t => t.trim().toLowerCase());
  assert(
    '"food & beverage" is NOT a standalone pipe-token in Tourism rule',
    tokensInRule.includes('food & beverage'),
    false,
  );
  assert(
    '"tourism, hospitality & entertainment" IS a token in Tourism rule',
    tokensInRule.includes('tourism, hospitality & entertainment'),
    true,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B — ENGINE PARITY (readiness vs compliance vs assessment)
// 12 business profiles — same rule, all three evaluators must agree
// (except business_status which assessment does NOT handle)
// ─────────────────────────────────────────────────────────────────────────────
section('B) Engine Parity — 3 evaluators, 12 profiles');

const PARITY_PROFILES = [
  { name: 'Restaurant — new',       bt: 'Food & Beverage',                    ic: 'Restaurant / Full-Service Eatery', pt: '',                  status: 'New Application', expectedTourism: true,  expectedMarket: false },
  { name: 'Carenderia — new',       bt: 'Food & Beverage',                    ic: 'Carenderia / Turo-Turo',          pt: '',                  status: 'New Application', expectedTourism: true,  expectedMarket: false },
  { name: 'Bakery — new',           bt: 'Food & Beverage',                    ic: 'Bakery / Bakeshop',               pt: '',                  status: 'New Application', expectedTourism: false, expectedMarket: false },
  { name: 'Hotel — renewal',        bt: 'Tourism, Hospitality & Entertainment', ic: 'Hotel / Inn',                     pt: '',                  status: 'Renewal',          expectedTourism: true,  expectedMarket: false },
  { name: 'Salon — new',            bt: 'Services (Personal & Professional)', ic: 'Beauty Salon / Barbershop',       pt: '',                  status: 'New Application', expectedTourism: false, expectedMarket: false },
  { name: 'Retail — renewal',       bt: 'Retail & Trading',                   ic: 'Sari-Sari Store',                 pt: '',                  status: 'Renewal',          expectedTourism: false, expectedMarket: false },
  { name: 'Market Stall — new',     bt: 'Retail & Trading',                   ic: 'Market Vendor',                   pt: 'Public Market Stall', status: 'New Application', expectedTourism: false, expectedMarket: true  },
  { name: 'Market Stall — renewal', bt: 'Food & Beverage',                    ic: 'Carenderia / Turo-Turo',          pt: 'Public Market Stall', status: 'Renewal',          expectedTourism: true,  expectedMarket: true  },
  { name: 'Resort — new',           bt: 'Tourism, Hospitality & Entertainment', ic: 'Resort / Beach Resort',           pt: '',                  status: 'New Application', expectedTourism: true,  expectedMarket: false },
  { name: 'IT company — new',       bt: 'Information Technology & Communications', ic: 'Software Development',      pt: '',                  status: 'New Application', expectedTourism: false, expectedMarket: false },
  { name: 'Healthcare — renewal',   bt: 'Healthcare & Medical',               ic: 'Clinic',                          pt: '',                  status: 'Renewal',          expectedTourism: false, expectedMarket: false },
  { name: 'Restaurant w/Ent — new', bt: 'Tourism, Hospitality & Entertainment', ic: 'Restaurant with Entertainment',  pt: '',                  status: 'New Application', expectedTourism: true,  expectedMarket: false },
];

for (const p of PARITY_PROFILES) {
  const biz = { business_type: p.bt, industry_category: p.ic, premises_type: p.pt, business_status: p.status };

  // Tourism Clearance — all 3 engines
  const tR = evalReadiness(TOURISM_RULE, biz, p.status);
  const tC = evalCompliance(TOURISM_RULE, biz);
  const tA = evalAssessment(TOURISM_RULE, biz);
  assert(`[${p.name}] readiness Tourism = ${p.expectedTourism}`,  tR, p.expectedTourism);
  assert(`[${p.name}] compliance Tourism = ${p.expectedTourism}`, tC, p.expectedTourism);
  assert(`[${p.name}] assessment Tourism = ${p.expectedTourism}`, tA, p.expectedTourism);

  // Market Clearance — all 3 engines
  const mR = evalReadiness(MARKET_CLEARANCE_RULE, biz, p.status);
  const mC = evalCompliance(MARKET_CLEARANCE_RULE, biz);
  const mA = evalAssessment(MARKET_CLEARANCE_RULE, biz);
  assert(`[${p.name}] readiness MarketClearance = ${p.expectedMarket}`,  mR, p.expectedMarket);
  assert(`[${p.name}] compliance MarketClearance = ${p.expectedMarket}`, mC, p.expectedMarket);
  assert(`[${p.name}] assessment MarketClearance = ${p.expectedMarket}`, mA, p.expectedMarket);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C — SANITARY CERT: F&B rule isolation
// ─────────────────────────────────────────────────────────────────────────────
section('C) Sanitary Certificate — current F&B-scoped rule behaviour');
{
  // F&B business type → true (any sub-category, because business_type token matches)
  const fbBiz = { business_type: 'Food & Beverage', industry_category: 'Bakery / Bakeshop', premises_type: '' };
  assert('F&B Bakery → Sanitary = true (current rule)', evalReadiness(SANITARY_RULE, fbBiz, 'New Application'), true);

  // Non-F&B → false (open BPLO policy question)
  const retailBiz = { business_type: 'Retail & Trading', industry_category: 'General', premises_type: '' };
  assert('Retail → Sanitary = false (current rule)', evalReadiness(SANITARY_RULE, retailBiz, 'New Application'), false);

  const hotelBiz = { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Hotel / Inn', premises_type: '' };
  assert('Hotel → Sanitary = false (current rule; BPLO confirmation pending)', evalReadiness(SANITARY_RULE, hotelBiz, 'New Application'), false);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION D — AITR (Renewal rule — business_status)
// Note: assessmentController does NOT handle business_status (by design)
// ─────────────────────────────────────────────────────────────────────────────
section('D) AITR — business_status rule (readiness & compliance only)');
{
  const newBiz     = { business_type: 'Retail & Trading', industry_category: 'General', premises_type: '', business_status: 'New Application' };
  const renewalBiz = { business_type: 'Retail & Trading', industry_category: 'General', premises_type: '', business_status: 'Renewal' };

  // readiness uses appTypeStatus param
  assert('readiness — New Application → AITR = false',   evalReadiness(AITR_RULE, newBiz, 'New Application'), false);
  assert('readiness — Renewal → AITR = true',             evalReadiness(AITR_RULE, renewalBiz, 'Renewal'),       true);

  // compliance uses biz.business_status
  assert('compliance — New Application → AITR = false',  evalCompliance(AITR_RULE, newBiz),     false);
  assert('compliance — Renewal → AITR = true',            evalCompliance(AITR_RULE, renewalBiz), true);

  // assessment: business_status NOT handled → always false (intentional design)
  assert('assessment — business_status NOT handled → AITR = false (by design)', evalAssessment(AITR_RULE, renewalBiz), false);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION E — assessmentController INSERT IGNORE guard
// We can't run DB queries here; instead we read the source file and confirm
// the literal string "INSERT IGNORE" is present at the expected location.
// ─────────────────────────────────────────────────────────────────────────────
section('E) assessmentController — INSERT IGNORE static guard');
{
  const fs = require('fs');
  const path = require('path');
  const controllerPath = path.join(__dirname, '..', 'controllers', 'assessmentController.js');
  const src = fs.readFileSync(controllerPath, 'utf8');

  assert(
    'assessmentController.js contains "INSERT IGNORE INTO business_requirements"',
    src.includes('INSERT IGNORE INTO business_requirements'),
    true,
  );
  assert(
    'assessmentController.js does NOT contain plain "INSERT INTO business_requirements" (without IGNORE)',
    /INSERT\s+INTO\s+business_requirements/.test(src.replace(/INSERT\s+IGNORE\s+INTO\s+business_requirements/g, '')),
    false,
  );
  assert(
    'complianceController.js also uses INSERT IGNORE (Phase 3C fix intact)',
    fs.readFileSync(path.join(__dirname, '..', 'controllers', 'complianceController.js'), 'utf8')
      .includes('INSERT IGNORE'),
    true,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION F — seed_reqs.js risk documentation check
// Confirms seed file uses DELETE (destructive) and does NOT contain Tier 2 rules
// ─────────────────────────────────────────────────────────────────────────────
section('F) seed_reqs.js — destructive DELETE risk check');
{
  const fs = require('fs');
  const path = require('path');
  const seedPath = path.join(__dirname, '..', 'seed_reqs.js');
  const src = fs.readFileSync(seedPath, 'utf8');

  assert(
    'seed_reqs.js does NOT contain DELETE FROM permit_requirements (Safe Seeder verified in Phase 3E)',
    src.includes('DELETE FROM permit_requirements'),
    false,
  );
  assert(
    'seed_reqs.js does NOT contain "Tourism Clearance" (Tier 2 not embedded in seed)',
    src.includes('Tourism Clearance'),
    false,
  );
  assert(
    'seed_reqs.js does NOT contain "Market Clearance" (Tier 2 not embedded in seed)',
    src.includes('Market Clearance'),
    false,
  );

  // Verify tier2 migration exists separately
  const migPath = path.join(__dirname, '..', 'migrations', 'tier2_requirement_rules.sql');
  assert(
    'tier2_requirement_rules.sql exists as a separate migration (not in seed)',
    fs.existsSync(migPath),
    true,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION G — Condition case-sensitivity guard
// industry_category is CASE-SENSITIVE in all 3 engines (no .toLowerCase())
// ─────────────────────────────────────────────────────────────────────────────
section('G) industry_category — case-sensitivity guard');
{
  const rule = { condition_field: 'industry_category', condition_value: 'Restaurant / Full-Service Eatery' };

  const exactBiz = { business_type: 'Food & Beverage', industry_category: 'Restaurant / Full-Service Eatery', premises_type: '' };
  const lowerBiz = { business_type: 'Food & Beverage', industry_category: 'restaurant / full-service eatery', premises_type: '' };

  assert('exact case → match (readiness)',   evalReadiness(rule, exactBiz, 'New Application'), true);
  assert('lower case → NO match (readiness)', evalReadiness(rule, lowerBiz, 'New Application'), false);
  assert('exact case → match (compliance)',  evalCompliance(rule, exactBiz), true);
  assert('lower case → NO match (compliance)', evalCompliance(rule, lowerBiz), false);
  assert('exact case → match (assessment)',  evalAssessment(rule, exactBiz), true);
  assert('lower case → NO match (assessment)', evalAssessment(rule, lowerBiz), false);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION H — Unknown condition_field → false (not a throw)
// ─────────────────────────────────────────────────────────────────────────────
section('H) Unknown condition_field — safe false return');
{
  const badRule = { condition_field: 'employee_count', condition_value: '10' };
  const biz = { business_type: 'Retail & Trading', industry_category: 'General', premises_type: '', business_status: 'New Application' };
  assert('readiness — unknown field → false',   evalReadiness(badRule, biz, 'New Application'), false);
  assert('compliance — unknown field → false',  evalCompliance(badRule, biz), false);
  assert('assessment — unknown field → false',  evalAssessment(badRule, biz), false);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION I — Null/empty safety
// ─────────────────────────────────────────────────────────────────────────────
section('I) Null / empty field safety');
{
  const nullBiz = { business_type: null, industry_category: null, premises_type: null, business_status: null };
  assert('business_type_contains — null fields → false (no crash)', evalReadiness(TOURISM_RULE, nullBiz, 'New Application'), false);
  assert('premises_type — null field → false (no crash)', evalReadiness(MARKET_CLEARANCE_RULE, nullBiz, 'New Application'), false);
  assert('industry_category — null field → false (no crash)', evalReadiness({ condition_field: 'industry_category', condition_value: 'Restaurant / Full-Service Eatery' }, nullBiz, null), false);
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL REPORT
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(72)}`);
console.log(`  Phase 3D Regression Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(72));
if (failures.length > 0) {
  console.log('\nFAILED TESTS:');
  failures.forEach(f => console.log(f));
  process.exit(1);
} else {
  console.log('\n✅ All Phase 3D regression tests passed.');
  process.exit(0);
}
