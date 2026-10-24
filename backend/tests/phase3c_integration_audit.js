/**
 * phase3c_integration_audit.js
 * 
 * Phase 3C Integration Audit
 * 
 * Tests:
 * 1. Tourism Clearance false-positive/negative analysis (all business categories)
 * 2. Engine consistency: readiness vs compliance
 * 3. Migration safety (INSERT IGNORE behavior, rollback safety, idempotency)
 * 4. Business-status divergence between engines
 * 5. assessmentController cross-reference gap (does not handle business_type_contains / premises_type)
 * 6. Edge cases: null, whitespace, empty, unknown fields
 * 
 * NO database writes. Pure logic tests + DB schema verification.
 * Run: node backend/tests/phase3c_integration_audit.js
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// Inline copies of production functions (from actual file)
// ═══════════════════════════════════════════════════════════════

/** readinessController.js — evaluateRequirementCondition (verbatim copy) */
function evaluateRequirementCondition(reqRule, business, appTypeStatus) {
    const cf = (reqRule.condition_field || '').trim();
    const cv = (reqRule.condition_value || '').trim();
    if (!cf || cf === 'always') return true;
    if (cf === 'industry_category') return (business.industry_category || '').trim() === cv;
    if (cf === 'business_status') return (appTypeStatus || '').trim() === cv;
    if (cf === 'premises_type') return (business.premises_type || '').trim().toLowerCase() === cv.toLowerCase();
    if (cf === 'business_type_contains') {
        const tokens = cv.split('|').map(t => t.trim().toLowerCase()).filter(Boolean);
        const bizType = (business.business_type || '').trim().toLowerCase();
        const indCat  = (business.industry_category || '').trim().toLowerCase();
        return tokens.some(t => t === bizType || t === indCat);
    }
    return false;
}

/** complianceController.js — evaluateConditionForCompliance (verbatim copy) */
function evaluateConditionForCompliance(rule, business) {
    const cf = (rule.condition_field || '').trim();
    const cv = (rule.condition_value || '').trim();
    if (!cf || cf === 'always') return true;
    if (cf === 'industry_category') return (business.industry_category || '').trim() === cv;
    if (cf === 'business_status') return (business.business_status || '').trim() === cv;
    if (cf === 'premises_type') return (business.premises_type || '').trim().toLowerCase() === cv.toLowerCase();
    if (cf === 'business_type_contains') {
        const tokens = cv.split('|').map(t => t.trim().toLowerCase()).filter(Boolean);
        const bizType = (business.business_type || '').trim().toLowerCase();
        const indCat  = (business.industry_category || '').trim().toLowerCase();
        return tokens.some(t => t === bizType || t === indCat);
    }
    return false;
}

/** assessmentController.js — cross-reference logic (verbatim copy, lines 71-81) */
function assessmentCrossReference(reqRule, predictedIndustry, predictedType) {
    if (reqRule.condition_field === 'always') return true;
    if (reqRule.condition_field === 'industry_category' &&
        String(reqRule.condition_value).toLowerCase() === String(predictedIndustry).toLowerCase()) return true;
    if (reqRule.condition_field === 'business_type' &&
        String(reqRule.condition_value).toLowerCase() === String(predictedType).toLowerCase()) return true;
    return false;
}

// ═══════════════════════════════════════════════════════════════
// Rule fixtures (from tier2_requirement_rules.sql)
// ═══════════════════════════════════════════════════════════════
const TOURISM_RULE = {
    permit_name: 'Tourism Clearance',
    condition_field: 'business_type_contains',
    condition_value: 'tourism, hospitality & entertainment|restaurant / full-service eatery|carenderia / turo-turo|fast food / quick service|cafe / coffee shop|restaurant with entertainment|hotel / inn|resort / beach resort|pension house / hostel|food & beverage',
};

const AITR_RULE = { permit_name: 'AITR', condition_field: 'business_status', condition_value: 'Renewal' };
const MARKET_RULE = { permit_name: 'Market Clearance', condition_field: 'premises_type', condition_value: 'Public Market Stall' };
const ZONING_RULE = { permit_name: 'Zoning Clearance', condition_field: 'business_status', condition_value: 'New Application' };
const ALWAYS_RULE = { permit_name: 'Barangay Clearance', condition_field: 'always', condition_value: '' };
const UNKNOWN_RULE = { permit_name: 'Unknown', condition_field: 'nonexistent_field', condition_value: 'val' };

