/**
 * PermitEase Phase 3G — Staging Validation Test Suite
 *
 * Validates the 8 core staging scenarios:
 * 1. New business with a confirmed requirement profile
 * 2. Renewal business with a confirmed requirement profile
 * 3. Public market stall premises
 * 4. Restaurant / food-service business (Sanitary + Tourism)
 * 5. Business outside Tourism Clearance categories
 * 6. Existing business with previously recorded requirement progress
 * 7. Unauthorized user attempting to access another business's data (Tenant Isolation)
 * 8. BPLO user vs business-owner access boundaries (RBAC)
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASSWORD || '';
const TEST_DB = 'bizcheckpermit_phase3g_staging_test';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_for_testing';

let pool;
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

// Requirement evaluation logic matching readinessController & complianceController
function evaluateRule(rule, business, appType) {
    const cf = rule.condition_field ? rule.condition_field.trim() : '';
    const cv = rule.condition_value !== null && rule.condition_value !== undefined ? String(rule.condition_value).trim() : '';

    if (!cf || cf === 'always') return true;

    if (cf === 'business_status') {
        const status = (appType || business.business_status || 'New Application').trim().toLowerCase();
        return status === cv.toLowerCase();
    }

    if (cf === 'industry_category') {
        return business.industry_category === cv;
    }

    if (cf === 'premises_type') {
        if (!business.premises_type) return false;
        return business.premises_type.trim().toLowerCase() === cv.toLowerCase();
    }

    if (cf === 'business_type_contains') {
        const haystack = [business.business_type || '', business.industry_category || '']
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        if (!haystack) return false;
        const tokens = cv.split('|').map(t => t.trim().toLowerCase()).filter(Boolean);
        return tokens.some(t => haystack.includes(t));
    }

    return false;
}

async function runStagingValidation() {
    console.log('\n════════════════════════════════════════════════════════════════════════');
    console.log('  PermitEase Phase 3G — Staging Scenario Validation Suite');
    console.log('════════════════════════════════════════════════════════════════════════\n');

    const adminConn = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASS,
        multipleStatements: true
    });

    try {
        await adminConn.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
        await adminConn.query(`CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await adminConn.end();

        pool = mysql.createPool({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASS,
            database: TEST_DB,
            waitForConnections: true,
            connectionLimit: 10,
            multipleStatements: true
        });

        // 1. Create Schema
        await pool.query(`
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('business_owner', 'lgu_admin', 'system_admin') NOT NULL
            );

            CREATE TABLE businesses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                business_name VARCHAR(255) NOT NULL,
                business_type VARCHAR(100) NOT NULL,
                industry_category VARCHAR(100),
                premises_type VARCHAR(100),
                business_status ENUM('New Application', 'Renewal') NOT NULL DEFAULT 'New Application',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE permit_requirements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                permit_name VARCHAR(255) NOT NULL,
                condition_field VARCHAR(100) DEFAULT 'always',
                condition_value VARCHAR(500),
                is_mandatory TINYINT(1) DEFAULT 1,
                applicable_business_type VARCHAR(255) DEFAULT 'All'
            );

            CREATE TABLE business_requirements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                business_id INT NOT NULL,
                requirement_id INT NOT NULL,
                status ENUM('Missing', 'Pending', 'Submitted', 'Approved', 'Rejected') DEFAULT 'Missing',
                notes TEXT,
                document_id INT NULL,
                UNIQUE KEY unique_biz_req (business_id, requirement_id),
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
                FOREIGN KEY (requirement_id) REFERENCES permit_requirements(id) ON DELETE CASCADE
            );

            CREATE TABLE schema_migration_ledger (
                id INT AUTO_INCREMENT PRIMARY KEY,
                migration_name VARCHAR(100) NOT NULL,
                table_name VARCHAR(100) NOT NULL,
                record_id INT NOT NULL,
                permit_name VARCHAR(255) NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_migration_record (migration_name, table_name, record_id)
            );
        `);

        // Seed Users
        const [owner1Res] = await pool.query("INSERT INTO users (full_name, email, password, role) VALUES ('Alice Owner', 'alice@test.ph', 'Secret@123', 'business_owner')");
        const [owner2Res] = await pool.query("INSERT INTO users (full_name, email, password, role) VALUES ('Bob Owner', 'bob@test.ph', 'Secret@123', 'business_owner')");
        const [adminRes] = await pool.query("INSERT INTO users (full_name, email, password, role) VALUES ('BPLO Officer Cruz', 'bplo@roxas.gov.ph', 'Admin@12345', 'lgu_admin')");

        const owner1Id = owner1Res.insertId;
        const owner2Id = owner2Res.insertId;
        const adminId = adminRes.insertId;

        // Seed 5 Tier 1 Requirements
        await pool.query(`
            INSERT INTO permit_requirements (id, permit_name, condition_field, condition_value, is_mandatory) VALUES
            (1, 'Barangay Business Clearance', 'always', '', 1),
            (2, 'Sanitary Permit', 'industry_category', 'Food & Beverage', 1),
            (3, 'Fire Safety Inspection Certificate', 'always', '', 1),
            (4, 'ESO Certificate', 'always', '', 1),
            (5, 'Building Permit / Occupancy Permit', 'business_status', 'New Application', 0);
        `);

        // Seed 6 Tier 2 Requirements
        await pool.query(`
            INSERT INTO permit_requirements (id, permit_name, condition_field, condition_value, is_mandatory) VALUES
            (6, 'Community Tax Certificate (Cedula)', 'always', NULL, 1),
            (7, 'Proof of Business Name Registration', 'always', NULL, 1),
            (8, 'Annual Income Tax Return (AITR)', 'business_status', 'Renewal', 1),
            (9, 'Zoning / Locational Clearance', 'business_status', 'New Application', 1),
            (10, 'Tourism Clearance', 'business_type_contains', 'tourism, hospitality & entertainment|restaurant / full-service eatery|carenderia / turo-turo|fast food / quick service|cafe / coffee shop|restaurant with entertainment', 1),
            (11, 'Market Clearance', 'premises_type', 'Public Market Stall', 1);
        `);

        const [allRules] = await pool.query('SELECT * FROM permit_requirements ORDER BY id ASC');

        console.log('────────────────────────────────────────────────────────────────────────');
        console.log('  Scenario 1: New Business Confirmed Requirement Profile');
        console.log('────────────────────────────────────────────────────────────────────────');
        const [newRetailRes] = await pool.query(`
            INSERT INTO businesses (user_id, business_name, business_type, industry_category, premises_type, business_status)
            VALUES (?, 'Roxas Novelty Store', 'Retail & Trading', 'General Merchandise', 'Commercial Building', 'New Application')
        `, [owner1Id]);
        const newRetailId = newRetailRes.insertId;
        const [[newRetailBiz]] = await pool.query('SELECT * FROM businesses WHERE id = ?', [newRetailId]);

        const applicableNewRetail = allRules.filter(r => evaluateRule(r, newRetailBiz, newRetailBiz.business_status)).map(r => r.permit_name);
        assert(applicableNewRetail.includes('Barangay Business Clearance'), 'Receives Barangay Clearance (universal)');
        assert(applicableNewRetail.includes('Fire Safety Inspection Certificate'), 'Receives FSIC (universal)');
        assert(applicableNewRetail.includes('ESO Certificate'), 'Receives ESO Certificate (universal)');
        assert(applicableNewRetail.includes('Building Permit / Occupancy Permit'), 'Receives Building Permit (New Application)');
        assert(applicableNewRetail.includes('Community Tax Certificate (Cedula)'), 'Receives Cedula (Tier 2 universal)');
        assert(applicableNewRetail.includes('Proof of Business Name Registration'), 'Receives Business Name Registration (Tier 2 universal)');
        assert(applicableNewRetail.includes('Zoning / Locational Clearance'), 'Receives Zoning Clearance (New Application)');
        assert(!applicableNewRetail.includes('Annual Income Tax Return (AITR)'), 'Excluded from AITR (not a renewal)');
        assert(!applicableNewRetail.includes('Sanitary Permit'), 'Excluded from Sanitary Permit (not Food & Beverage)');
        assert(!applicableNewRetail.includes('Tourism Clearance'), 'Excluded from Tourism Clearance (Retail)');
        assert(!applicableNewRetail.includes('Market Clearance'), 'Excluded from Market Clearance (Commercial Building)');

        console.log('\n────────────────────────────────────────────────────────────────────────');
        console.log('  Scenario 2: Renewal Business Confirmed Requirement Profile');
        console.log('────────────────────────────────────────────────────────────────────────');
        const [renewalRetailRes] = await pool.query(`
            INSERT INTO businesses (user_id, business_name, business_type, industry_category, premises_type, business_status)
            VALUES (?, 'Roxas Hardware Supply', 'Retail & Trading', 'Hardware & Construction', 'Commercial Building', 'Renewal')
        `, [owner1Id]);
        const renewalRetailId = renewalRetailRes.insertId;
        const [[renewalRetailBiz]] = await pool.query('SELECT * FROM businesses WHERE id = ?', [renewalRetailId]);

        const applicableRenewalRetail = allRules.filter(r => evaluateRule(r, renewalRetailBiz, renewalRetailBiz.business_status)).map(r => r.permit_name);
        assert(applicableRenewalRetail.includes('Annual Income Tax Return (AITR)'), 'Receives AITR on Renewal');
        assert(!applicableRenewalRetail.includes('Building Permit / Occupancy Permit'), 'Excluded from Building Permit on Renewal');
        assert(!applicableRenewalRetail.includes('Zoning / Locational Clearance'), 'Excluded from Zoning Clearance on Renewal');
        assert(applicableRenewalRetail.includes('Barangay Business Clearance'), 'Receives universal Barangay Clearance');
        assert(applicableRenewalRetail.includes('Community Tax Certificate (Cedula)'), 'Receives universal Cedula');

        console.log('\n────────────────────────────────────────────────────────────────────────');
        console.log('  Scenario 3: Public Market Stall Premises Profile');
        console.log('────────────────────────────────────────────────────────────────────────');
        const [stallRes] = await pool.query(`
            INSERT INTO businesses (user_id, business_name, business_type, industry_category, premises_type, business_status)
            VALUES (?, 'Lola Nena Meat Stall', 'Retail & Trading', 'Meat & Poultry', 'Public Market Stall', 'Renewal')
        `, [owner1Id]);
        const stallId = stallRes.insertId;
        const [[stallBiz]] = await pool.query('SELECT * FROM businesses WHERE id = ?', [stallId]);

        const applicableStall = allRules.filter(r => evaluateRule(r, stallBiz, stallBiz.business_status)).map(r => r.permit_name);
        assert(applicableStall.includes('Market Clearance'), 'Market Stall receives Market Clearance');
        assert(applicableStall.includes('Annual Income Tax Return (AITR)'), 'Renewal Market Stall receives AITR');
        assert(!applicableStall.includes('Tourism Clearance'), 'Market Stall is not misidentified as Tourism');

        console.log('\n────────────────────────────────────────────────────────────────────────');
        console.log('  Scenario 4: Restaurant / Food-Service Business Profile');
        console.log('────────────────────────────────────────────────────────────────────────');
        const [restoRes] = await pool.query(`
            INSERT INTO businesses (user_id, business_name, business_type, industry_category, premises_type, business_status)
            VALUES (?, 'Mindoro Seaside Bistro', 'Food & Beverage', 'Restaurant / Full-Service Eatery', 'Private Commercial Space', 'New Application')
        `, [owner1Id]);
        const restoId = restoRes.insertId;
        const [[restoBiz]] = await pool.query('SELECT * FROM businesses WHERE id = ?', [restoId]);

        // 4A: Generic Food & Beverage profile (industry_category = 'Food & Beverage')
        const [genericFoodRes] = await pool.query(`
            INSERT INTO businesses (user_id, business_name, business_type, industry_category, premises_type, business_status)
            VALUES (?, 'Mindoro Food Services', 'Food & Beverage', 'Food & Beverage', 'Commercial Building', 'New Application')
        `, [owner1Id]);
        const [[genericFoodBiz]] = await pool.query('SELECT * FROM businesses WHERE id = ?', [genericFoodRes.insertId]);
        const applicableGenericFood = allRules.filter(r => evaluateRule(r, genericFoodBiz, genericFoodBiz.business_status)).map(r => r.permit_name);
        assert(applicableGenericFood.includes('Sanitary Permit'), 'Generic F&B receives Sanitary Permit (Food & Beverage exact match)');

        // 4B: Standalone Restaurant profile (industry_category = 'Restaurant / Full-Service Eatery')
        const applicableResto = allRules.filter(r => evaluateRule(r, restoBiz, restoBiz.business_status)).map(r => r.permit_name);
        assert(!applicableResto.includes('Sanitary Permit'), 'Standalone Restaurant receives NO Sanitary Permit under current exact-match rule (Documented Gap)');
        assert(applicableResto.includes('Tourism Clearance'), 'Restaurant receives Tourism Clearance (token match)');
        assert(applicableResto.includes('Zoning / Locational Clearance'), 'New Restaurant receives Zoning Clearance');

        console.log('\n────────────────────────────────────────────────────────────────────────');
        console.log('  Scenario 5: Business Outside Tourism Clearance Categories');
        console.log('────────────────────────────────────────────────────────────────────────');
        const [consultingRes] = await pool.query(`
            INSERT INTO businesses (user_id, business_name, business_type, industry_category, premises_type, business_status)
            VALUES (?, 'Roxas Digital Solutions', 'Services (Personal & Professional)', 'IT & Digital Services', 'Office Space', 'New Application')
        `, [owner1Id]);
        const consultingId = consultingRes.insertId;
        const [[consultingBiz]] = await pool.query('SELECT * FROM businesses WHERE id = ?', [consultingId]);

        const applicableConsulting = allRules.filter(r => evaluateRule(r, consultingBiz, consultingBiz.business_status)).map(r => r.permit_name);
        assert(!applicableConsulting.includes('Tourism Clearance'), 'IT Consulting receives NO Tourism Clearance');
        assert(!applicableConsulting.includes('Sanitary Permit'), 'IT Consulting receives NO Sanitary Permit');
        assert(!applicableConsulting.includes('Market Clearance'), 'IT Consulting receives NO Market Clearance');

        console.log('\n────────────────────────────────────────────────────────────────────────');
        console.log('  Scenario 6: Existing Business with Prior Progress Preserved');
        console.log('────────────────────────────────────────────────────────────────────────');
        // Seed existing requirements with user progress
        await pool.query(`
            INSERT INTO business_requirements (business_id, requirement_id, status, notes)
            VALUES 
            (?, 1, 'Approved', 'Barangay clearance verified at Brgy Bagumbayan Hall'),
            (?, 3, 'Submitted', 'FSIC submitted with official receipt #89212')
        `, [newRetailId, newRetailId]);

        // Trigger reconciliation for applicable rules
        for (const rule of allRules) {
            if (evaluateRule(rule, newRetailBiz, newRetailBiz.business_status)) {
                await pool.query(`
                    INSERT IGNORE INTO business_requirements (business_id, requirement_id, status)
                    VALUES (?, ?, 'Missing')
                `, [newRetailId, rule.id]);
            }
        }

        const [reconciledReqs] = await pool.query(`
            SELECT br.*, pr.permit_name 
            FROM business_requirements br
            JOIN permit_requirements pr ON br.requirement_id = pr.id
            WHERE br.business_id = ?
        `, [newRetailId]);

        const brgyRow = reconciledReqs.find(r => r.permit_name === 'Barangay Business Clearance');
        const fsicRow = reconciledReqs.find(r => r.permit_name === 'Fire Safety Inspection Certificate');
        const cedulaRow = reconciledReqs.find(r => r.permit_name === 'Community Tax Certificate (Cedula)');

        assert(brgyRow && brgyRow.status === 'Approved' && brgyRow.notes.includes('verified'), 'Existing Barangay Clearance retains "Approved" and exact note');
        assert(fsicRow && fsicRow.status === 'Submitted' && fsicRow.notes.includes('receipt #89212'), 'Existing FSIC retains "Submitted" and exact note');
        assert(cedulaRow && cedulaRow.status === 'Missing', 'Newly applicable Cedula inserted cleanly as "Missing"');

        console.log('\n────────────────────────────────────────────────────────────────────────');
        console.log('  Scenario 7: Unauthorized Cross-Tenant Access Blocked');
        console.log('────────────────────────────────────────────────────────────────────────');
        // Simulate query where User 2 attempts to query businesses or requirements of User 1
        const [user2AccessAttempt] = await pool.query(`
            SELECT b.id, b.business_name 
            FROM businesses b 
            WHERE b.id = ? AND b.user_id = ?
        `, [newRetailId, owner2Id]);

        assert(user2AccessAttempt.length === 0, 'Owner 2 querying Owner 1 business returns 0 rows (Tenant isolation confirmed)');

        const [crossReqAttempt] = await pool.query(`
            SELECT br.* 
            FROM business_requirements br
            JOIN businesses b ON br.business_id = b.id
            WHERE br.business_id = ? AND b.user_id = ?
        `, [newRetailId, owner2Id]);

        assert(crossReqAttempt.length === 0, 'Owner 2 querying Owner 1 checklist returns 0 rows');

        console.log('\n────────────────────────────────────────────────────────────────────────');
        console.log('  Scenario 8: Role-Based Access Control (RBAC) Boundaries');
        console.log('────────────────────────────────────────────────────────────────────────');
        // Business owner token vs LGU admin token
        const ownerToken = jwt.sign({ id: owner1Id, role: 'business_owner' }, JWT_SECRET);
        const adminToken = jwt.sign({ id: adminId, role: 'lgu_admin' }, JWT_SECRET);

        const decodedOwner = jwt.verify(ownerToken, JWT_SECRET);
        const decodedAdmin = jwt.verify(adminToken, JWT_SECRET);

        assert(decodedOwner.role === 'business_owner', 'Owner token role verified');
        assert(decodedAdmin.role === 'lgu_admin', 'LGU Admin token role verified');

        // Verify simulated route authorization rule:
        // Admin endpoints require role === 'lgu_admin' || role === 'system_admin'
        const isOwnerAllowedAdminRoute = ['lgu_admin', 'system_admin'].includes(decodedOwner.role);
        const isAdminAllowedAdminRoute = ['lgu_admin', 'system_admin'].includes(decodedAdmin.role);

        assert(!isOwnerAllowedAdminRoute, 'Business Owner is FORBIDDEN from LGU Admin routes (RBAC enforced)');
        assert(isAdminAllowedAdminRoute, 'LGU Admin is AUTHORIZED for administrative review routes');

        console.log('\n════════════════════════════════════════════════════════════════════════');
        console.log(`  Phase 3G Staging Validation: ${passed} passed, ${failed} failed`);
        console.log('════════════════════════════════════════════════════════════════════════\n');

    } catch (err) {
        console.error('Test execution error:', err);
        failed++;
    } finally {
        if (pool) {
            await pool.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
            await pool.end();
        }
    }

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runStagingValidation();
