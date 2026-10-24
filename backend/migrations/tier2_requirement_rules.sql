-- =============================================================================
-- PermitEase — Tier 2 Requirement Rules Migration (v2 — Phase 3C corrected)
-- STAGING ONLY — DO NOT APPLY TO PRODUCTION WITHOUT BPLO SIGN-OFF
-- =============================================================================
-- Source: Municipality of Roxas, Oriental Mindoro — Citizen's Charter
--         https://www.roxasormin.com/citizens-charter/securing-mayor-s-permit-business-permit
--
-- CHANGES FROM v1 (Phase 3B):
--   1. Replaced INSERT IGNORE with INSERT...WHERE NOT EXISTS guards.
--      permit_requirements has no UNIQUE KEY on permit_name; INSERT IGNORE was NOT idempotent.
--   2. Removed 'food & beverage' from Tourism Clearance condition_value.
--      That token matched the entire Food & Beverage business_type (all 11 sub-categories),
--      causing false positives for bakeries, water refilling stations, catering services, etc.
--      The specific industry_category tokens already cover the Charter-listed food establishments.
--   3. Corrected Tourism Clearance description to remove the vague "and similar" phrase.
--
-- Idempotency: Each statement is guarded by WHERE NOT EXISTS on permit_name.
-- Running the migration twice is now safe — no duplicates will be created.
--
-- IMPORTANT: Deploy readinessController.js and complianceController.js (Phase 3B) FIRST.
-- The 'business_type_contains' and 'premises_type' condition types must be live before
-- these rules are inserted.
--
-- Existing permit_requirement IDs 7–11 are NOT touched.
-- =============================================================================

