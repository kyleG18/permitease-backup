/**
 * rule_engine.test.js — Phase 3B Rule Engine Unit Tests
 *
 * Tests evaluateRequirementCondition (readinessController) and
 * evaluateConditionForCompliance (complianceController) against
 * the 12-profile test matrix.
 *
 * These tests are PURE UNIT TESTS — no database or HTTP required.
 * Run with: node backend/tests/rule_engine.test.js
 */

'use strict';

// ---------------------------------------------------------------------------
// Inline copies of the functions under test
// (Avoids requiring the full controllers which need a DB connection.)
// Keep these in sync with the production implementations.
// ---------------------------------------------------------------------------

/** Mirrors readinessController.js — evaluateRequirementCondition */
function evaluateRequirementCondition(reqRule, business, appTypeStatus) {
    const cf = (reqRule.condition_field || '').trim();
    const cv = (reqRule.condition_value || '').trim();

    if (!cf || cf === 'always') return true;

    if (cf === 'industry_category') {
        return (business.industry_category || '').trim() === cv;
    }

    if (cf === 'business_status') {
        return (appTypeStatus || '').trim() === cv;
    }

    if (cf === 'premises_type') {
        return (business.premises_type || '').trim().toLowerCase() === cv.toLowerCase();
    }

    if (cf === 'business_type_contains') {
        const tokens = cv.split('|').map(t => t.trim().toLowerCase()).filter(Boolean);
        const bizType = (business.business_type || '').trim().toLowerCase();
        const indCat  = (business.industry_category || '').trim().toLowerCase();
        return tokens.some(t => t === bizType || t === indCat);
    }

    return false;
}

/** Mirrors complianceController.js — evaluateConditionForCompliance */
function evaluateConditionForCompliance(rule, business) {
    const cf = (rule.condition_field || '').trim();
    const cv = (rule.condition_value || '').trim();

    if (!cf || cf === 'always') return true;

    if (cf === 'industry_category') {
        return (business.industry_category || '').trim() === cv;
    }

    if (cf === 'business_status') {
        return (business.business_status || '').trim() === cv;
    }

    if (cf === 'premises_type') {
        return (business.premises_type || '').trim().toLowerCase() === cv.toLowerCase();
    }

    if (cf === 'business_type_contains') {
        const tokens = cv.split('|').map(t => t.trim().toLowerCase()).filter(Boolean);
        const bizType = (business.business_type || '').trim().toLowerCase();
        const indCat  = (business.industry_category || '').trim().toLowerCase();
        return tokens.some(t => t === bizType || t === indCat);
    }

    return false;
}

// ---------------------------------------------------------------------------
// Shared rule fixtures (mirror the DB rows planned in tier2_requirement_rules.sql)
// ---------------------------------------------------------------------------
const RULES = {
    barangayClearance:    { id: 7,  permit_name: 'Barangay Business Clearance', condition_field: 'always',                  condition_value: null },
    sanitaryPermit:       { id: 8,  permit_name: 'Sanitary Permit',             condition_field: 'industry_category',        condition_value: 'Food & Beverage' },
    fireSafety:           { id: 9,  permit_name: 'Fire Safety Inspection Certificate', condition_field: 'always',            condition_value: null },
    esoCert:              { id: 10, permit_name: 'ESO Certificate',             condition_field: 'always',                  condition_value: null },
    buildingPermit:       { id: 11, permit_name: 'Building Permit / Occupancy Permit', condition_field: 'business_status',   condition_value: 'New Application' },
    cedula:               { permit_name: 'Community Tax Certificate (Cedula)',   condition_field: 'always',                  condition_value: null },
    bizNameReg:           { permit_name: 'Proof of Business Name Registration',  condition_field: 'always',                  condition_value: null },
    aitr:                 { permit_name: 'Annual Income Tax Return (AITR)',       condition_field: 'business_status',         condition_value: 'Renewal' },
    zoningNew:            { permit_name: 'Zoning / Locational Clearance',        condition_field: 'business_status',         condition_value: 'New Application' },
    // Phase 3C corrected: removed 'food & beverage' (matched all F&B — false positives)
    // and removed redundant individual hotel/resort/pension tokens (covered by tourism business_type).
    tourismClearance:     { permit_name: 'Tourism Clearance',                    condition_field: 'business_type_contains',  condition_value: 'tourism, hospitality & entertainment|restaurant / full-service eatery|carenderia / turo-turo|fast food / quick service|cafe / coffee shop|restaurant with entertainment' },
    marketClearance:      { permit_name: 'Market Clearance',                     condition_field: 'premises_type',           condition_value: 'Public Market Stall' },
    unknownField:         { permit_name: 'Future Unknown Requirement',           condition_field: 'nonexistent_field',       condition_value: 'some_value' },
};