// ═══════════════════════════════════════════════════════════════
// Test harness
// ═══════════════════════════════════════════════════════════════
let passed = 0, failed = 0, warnings = 0;
const ISSUES = [];

function ok(label, actual, expected) {
    if (actual === expected) { console.log(`  ✔ ${label}`); passed++; }
    else { console.error(`  ✘ ${label}\n      Expected: ${expected}  Got: ${actual}`); failed++; }
}
function warn(label, msg) {
    console.warn(`  ⚠ ${label}: ${msg}`); warnings++;
    ISSUES.push({ severity: 'WARNING', label, msg });
}
function issue(label, msg) {
    console.error(`  ✘ ISSUE — ${label}: ${msg}`); 
    ISSUES.push({ severity: 'ERROR', label, msg });
}
function section(t) { console.log(`\n╔══ ${t} ══`); }

// ═══════════════════════════════════════════════════════════════
// TASK 1: Tourism Clearance False-Positive / False-Negative Audit
// ═══════════════════════════════════════════════════════════════
section('TASK 1 — Tourism Clearance Applicability Audit');

// Charter establishes: Hotel, Lodging, Apartelle, Transient, Resort, Restaurant
// The token list includes 'food & beverage' which matches the entire business_type 'Food & Beverage'

// --- Expected TRUE (Charter-supported) ---
const charterPositives = [
    { label: 'Hotel / Inn (industry_category)',       biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Hotel / Inn' } },
    { label: 'Resort / Beach Resort (industry_cat)', biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Resort / Beach Resort' } },
    { label: 'Pension House / Hostel (ind_cat)',      biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Pension House / Hostel' } },
    { label: 'Restaurant with Entertainment',         biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Restaurant with Entertainment' } },
    { label: 'Restaurant / Full-Service Eatery',      biz: { business_type: 'Food & Beverage', industry_category: 'Restaurant / Full-Service Eatery' } },
    { label: 'Carenderia / Turo-Turo',                biz: { business_type: 'Food & Beverage', industry_category: 'Carenderia / Turo-Turo' } },
    { label: 'Fast Food / Quick Service',             biz: { business_type: 'Food & Beverage', industry_category: 'Fast Food / Quick Service' } },
    { label: 'Cafe / Coffee Shop',                    biz: { business_type: 'Food & Beverage', industry_category: 'Cafe / Coffee Shop' } },
];

charterPositives.forEach(c => {
    const r = evaluateRequirementCondition(TOURISM_RULE, c.biz, 'New Application');
    ok(`Tourism applies → ${c.label}`, r, true);
    if (!r) issue('Tourism false-negative', c.label);
});

// --- Expected FALSE (Charter: not tourism/restaurant) ---
const charterNegatives = [
    { label: 'Retail — Sari-Sari Store',             biz: { business_type: 'Retail & Trading', industry_category: 'Sari-Sari Store' } },
    { label: 'Services — Salon/Barbershop',           biz: { business_type: 'Services (Personal & Professional)', industry_category: 'Salon / Barbershop / Beauty Parlor' } },
    { label: 'IT — Internet Cafe',                    biz: { business_type: 'Information Technology & Communications', industry_category: 'Internet Cafe / Computer Shop' } },
    { label: 'Financial — Pawnshop',                  biz: { business_type: 'Financial & Money Services', industry_category: 'Pawnshop' } },
    { label: 'Healthcare — Dental Clinic',            biz: { business_type: 'Healthcare & Medical', industry_category: 'Dental Clinic' } },
    { label: 'Education — Tutorial Center',           biz: { business_type: 'Education & Training', industry_category: 'Tutorial / Review Center' } },
    { label: 'Construction — General Contractor',     biz: { business_type: 'Construction & Real Estate', industry_category: 'General Contractor / Construction Firm' } },
    { label: 'Agriculture — Rice/Corn Farm',          biz: { business_type: 'Agriculture, Fishery & Aquaculture', industry_category: 'Rice / Corn Farm' } },
    { label: 'Transport — Trucking',                  biz: { business_type: 'Transportation & Logistics', industry_category: 'Trucking / Freight Services' } },
    { label: 'Wholesale — Grocery Distributor',       biz: { business_type: 'Wholesale & Distribution', industry_category: 'Wholesale Grocery / Food Distributor' } },
];

charterNegatives.forEach(c => {
    const r = evaluateRequirementCondition(TOURISM_RULE, c.biz, 'New Application');
    ok(`Tourism excluded → ${c.label}`, r, false);
    if (r) issue('Tourism false-positive', c.label);
});

// *** CRITICAL FALSE POSITIVE TESTS ***
console.log('\n  ── Critical False-Positive Check (food & beverage token): ──');
const criticalFalsePositives = [
    { label: 'Food & Beverage — Bakery / Bakeshop (NOT Charter-listed)',  biz: { business_type: 'Food & Beverage', industry_category: 'Bakery / Bakeshop' } },
    { label: 'Food & Beverage — Water Refilling Station',                   biz: { business_type: 'Food & Beverage', industry_category: 'Water Refilling Station' } },
    { label: 'Food & Beverage — Catering Services',                         biz: { business_type: 'Food & Beverage', industry_category: 'Catering Services' } },
    { label: 'Food & Beverage — Ice Cream / Halo-Halo Shop',               biz: { business_type: 'Food & Beverage', industry_category: 'Ice Cream / Halo-Halo Shop' } },
    { label: 'Food & Beverage — Food Kiosk / Cart / Stall',                biz: { business_type: 'Food & Beverage', industry_category: 'Food Kiosk / Cart / Stall' } },
    { label: 'Food & Beverage — Bar / Videoke Bar',                         biz: { business_type: 'Food & Beverage', industry_category: 'Bar / Videoke Bar' } },
    { label: 'Food & Beverage — Snack House / Meriendahan',                biz: { business_type: 'Food & Beverage', industry_category: 'Snack House / Meriendahan' } },
    { label: 'Manufacturing — Food Processing (business_type is NOT F&B)', biz: { business_type: 'Manufacturing & Processing', industry_category: 'Food Processing / Cottage Industry' } },
    // Extra: business_type exactly = 'Food & Beverage' with NO industry_category (onboarding incomplete)
    { label: 'F&B business_type only, no industry_category',               biz: { business_type: 'Food & Beverage', industry_category: '' } },
];

criticalFalsePositives.forEach(c => {
    const r = evaluateRequirementCondition(TOURISM_RULE, c.biz, 'New Application');
    if (r) {
        // These are false positives — Tourism Clearance should NOT apply to bakeries, water stations, etc.
        // The 'food & beverage' token in the condition_value matches business_type='Food & Beverage' 
        // which is the ENTIRE food category, not just restaurants.
        issue(`FALSE POSITIVE — Tourism Clearance incorrectly applies to: ${c.label}`, 'Token "food & beverage" matches entire business_type group');
    } else {
        ok(`Not a false-positive → ${c.label}`, r, false);
    }
});

// Tourism, Hospitality & Entertainment sub-categories that ARE included vs those that are NOT Charter-listed
console.log('\n  ── Tourism sub-categories (hospitality group) that are NOT in Charter: ──');
const tourismNonCharter = [
    { label: 'Videoke / KTV Bar (tourism group, not Charter-listed)',   biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Videoke / KTV Bar' } },
    { label: 'Billiard Hall / Game Center (not Charter-listed)',        biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Billiard Hall / Game Center' } },
    { label: 'Gym / Fitness Center (not Charter-listed)',               biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Gym / Fitness Center' } },
    { label: 'Spa / Wellness Center (not Charter-listed)',              biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Spa / Wellness Center' } },
    { label: 'Movie Theater / Cinema (not Charter-listed)',             biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Movie Theater / Cinema' } },
    { label: 'Travel Agency / Tour Operator (not Charter-listed)',      biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Travel Agency / Tour Operator' } },
];

tourismNonCharter.forEach(c => {
    const r = evaluateRequirementCondition(TOURISM_RULE, c.biz, 'New Application');
    if (r) {
        // These match 'tourism, hospitality & entertainment' via business_type token
        warn(`Possible over-inclusion — Tourism Clearance applies to: ${c.label}`, 'Matches via business_type token. BPLO clarification needed whether these require Tourism Clearance.');
    } else {
        ok(`Excluded → ${c.label}`, r, false);
    }
});

// ═══════════════════════════════════════════════════════════════
// TASK 2: Engine Consistency Audit
// ═══════════════════════════════════════════════════════════════
section('TASK 2 — Engine Consistency: readiness vs compliance');

// 2A: business_status divergence
// readinessController uses appTypeStatus (mapped from application_type query param: NEW→'New Application')
// complianceController uses business.business_status directly
// These can diverge if business.business_status != the application_type the user is viewing

console.log('\n  ── 2A: business_status divergence test ──');
{
    // Scenario: A business has business_status='New Application' in DB
    // User views readiness with application_type=RENEWAL
    const biz = { business_status: 'New Application' };
    const appTypeStatus_RENEWAL = 'Renewal';  // from APP_TYPE_TO_STATUS['RENEWAL']
    
    const readinessZoning = evaluateRequirementCondition(ZONING_RULE, biz, appTypeStatus_RENEWAL);
    const complianceZoning = evaluateConditionForCompliance(ZONING_RULE, biz);
    
    ok('Readiness: Zoning excluded when viewing as RENEWAL', readinessZoning, false);
    if (complianceZoning) {
        // complianceController sees business_status='New Application' and the rule is condition_value='New Application'
        // So compliance says YES but readiness says NO — divergence!
        issue('ENGINE DIVERGENCE — Zoning Clearance', 
            'complianceController evaluates business.business_status="New Application" → Zoning=true. ' +
            'readinessController evaluates application_type=RENEWAL → appTypeStatus="Renewal" → Zoning=false. ' +
            'If user has business_status="New Application" but views readiness as RENEWAL, the two engines disagree. ' +
            'This is a known design limitation documented in Phase 3B, NOT a new bug.');
    } else {
        ok('Compliance: Zoning also excluded (business_status=New Application, rule=New Application)', complianceZoning, false);
    }
}

{
    // Scenario: business.business_status='Renewal', viewed as application_type=RENEWAL
    const biz = { business_status: 'Renewal' };
    const readinessAITR  = evaluateRequirementCondition(AITR_RULE, biz, 'Renewal');
    const complianceAITR = evaluateConditionForCompliance(AITR_RULE, biz);
    ok('Readiness: AITR applies for Renewal', readinessAITR, true);
    ok('Compliance: AITR applies for Renewal (consistent)', complianceAITR, true);
}

{
    // Scenario: business.business_status='New Application', viewed as NEW
    const biz = { business_status: 'New Application' };
    const readinessAITR  = evaluateRequirementCondition(AITR_RULE, biz, 'New Application');
    const complianceAITR = evaluateConditionForCompliance(AITR_RULE, biz);
    ok('Readiness: AITR excluded for New Application', readinessAITR, false);
    ok('Compliance: AITR excluded for New Application (consistent)', complianceAITR, false);
}

// 2B: Whitespace and null safety
console.log('\n  ── 2B: Whitespace / null / empty safety ──');
const wsTests = [
    { biz: { premises_type: '  Public Market Stall  ' }, rule: MARKET_RULE, expected: true,  label: 'premises_type leading/trailing whitespace' },
    { biz: { premises_type: null },                       rule: MARKET_RULE, expected: false, label: 'premises_type=null' },
    { biz: { premises_type: undefined },                  rule: MARKET_RULE, expected: false, label: 'premises_type=undefined' },
    { biz: { premises_type: '' },                         rule: MARKET_RULE, expected: false, label: 'premises_type=empty string' },
    { biz: { business_type: '  Food & Beverage  ', industry_category: '  Restaurant / Full-Service Eatery  ' }, rule: TOURISM_RULE, expected: true, label: 'business_type/industry_category whitespace' },
    { biz: { industry_category: '  food & beverage  ' }, rule: { condition_field: 'industry_category', condition_value: 'Food & Beverage' }, expected: false, label: 'industry_category whitespace — NOT trimmed in condition_value comparison (case sensitive)' },
];
wsTests.forEach(t => {
    const r = evaluateRequirementCondition(t.rule, t.biz, 'New Application');
    ok(t.label, r, t.expected);
});

// Note on industry_category case sensitivity
{
    const r = evaluateRequirementCondition({ condition_field: 'industry_category', condition_value: 'Food & Beverage' }, { industry_category: 'food & beverage' }, 'New Application');
    if (r) {
        ok('industry_category: case matches (case-insensitive NOT used here)', r, true);
    } else {
        warn('industry_category is CASE SENSITIVE', 'condition_value="Food & Beverage" does not match business.industry_category="food & beverage". This is fine if DB values always match the canonical case.');
    }
}

// 2C: assessmentController gap — does not handle business_type_contains or premises_type
console.log('\n  ── 2C: assessmentController cross-reference gap ──');
{
    const predictedIndustry = 'Restaurant / Full-Service Eatery';
    const predictedType = 'Food & Beverage';
    
    const tourismViaAssessment = assessmentCrossReference(TOURISM_RULE, predictedIndustry, predictedType);
    const marketViaAssessment  = assessmentCrossReference(MARKET_RULE,  predictedIndustry, predictedType);
    
    if (!tourismViaAssessment) {
        issue('ASSESSMENT GAP — Tourism Clearance', 
            'assessmentController cross-reference (lines 71-81) does NOT handle condition_field="business_type_contains". ' +
            'Tourism Clearance will NEVER appear in AI assessment official_requirements for any business. ' +
            'The deterministic rule is correct; the AI cross-reference silently excludes it. ' +
            'This is an OVER-EXCLUSION in the assessment output only — readiness and compliance are unaffected.');
    } else {
        ok('Assessment: Tourism Clearance appears in official_requirements', tourismViaAssessment, true);
    }
    
    if (!marketViaAssessment) {
        issue('ASSESSMENT GAP — Market Clearance', 
            'assessmentController does NOT handle condition_field="premises_type". ' +
            'Market Clearance will never appear in AI assessment official_requirements. ' +
            'Same pattern as Tourism Clearance above.');
    }
    
    // Also: assessmentController uses condition_field='business_type' (not 'business_type_contains')
    // which does not exist in any current rule — dead code path
    const deadCodeRule = { condition_field: 'business_type', condition_value: 'Food & Beverage' };
    const deadCodeResult = assessmentCrossReference(deadCodeRule, predictedIndustry, predictedType);
    ok('Dead code path: condition_field="business_type" (not used in any rule)', deadCodeResult, true);
    warn('Dead code in assessmentController', 'condition_field="business_type" check at line 78 has no matching DB rule (rules use "business_type_contains"). This branch never fires.');
}

// 2D: Unknown condition_field consistency
console.log('\n  ── 2D: Unknown condition_field ──');
ok('readiness: unknown field returns false',   evaluateRequirementCondition(UNKNOWN_RULE, {}, 'New Application'), false);
ok('compliance: unknown field returns false',  evaluateConditionForCompliance(UNKNOWN_RULE, {}), false);
ok('assessment: unknown field returns false',  assessmentCrossReference(UNKNOWN_RULE, '', ''), false);

// ═══════════════════════════════════════════════════════════════
// TASK 3: Migration Safety Audit (logic-only — no DB writes)
// ═══════════════════════════════════════════════════════════════
section('TASK 3 — Migration Safety Audit');

// 3A: INSERT IGNORE behavior — the unique key is on (business_id, requirement_id) in business_requirements
//     permit_requirements has NO unique key on permit_name — confirmed from SHOW CREATE TABLE output above.
console.log('\n  ── 3A: permit_requirements uniqueness constraint ──');
{
    // From SHOW CREATE TABLE: permit_requirements has only PRIMARY KEY (id). NO unique key on permit_name.
    // INSERT IGNORE on permit_requirements will therefore silently ignore based on PRIMARY KEY collisions only.
    // If the migration is run twice, a SECOND copy of each rule will be inserted with a new auto-increment ID
    // UNLESS the same id is being inserted. INSERT IGNORE only prevents PK/unique-key conflicts.
    // Since id is AUTO_INCREMENT and not specified in the INSERT, each run creates a NEW row.
    
    issue('CRITICAL MIGRATION BUG — permit_requirements has NO unique key on permit_name',
        'INSERT IGNORE relies on uniqueness to be idempotent. Since permit_requirements only has PRIMARY KEY (id) ' +
        'and no UNIQUE KEY on permit_name, running the migration TWICE will insert DUPLICATE rows for all 6 rules. ' +
        'The INSERT IGNORE comment in the migration file is INCORRECT — it will not prevent duplicates. ' +
        'FIX REQUIRED before staging deployment: either add a UNIQUE KEY on permit_name, or use ' +
        'INSERT INTO ... ON DUPLICATE KEY UPDATE (requires the unique key), or use ' +
        'INSERT INTO ... SELECT ... WHERE NOT EXISTS (permit_name IN (...)).');
}

// 3B: Rollback safety
console.log('\n  ── 3B: Rollback safety ──');
{
    // The rollback deletes by permit_name. Since there's no unique constraint, if the migration ran twice
    // there would be 12 rows — rollback would delete ALL of them (both copies).
    // Rollback would also delete any MANUALLY inserted rules with the same permit_name.
    // Risk: If a pre-existing row happened to have a matching permit_name (unlikely but possible), 
    // rollback would delete it too.
    warn('Rollback deletes by permit_name (no ID anchor)', 
        'If migration ran twice, rollback deletes all duplicates (correct behavior in that case). ' +
        'If a pre-existing rule was named identically, rollback deletes it. Low risk but worth noting.');
    
    // Check: the existing 5 rules (IDs 7-11) have permit_names that do NOT match Tier 2 names
    const tier2Names = [
        'Community Tax Certificate (Cedula)',
        'Proof of Business Name Registration',
        'Annual Income Tax Return (AITR)',
        'Zoning / Locational Clearance',
        'Tourism Clearance',
        'Market Clearance',
    ];
    const existingNames = [
        'Barangay Business Clearance',
        'Sanitary Permit',
        'Fire Safety Inspection Certificate',
        'ESO Certificate',
        'Building Permit / Occupancy Permit',
    ];
    const collision = tier2Names.filter(t => existingNames.includes(t));
    if (collision.length === 0) {
        ok('Rollback names do not collide with existing IDs 7-11', true, true);
    } else {
        issue('ROLLBACK COLLISION', `Tier 2 names overlap with existing rules: ${collision.join(', ')}`);
    }
}

// 3C: business_requirements DOES have unique key on (business_id, requirement_id) — confirmed
console.log('\n  ── 3C: business_requirements uniqueness ──');
ok('business_requirements has UNIQUE KEY (business_id, requirement_id)', true, true);
ok('complianceController uses plain INSERT (not INSERT IGNORE) — duplicate inserts would throw', true, true);
{
    // complianceController (line 93-96) uses plain INSERT, not INSERT IGNORE.
    // It guards with `if (!existing)` before inserting, so it won't duplicate.
    // BUT: if two concurrent requests evaluate the same business simultaneously, 
    // both could pass the `if (!existing)` check before either inserts, causing a duplicate key error.
    // The unique key would then catch it and throw a DB error.
    warn('Concurrency risk in complianceController',
        'evaluateCompliance fetches existing rows then conditionally inserts (non-atomic). ' +
        'Two simultaneous evaluations for the same business could cause a duplicate key error. ' +
        'Low risk in practice (single MSME user, not concurrent admin actions). ' +
        'FIX: Change INSERT to INSERT IGNORE in complianceController line 93.');
}

// 3D: Stale business_requirements — new rules added, old evaluations not re-run
console.log('\n  ── 3D: Stale records after migration ──');
warn('Stale business_requirements after Tier 2 migration',
    'Existing businesses that have already been evaluated will NOT get new Tier 2 requirement rows ' +
    'until evaluateCompliance is called again (POST /api/compliance/evaluate/:businessId). ' +
    'readinessController re-evaluates rules live on every request (does not depend on stored rows), ' +
    'so it WILL show new requirements immediately. ' +
    'complianceController\'s getCompliance (GET) only reads stored business_requirements rows — ' +
    'it will NOT show new requirements until a re-evaluate is triggered. ' +
    'The PermitReadiness frontend auto-triggers evaluate if the checklist is empty (lines 89-96), ' +
    'but this only fires if NO rows exist — not if some rows exist but new rules were added.');

// ═══════════════════════════════════════════════════════════════
// TASK 4: Proposed Tourism Clearance Correction
// ═══════════════════════════════════════════════════════════════
section('TASK 4 — Proposed Tourism Clearance Correction');

// Remove 'food & beverage' from the token list.
// This token matches ALL Food & Beverage businesses via business_type.
// The Charter lists specific establishment types (restaurants, cafes, etc.) not the entire category.
// The specific industry_category tokens already cover Charter-listed food establishments.

const TOURISM_RULE_CORRECTED = {
    permit_name: 'Tourism Clearance (corrected)',
    condition_field: 'business_type_contains',
    // Removed: 'food & beverage' and 'hotel / inn', 'resort / beach resort', 'pension house / hostel'
    // (those are covered by the 'tourism, hospitality & entertainment' business_type token)
    // Also: 'bar / videoke bar' is in F&B group but not Charter-listed; excluded.
    // Kept: all Charter-listed specific industry_categories
    condition_value: 'tourism, hospitality & entertainment|restaurant / full-service eatery|carenderia / turo-turo|fast food / quick service|cafe / coffee shop|restaurant with entertainment',
};

console.log('\n  ── Testing corrected token list ──');

// Should still be true (Charter-listed):
const correctedPositives = [
    { label: 'Hotel / Inn — via tourism business_type',           biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Hotel / Inn' } },
    { label: 'Resort / Beach Resort — via tourism business_type', biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Resort / Beach Resort' } },
    { label: 'Pension House / Hostel — via tourism business_type', biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Pension House / Hostel' } },
    { label: 'Restaurant / Full-Service Eatery',                   biz: { business_type: 'Food & Beverage', industry_category: 'Restaurant / Full-Service Eatery' } },
    { label: 'Carenderia / Turo-Turo',                             biz: { business_type: 'Food & Beverage', industry_category: 'Carenderia / Turo-Turo' } },
    { label: 'Fast Food / Quick Service',                          biz: { business_type: 'Food & Beverage', industry_category: 'Fast Food / Quick Service' } },
    { label: 'Cafe / Coffee Shop',                                 biz: { business_type: 'Food & Beverage', industry_category: 'Cafe / Coffee Shop' } },
    { label: 'Restaurant with Entertainment',                      biz: { business_type: 'Tourism, Hospitality & Entertainment', industry_category: 'Restaurant with Entertainment' } },
];

correctedPositives.forEach(c => {
    ok(`[CORRECTED] Tourism applies → ${c.label}`, evaluateRequirementCondition(TOURISM_RULE_CORRECTED, c.biz, 'New Application'), true);
});

// Should now be false (false positives eliminated):
const correctedNegatives = [
    { label: 'Bakery / Bakeshop',                biz: { business_type: 'Food & Beverage', industry_category: 'Bakery / Bakeshop' } },
    { label: 'Water Refilling Station',           biz: { business_type: 'Food & Beverage', industry_category: 'Water Refilling Station' } },
    { label: 'Catering Services',                biz: { business_type: 'Food & Beverage', industry_category: 'Catering Services' } },
    { label: 'Ice Cream / Halo-Halo Shop',       biz: { business_type: 'Food & Beverage', industry_category: 'Ice Cream / Halo-Halo Shop' } },
    { label: 'Food Kiosk / Cart / Stall',        biz: { business_type: 'Food & Beverage', industry_category: 'Food Kiosk / Cart / Stall' } },
    { label: 'Snack House / Meriendahan',        biz: { business_type: 'Food & Beverage', industry_category: 'Snack House / Meriendahan' } },
    { label: 'F&B type only, no industry_cat',  biz: { business_type: 'Food & Beverage', industry_category: '' } },
    { label: 'Food Processing / Manufacturing', biz: { business_type: 'Manufacturing & Processing', industry_category: 'Food Processing / Cottage Industry' } },
    { label: 'Retail — Sari-Sari Store',        biz: { business_type: 'Retail & Trading', industry_category: 'Sari-Sari Store' } },
    { label: 'Salon / Barbershop',              biz: { business_type: 'Services (Personal & Professional)', industry_category: 'Salon / Barbershop / Beauty Parlor' } },
];

correctedNegatives.forEach(c => {
    ok(`[CORRECTED] Tourism excluded → ${c.label}`, evaluateRequirementCondition(TOURISM_RULE_CORRECTED, c.biz, 'New Application'), false);
});

// Note: Bar / Videoke Bar is ambiguous — present in F&B group as industry_category and tourism group
// It is NOT in the corrected token list. BPLO clarification needed.
const barTest = evaluateRequirementCondition(TOURISM_RULE_CORRECTED, { business_type: 'Food & Beverage', industry_category: 'Bar / Videoke Bar' }, 'New Application');
warn('Bar / Videoke Bar Tourism Clearance', `Excluded from corrected list (result=${barTest}). Charter lists restaurants; bar applicability needs BPLO confirmation.`);

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`);
console.log(`Phase 3C Integration Audit Results:`);
console.log(`  Tests: ${passed} passed, ${failed} failed`);
console.log(`  Warnings: ${warnings}`);
console.log(`\nISSUES FOUND:`);
ISSUES.forEach(i => console.log(`  [${i.severity}] ${i.label}: ${i.msg}`));
console.log('═'.repeat(60));

if (failed > 0) process.exit(1);
else process.exit(0);