-- Create migration ledger table to track exact records created by migrations
CREATE TABLE IF NOT EXISTS schema_migration_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    permit_name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_migration_record (migration_name, table_name, record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Snapshot pre-existing rules matching Tier 2 names into temporary table
CREATE TEMPORARY TABLE IF NOT EXISTS _pre_existing_tier2 (
    id INT PRIMARY KEY,
    permit_name VARCHAR(255)
);

TRUNCATE TABLE _pre_existing_tier2;

INSERT INTO _pre_existing_tier2 (id, permit_name)
SELECT id, permit_name FROM permit_requirements
WHERE permit_name IN (
    'Community Tax Certificate (Cedula)',
    'Proof of Business Name Registration',
    'Annual Income Tax Return (AITR)',
    'Zoning / Locational Clearance',
    'Tourism Clearance',
    'Market Clearance'
);

-- ---------------------------------------------------------------------------
-- 1. Community Tax Certificate (Cedula)
--    Charter: listed for BOTH new and renewal applications.
--    Condition: always applicable.
-- ---------------------------------------------------------------------------
INSERT INTO permit_requirements
    (permit_name, description, condition_field, condition_value, is_mandatory, applicable_business_type, renewal_period, required_documents)
SELECT
    'Community Tax Certificate (Cedula)',
    'A Community Tax Certificate (cedula) issued by the Local Civil Registrar or the municipal treasurer for the current year. Required for both new applications and renewals. Obtain from the Municipal Treasurer''s Office, Municipality of Roxas.',
    'always',
    NULL,
    1,
    'All',
    'Annual',
    'Original Community Tax Certificate (cedula) for the current year.'
WHERE NOT EXISTS (
    SELECT 1 FROM permit_requirements WHERE permit_name = 'Community Tax Certificate (Cedula)'
);

-- ---------------------------------------------------------------------------
-- 2. Proof of Business Name Registration
--    Charter: DTI Certificate (sole proprietor), SEC Registration (corporation/
--    partnership), or CDA Certificate (cooperative). Required for new and renewal.
--    Condition: always applicable.
--    NOTE: DOLE registration applicability is unresolved — not included here.
-- ---------------------------------------------------------------------------
INSERT INTO permit_requirements
    (permit_name, description, condition_field, condition_value, is_mandatory, applicable_business_type, renewal_period, required_documents)
SELECT
    'Proof of Business Name Registration',
    'Proof of business name registration with the appropriate national agency: DTI Certificate of Business Name Registration for sole proprietors; SEC Certificate of Incorporation or Partnership Registration for corporations and partnerships; CDA Certificate for cooperatives. Bring the original and one photocopy. Required for both new applications and renewals.',
    'always',
    NULL,
    1,
    'All',
    'As needed',
    'DTI Certificate / SEC Registration / CDA Certificate (original + 1 photocopy).'
WHERE NOT EXISTS (
    SELECT 1 FROM permit_requirements WHERE permit_name = 'Proof of Business Name Registration'
);

-- ---------------------------------------------------------------------------
-- 3. Annual Income Tax Return (AITR)
--    Charter: listed under RENEWAL requirements only.
--    Condition: business_status = 'Renewal'
-- ---------------------------------------------------------------------------
INSERT INTO permit_requirements
    (permit_name, description, condition_field, condition_value, is_mandatory, applicable_business_type, renewal_period, required_documents)
SELECT
    'Annual Income Tax Return (AITR)',
    'Latest Annual Income Tax Return (AITR) as filed with the Bureau of Internal Revenue (BIR), with proof of BIR stamped receipt or online eBIRForms confirmation. Required for business permit renewal applications. Prepare the photocopy; original may be requested for verification.',
    'business_status',
    'Renewal',
    1,
    'All',
    'Annual',
    'Latest BIR Annual Income Tax Return (photocopy + BIR receipt/confirmation).'
WHERE NOT EXISTS (
    SELECT 1 FROM permit_requirements WHERE permit_name = 'Annual Income Tax Return (AITR)'
);

-- ---------------------------------------------------------------------------
-- 4. Zoning / Locational Clearance
--    Charter: required for NEW applications.
--    For renewals: required only when there is a structural improvement.
--    No self-declaration field added in this phase — noted in description only.
--    Condition: business_status = 'New Application'
-- ---------------------------------------------------------------------------
INSERT INTO permit_requirements
    (permit_name, description, condition_field, condition_value, is_mandatory, applicable_business_type, renewal_period, required_documents)
SELECT
    'Zoning / Locational Clearance',
    'Zoning / Locational Clearance issued by the Municipal Planning and Development Office (MPDO) of Roxas, Oriental Mindoro. Required for new business permit applications. For renewals: required only if there has been a structural improvement or change in business location since the last permit — verify with the BPLO at the counter.',
    'business_status',
    'New Application',
    1,
    'All',
    'As needed',
    'Original Zoning / Locational Clearance from MPDO.'
WHERE NOT EXISTS (
    SELECT 1 FROM permit_requirements WHERE permit_name = 'Zoning / Locational Clearance'
);

-- ---------------------------------------------------------------------------
-- 5. Tourism Clearance (CORRECTED — Phase 3C)
--
--    Charter establishments: Hotel, Lodging, Apartelle, Transient, Resort, Restaurant.
--
--    Phase 3B condition_value included 'food & beverage' which matched the ENTIRE
--    Food & Beverage business_type, causing false positives for bakeries, water refilling
--    stations, catering services, food kiosks, and similar.
--
--    CORRECTED token list (Phase 3C):
--      - 'tourism, hospitality & entertainment' → covers Hotel/Inn, Resort/Beach Resort,
--        Pension House/Hostel, Restaurant with Entertainment, and all other sub-categories
--        in that business_type group via the business_type match.
--      - Specific Food & Beverage industry_category tokens for Charter-listed food establishments:
--        Restaurant, Carenderia, Fast Food, Cafe.
--
--    REMOVED token: 'food & beverage', 'hotel / inn', 'resort / beach resort',
--    'pension house / hostel' (redundant — covered by the tourism business_type token).
--
--    NOT INCLUDED (pending BPLO clarification):
--      - Bar / Videoke Bar: present in F&B group but not Charter-listed for Tourism Clearance.
--      - Snack House / Meriendahan, Food Kiosk: not explicitly Charter-listed.
--      - Billiard Hall, Gym, Spa, Cinema: in Tourism group — BPLO must confirm.
--
--    Condition: business_type_contains (pipe-separated, full-value, case-insensitive)
-- ---------------------------------------------------------------------------
INSERT INTO permit_requirements
    (permit_name, description, condition_field, condition_value, is_mandatory, applicable_business_type, renewal_period, required_documents)
SELECT
    'Tourism Clearance',
    'Tourism Clearance issued by the Municipal Tourism Office of Roxas, Oriental Mindoro. Required for tourism-related establishments (hotels, inns, pension houses, apartelles, transient houses, resorts, beach resorts) and food service establishments operating as restaurants, carenderias, fast food outlets, and cafes. Verify your applicability with the BPLO.',
    'business_type_contains',
    'tourism, hospitality & entertainment|restaurant / full-service eatery|carenderia / turo-turo|fast food / quick service|cafe / coffee shop|restaurant with entertainment',
    1,
    'Tourism & Selected Food Service',
    'Annual',
    'Original Tourism Clearance from Municipal Tourism Office.'
WHERE NOT EXISTS (
    SELECT 1 FROM permit_requirements WHERE permit_name = 'Tourism Clearance'
);

-- ---------------------------------------------------------------------------
-- 6. Market Clearance
--    Charter: required for businesses in the public market.
--    Condition: premises_type = 'Public Market Stall'
-- ---------------------------------------------------------------------------
INSERT INTO permit_requirements
    (permit_name, description, condition_field, condition_value, is_mandatory, applicable_business_type, renewal_period, required_documents)
SELECT
    'Market Clearance',
    'Market Clearance issued by the Municipal Market Authority of Roxas, Oriental Mindoro. Required for businesses operating inside or as part of the public market premises. Obtain from the Market Office before applying for a Mayor''s Permit.',
    'premises_type',
    'Public Market Stall',
    1,
    'Public Market Stall',
    'Annual',
    'Original Market Clearance from Municipal Market Authority.'
WHERE NOT EXISTS (
    SELECT 1 FROM permit_requirements WHERE permit_name = 'Market Clearance'
);

-- ---------------------------------------------------------------------------
-- Record in schema_migration_ledger only records that were NOT pre-existing
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO schema_migration_ledger (migration_name, table_name, record_id, permit_name)
SELECT 'tier2_requirement_rules', 'permit_requirements', pr.id, pr.permit_name
FROM permit_requirements pr
WHERE pr.permit_name IN (
    'Community Tax Certificate (Cedula)',
    'Proof of Business Name Registration',
    'Annual Income Tax Return (AITR)',
    'Zoning / Locational Clearance',
    'Tourism Clearance',
    'Market Clearance'
)
AND pr.id NOT IN (SELECT id FROM _pre_existing_tier2);

DROP TEMPORARY TABLE IF EXISTS _pre_existing_tier2;

-- =============================================================================
-- SAFE TIER 2 ROLLBACK PROCEDURE
-- =============================================================================
-- STEP 1: Pre-Rollback Check for Active User Preparation Progress
--
-- Run this check before attempting rollback:
-- SELECT br.business_id, pr.permit_name, br.status, br.notes, br.document_id
-- FROM business_requirements br
-- JOIN permit_requirements pr ON br.requirement_id = pr.id
-- JOIN schema_migration_ledger ml ON ml.record_id = pr.id AND ml.migration_name = 'tier2_requirement_rules'
-- WHERE (br.status IN ('Submitted', 'Approved') OR br.notes IS NOT NULL OR br.document_id IS NOT NULL);
--
-- IF ROWS RETURNED: STOP. User progress exists on migration-created rules.
-- Rollback must NOT proceed automatically. Escalate to database administrator.
--
-- IF ZERO ROWS RETURNED: Proceed with safe removal:
-- START TRANSACTION;
--
-- -- 1. Remove unmodified 'Missing' placeholders linked to migration-created rules
-- DELETE br FROM business_requirements br
-- JOIN schema_migration_ledger ml 
--   ON br.requirement_id = ml.record_id 
--  AND ml.migration_name = 'tier2_requirement_rules' 
--  AND ml.table_name = 'permit_requirements'
-- WHERE br.status = 'Missing' 
--   AND br.notes IS NULL 
--   AND br.document_id IS NULL;
--
-- -- 2. Delete migration-created rules from permit_requirements using exact ledger IDs
-- DELETE pr FROM permit_requirements pr
-- JOIN schema_migration_ledger ml 
--   ON pr.id = ml.record_id 
--  AND ml.migration_name = 'tier2_requirement_rules' 
--  AND ml.table_name = 'permit_requirements';
--
-- -- 3. Clear migration ledger entries for this migration
-- DELETE FROM schema_migration_ledger 
-- WHERE migration_name = 'tier2_requirement_rules';
--
-- COMMIT;
-- =============================================================================