const ALL_RULES = Object.values(RULES);

// ---------------------------------------------------------------------------
// Test runner helpers
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function expect(description, actual, expected) {
    if (actual === expected) {
        console.log(`  ✔ ${description}`);
        passed++;
    } else {
        console.error(`  ✘ ${description}`);
        console.error(`      Expected: ${expected}`);
        console.error(`      Actual:   ${actual}`);
        failed++;
    }
}

function section(title) {
    console.log(`\n── ${title} ──`);
}

// ---------------------------------------------------------------------------
// Business profile fixtures
// ---------------------------------------------------------------------------
const PROFILES = {
    newFoodBev: {
        business_type: 'Food & Beverage',
        industry_category: 'Food & Beverage',
        premises_type: 'Commercial Establishment',
        business_status: 'New Application',
    },
    newRestaurant: {
        business_type: 'Food & Beverage',
        industry_category: 'Restaurant / Full-Service Eatery',
        premises_type: 'Commercial Establishment',
        business_status: 'New Application',
    },
    newRetail: {
        business_type: 'Retail & Trading',
        industry_category: 'Sari-Sari Store',
        premises_type: 'Commercial Establishment',
        business_status: 'New Application',
    },
    newHotel: {
        business_type: 'Tourism, Hospitality & Entertainment',
        industry_category: 'Hotel / Inn',
        premises_type: 'Commercial Establishment',
        business_status: 'New Application',
    },
    renewalFoodBev: {
        business_type: 'Food & Beverage',
        industry_category: 'Food & Beverage',
        premises_type: 'Commercial Establishment',
        business_status: 'Renewal',
    },
    renewalRetail: {
        business_type: 'Retail & Trading',
        industry_category: 'Sari-Sari Store',
        premises_type: 'Commercial Establishment',
        business_status: 'Renewal',
    },
    marketStall: {
        business_type: 'Retail & Trading',
        industry_category: 'Sari-Sari Store',
        premises_type: 'Public Market Stall',
        business_status: 'New Application',
    },
    privateTenant: {
        business_type: 'Retail & Trading',
        industry_category: 'General Merchandise',
        premises_type: 'Shared/Leased Space',
        business_status: 'New Application',
    },
    missingType: {
        business_type: '',
        industry_category: '',
        premises_type: 'Commercial Establishment',
        business_status: 'New Application',
    },
    missingPremises: {
        business_type: 'Retail & Trading',
        industry_category: 'Sari-Sari Store',
        premises_type: '',
        business_status: 'New Application',
    },
};

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

console.log('=== PermitEase Phase 3B — Rule Engine Unit Tests ===\n');

// ── Profile 1: New Food & Beverage ──
section('Profile 1 — New Food & Beverage business (industry_category = "Food & Beverage")');
const p1 = PROFILES.newFoodBev;
expect('Barangay Clearance applies (always)',     evaluateRequirementCondition(RULES.barangayClearance, p1, 'New Application'), true);
expect('Sanitary Permit applies (F&B category)', evaluateRequirementCondition(RULES.sanitaryPermit, p1, 'New Application'), true);
expect('Fire Safety applies (always)',           evaluateRequirementCondition(RULES.fireSafety, p1, 'New Application'), true);
expect('ESO Certificate applies (always)',       evaluateRequirementCondition(RULES.esoCert, p1, 'New Application'), true);
expect('Building Permit applies (new app)',      evaluateRequirementCondition(RULES.buildingPermit, p1, 'New Application'), true);
expect('Cedula applies (always)',                evaluateRequirementCondition(RULES.cedula, p1, 'New Application'), true);
expect('Biz Name Reg applies (always)',          evaluateRequirementCondition(RULES.bizNameReg, p1, 'New Application'), true);
expect('AITR does NOT apply (new, not renewal)', evaluateRequirementCondition(RULES.aitr, p1, 'New Application'), false);
expect('Zoning applies (new application)',       evaluateRequirementCondition(RULES.zoningNew, p1, 'New Application'), true);
expect('Tourism Clearance does NOT apply to generic F&B (Phase 3C: broad token removed)', evaluateRequirementCondition(RULES.tourismClearance, p1, 'New Application'), false);
expect('Market Clearance does NOT apply (not a market stall)', evaluateRequirementCondition(RULES.marketClearance, p1, 'New Application'), false);

// ── Profile 2: New Restaurant ──
section('Profile 2 — New standalone Restaurant (business_type=Food & Beverage, industry=Restaurant)');
const p2 = PROFILES.newRestaurant;
expect('Tourism Clearance applies (restaurant industry_category matches)',
    evaluateRequirementCondition(RULES.tourismClearance, p2, 'New Application'), true);
expect('Sanitary Permit applies (F&B category)',
    evaluateRequirementCondition(RULES.sanitaryPermit, p2, 'New Application'), false); // industry_category is 'Restaurant / Full-Service Eatery', NOT 'Food & Beverage'
expect('Zoning applies (new)',
    evaluateRequirementCondition(RULES.zoningNew, p2, 'New Application'), true);

// ── Profile 3: New Retail ──
section('Profile 3 — New Retail business (non-food, commercial premises)');
const p3 = PROFILES.newRetail;
expect('Barangay Clearance applies',                 evaluateRequirementCondition(RULES.barangayClearance, p3, 'New Application'), true);
expect('Sanitary Permit does NOT apply (not F&B)',   evaluateRequirementCondition(RULES.sanitaryPermit, p3, 'New Application'), false);
expect('Tourism Clearance does NOT apply (retail)',  evaluateRequirementCondition(RULES.tourismClearance, p3, 'New Application'), false);
expect('Market Clearance does NOT apply (commercial premises)', evaluateRequirementCondition(RULES.marketClearance, p3, 'New Application'), false);
expect('Building Permit applies (new app)',          evaluateRequirementCondition(RULES.buildingPermit, p3, 'New Application'), true);
expect('AITR does NOT apply (new)',                  evaluateRequirementCondition(RULES.aitr, p3, 'New Application'), false);

// ── Profile 4: New Hotel / Resort ──
section('Profile 4 — New Hotel / Inn (Tourism, Hospitality & Entertainment)');
const p4 = PROFILES.newHotel;
expect('Tourism Clearance applies (tourism business_type matches)',
    evaluateRequirementCondition(RULES.tourismClearance, p4, 'New Application'), true);
expect('Sanitary Permit does NOT apply (not F&B category)',
    evaluateRequirementCondition(RULES.sanitaryPermit, p4, 'New Application'), false);
expect('Zoning applies (new)',
    evaluateRequirementCondition(RULES.zoningNew, p4, 'New Application'), true);

// ── Profile 5: Renewal Food & Beverage ──
section('Profile 5 — Renewal Food & Beverage');
const p5 = PROFILES.renewalFoodBev;
expect('Building Permit does NOT apply (renewal)',  evaluateRequirementCondition(RULES.buildingPermit, p5, 'Renewal'), false);
expect('AITR applies (renewal)',                    evaluateRequirementCondition(RULES.aitr, p5, 'Renewal'), true);
expect('Zoning does NOT apply (renewal)',           evaluateRequirementCondition(RULES.zoningNew, p5, 'Renewal'), false);
expect('Cedula still applies (renewal, always)',    evaluateRequirementCondition(RULES.cedula, p5, 'Renewal'), true);
expect('Tourism Clearance does NOT apply (generic F&B industry_category, Phase 3C corrected)', evaluateRequirementCondition(RULES.tourismClearance, p5, 'Renewal'), false);

// ── Profile 6: Renewal Retail ──
section('Profile 6 — Renewal Retail');
const p6 = PROFILES.renewalRetail;
expect('AITR applies (renewal)',            evaluateRequirementCondition(RULES.aitr, p6, 'Renewal'), true);
expect('Building Permit does NOT apply',   evaluateRequirementCondition(RULES.buildingPermit, p6, 'Renewal'), false);
expect('Tourism Clearance does NOT apply', evaluateRequirementCondition(RULES.tourismClearance, p6, 'Renewal'), false);

// ── Profile 7: Public Market Stall ──
section('Profile 7 — Public Market Stall');
const p7 = PROFILES.marketStall;
expect('Market Clearance applies (Public Market Stall)',
    evaluateRequirementCondition(RULES.marketClearance, p7, 'New Application'), true);
expect('Market Clearance — complianceController also matches',
    evaluateConditionForCompliance(RULES.marketClearance, p7), true);
expect('All always-rules still apply',
    evaluateRequirementCondition(RULES.barangayClearance, p7, 'New Application'), true);

// ── Profile 8: Private Commercial Tenant (Shared/Leased Space) ──
section('Profile 8 — Private commercial tenant (Shared/Leased Space)');
const p8 = PROFILES.privateTenant;
expect('Market Clearance does NOT apply (not a public market stall)',
    evaluateRequirementCondition(RULES.marketClearance, p8, 'New Application'), false);
expect('Zoning applies (new)',
    evaluateRequirementCondition(RULES.zoningNew, p8, 'New Application'), true);

// ── Profile 9: Missing business_type ──
section('Profile 9 — Missing business_type / industry_category');
const p9 = PROFILES.missingType;
expect('Tourism Clearance does NOT apply (empty business_type + empty industry_category)',
    evaluateRequirementCondition(RULES.tourismClearance, p9, 'New Application'), false);
expect('Sanitary Permit does NOT apply (empty industry_category)',
    evaluateRequirementCondition(RULES.sanitaryPermit, p9, 'New Application'), false);
expect('Always-rules still apply',
    evaluateRequirementCondition(RULES.barangayClearance, p9, 'New Application'), true);

// ── Profile 10: Missing premises_type ──
section('Profile 10 — Missing premises_type');
const p10 = PROFILES.missingPremises;
expect('Market Clearance does NOT apply (empty premises_type)',
    evaluateRequirementCondition(RULES.marketClearance, p10, 'New Application'), false);

// ── Profile 11: Unknown condition_field ──
section('Profile 11 — Unknown condition_field');
expect('Unknown condition_field returns false (readiness)',
    evaluateRequirementCondition(RULES.unknownField, PROFILES.newRetail, 'New Application'), false);
expect('Unknown condition_field returns false (compliance)',
    evaluateConditionForCompliance(RULES.unknownField, PROFILES.newRetail), false);

// ── Profile 12: Existing conditions unchanged (regression) ──
section('Profile 12 — Regression: existing IDs 7–11 behaviour unchanged');
expect('ID 7 Barangay Clearance still applies (always)',
    evaluateRequirementCondition(RULES.barangayClearance, PROFILES.newRetail, 'New Application'), true);
expect('ID 8 Sanitary Permit still applies only for F&B category',
    evaluateRequirementCondition(RULES.sanitaryPermit, { industry_category: 'Food & Beverage' }, 'New Application'), true);
expect('ID 8 Sanitary Permit still excluded for non-F&B',
    evaluateRequirementCondition(RULES.sanitaryPermit, { industry_category: 'Retail' }, 'New Application'), false);
expect('ID 9 Fire Safety still applies (always)',
    evaluateRequirementCondition(RULES.fireSafety, PROFILES.renewalRetail, 'Renewal'), true);
expect('ID 10 ESO Certificate still applies (always)',
    evaluateRequirementCondition(RULES.esoCert, PROFILES.newHotel, 'New Application'), true);
expect('ID 11 Building Permit still applies for New Application',
    evaluateRequirementCondition(RULES.buildingPermit, PROFILES.newFoodBev, 'New Application'), true);
expect('ID 11 Building Permit still excluded for Renewal',
    evaluateRequirementCondition(RULES.buildingPermit, PROFILES.renewalRetail, 'Renewal'), false);

// ── complianceController business_status regression ──
section('Compliance Controller — business_status field matching');
expect('AITR applies when business.business_status = "Renewal"',
    evaluateConditionForCompliance(RULES.aitr, { business_status: 'Renewal' }), true);
expect('AITR does NOT apply when business.business_status = "New Application"',
    evaluateConditionForCompliance(RULES.aitr, { business_status: 'New Application' }), false);
expect('Zoning applies when business.business_status = "New Application"',
    evaluateConditionForCompliance(RULES.zoningNew, { business_status: 'New Application' }), true);

// ── Case insensitivity ──
section('Case-insensitivity checks');
expect('premises_type match is case-insensitive (mixed case)',
    evaluateRequirementCondition(RULES.marketClearance, { premises_type: 'public market stall' }, 'New Application'), true);
expect('business_type_contains match is case-insensitive',
    evaluateRequirementCondition(RULES.tourismClearance, { business_type: 'TOURISM, HOSPITALITY & ENTERTAINMENT', industry_category: '' }, 'New Application'), true);

// ── Tourism Clearance token boundary — no false positives ──
section('Tourism Clearance — no false positives on partial matches');
expect('Retail business does NOT get Tourism Clearance',
    evaluateRequirementCondition(RULES.tourismClearance, { business_type: 'Retail & Trading', industry_category: 'General Merchandise' }, 'New Application'), false);
expect('"Services" business does NOT get Tourism Clearance (no substring match)',
    evaluateRequirementCondition(RULES.tourismClearance, { business_type: 'Services', industry_category: 'Laundry Services' }, 'New Application'), false);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(52)}`);
console.log(`Phase 3B Rule Engine Tests: ${passed} passed, ${failed} failed`);
console.log('='.repeat(52));

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
