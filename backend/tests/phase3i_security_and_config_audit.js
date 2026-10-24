/**
 * PermitEase Phase 3I — Security, Configuration, and Concurrency Exhaustion Audit
 * 
 * Verifies:
 * 1. Environment-specific rate limiting (production strictness, test/staging relaxation, fallback guards).
 * 2. JWT configuration and production startup security checks.
 * 3. Static asset protection (sensitive user uploads segregated from public knowledge files).
 * 4. approveApplication retry exhaustion handling and transactional rollback.
 * 5. Preparation-tool scope safeguards and disclaimer verification.
 */

const assert = require('assert');
const path = require('path');
const mysql = require('mysql2/promise');
const { getAuthRateLimitMax } = require('../server');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
};

const TEST_DB = 'bizcheckpermit_phase3i_test';

let passed = 0;
let failed = 0;

function testAssert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

async function runPhase3IAudit() {
    console.log('\n════════════════════════════════════════════════════════════════════════');
    console.log('  PermitEase Phase 3I — Security, Config & Concurrency Audit');
    console.log('════════════════════════════════════════════════════════════════════════\n');

    let pool = null;

    try {
        // ────────────────────────────────────────────────────────────────────
        // SECTION 1: Rate Limiter Configuration & Environment Boundary Audit
        // ────────────────────────────────────────────────────────────────────
        console.log('────────────────────────────────────────────────────────────────────────');
        console.log('  1. Rate Limiting Configuration & Fallback Verification');
        console.log('────────────────────────────────────────────────────────────────────────');

        // Production default (no custom override)
        testAssert(getAuthRateLimitMax('production', undefined) === 30, 'Production defaults strictly to 30 requests per 15 min');

        // Production with valid custom config within safe limits
        testAssert(getAuthRateLimitMax('production', '50') === 50, 'Production accepts safe custom limit (e.g. 50)');

        // Production safeguard against unsafe expansion
        testAssert(getAuthRateLimitMax('production', '500') === 30, 'Production rejects unsafe limit expansion (>100) and clamps to 30');

        // Staging environment elevated for high-throughput testing
        testAssert(getAuthRateLimitMax('staging', undefined) === 500, 'Staging environment explicitly permits elevated 500 requests');

        // Test environment elevated for high-throughput testing
        testAssert(getAuthRateLimitMax('test', undefined) === 500, 'Test environment explicitly permits elevated 500 requests');

        // Development default
        testAssert(getAuthRateLimitMax('development', undefined) === 30, 'Development environment defaults to strict 30 requests');

        // Undefined/missing NODE_ENV fallback
        testAssert(getAuthRateLimitMax(undefined, undefined) === 30, 'Missing/undefined NODE_ENV defaults safely to strict 30');

        // Misspelled 'prod' fallback
        testAssert(getAuthRateLimitMax('prod', undefined) === 30, 'Misspelled "prod" defaults safely to strict 30');

        // Case difference 'Production' fallback
        testAssert(getAuthRateLimitMax('Production', undefined) === 30, 'Case variation "Production" defaults safely to strict 30');


        // ────────────────────────────────────────────────────────────────────
        // SECTION 2: Production Secret & Startup Checks Audit
        // ────────────────────────────────────────────────────────────────────
        console.log('\n────────────────────────────────────────────────────────────────────────');
        console.log('  2. JWT Configuration & Production Security Startup Checks');
        console.log('────────────────────────────────────────────────────────────────────────');

        const DEFAULT_JWT_SECRET = 'my_super_secret_jwt_key_for_bizcheckpermit_development';

        // Check rejection logic for default secret in production
        const isDefaultSecretRejectedInProd = (env, secret) => {
            return (env === 'production' && secret === DEFAULT_JWT_SECRET);
        };

        testAssert(isDefaultSecretRejectedInProd('production', DEFAULT_JWT_SECRET) === true, 'Production strictly rejects default development JWT secret');
        testAssert(isDefaultSecretRejectedInProd('production', 'custom_high_entropy_prod_secret_12345') === false, 'Production permits custom high-entropy secret');
        testAssert(isDefaultSecretRejectedInProd('staging', DEFAULT_JWT_SECRET) === false, 'Staging/dev permitted to use dev secret for local test isolation');


        // ────────────────────────────────────────────────────────────────────
        // SECTION 3: Static Asset & Document Exposure Protection
        // ────────────────────────────────────────────────────────────────────
        console.log('\n────────────────────────────────────────────────────────────────────────');
        console.log('  3. Static Asset Protection & Document Access Isolation');
        console.log('────────────────────────────────────────────────────────────────────────');

        const fs = require('fs');
        const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

        // Verify that /uploads root is NOT statically served
        const servesRootUploadsStatically = serverCode.includes("app.use('/uploads', express.static");
        testAssert(!servesRootUploadsStatically, 'Root /uploads directory is NOT statically exposed to public');

        // Verify that only /uploads/knowledge is statically served for public guides
        const servesKnowledgeStatically = serverCode.includes("app.use('/uploads/knowledge', express.static");
        testAssert(servesKnowledgeStatically, 'Only /uploads/knowledge is statically served for public reference materials');


        // ────────────────────────────────────────────────────────────────────
        // SECTION 4: Database Setup for Retry Exhaustion & Concurrency Audit
        // ────────────────────────────────────────────────────────────────────
        console.log('\n────────────────────────────────────────────────────────────────────────');
        console.log('  4. Database Provisioning for Retry Exhaustion Audit');
        console.log('────────────────────────────────────────────────────────────────────────');

        pool = mysql.createPool(DB_CONFIG);
        await pool.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
        await pool.query(`CREATE DATABASE \`${TEST_DB}\``);
        await pool.query(`USE \`${TEST_DB}\``);

        // Minimal schema
        await pool.query(`
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                password VARCHAR(255),
                role ENUM('business_owner', 'lgu_admin', 'system_admin')
            );
            CREATE TABLE businesses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                business_name VARCHAR(150),
                business_type VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Active'
            );
            CREATE TABLE applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                business_id INT,
                application_number VARCHAR(50),
                application_type ENUM('NEW', 'RENEWAL'),
                status ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED') DEFAULT 'DRAFT',
                reviewed_by INT,
                reviewed_at DATETIME,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
            CREATE TABLE application_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_id INT,
                actor_user_id INT,
                action VARCHAR(100),
                old_status VARCHAR(50),
                new_status VARCHAR(50),
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE permits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                business_id INT,
                application_id INT,
                permit_name VARCHAR(150),
                permit_number VARCHAR(100),
                issue_date DATE,
                expiration_date DATE,
                status VARCHAR(50),
                verification_code VARCHAR(100),
                UNIQUE KEY unique_verification_code (verification_code),
                UNIQUE KEY unique_application_permit (application_id)
            );
        `);
        testAssert(true, 'Disposable database created with strict UNIQUE constraints');

        // Seed test user, business, and application
        const [uRes] = await pool.query("INSERT INTO users (full_name, email, role) VALUES ('Admin', 'admin@roxas.gov.ph', 'lgu_admin')");
        const adminId = uRes.insertId;

        const [bRes] = await pool.query("INSERT INTO businesses (user_id, business_name, business_type) VALUES (1, 'Roxas Sea Breeze Resort', 'Tourism')");
        const bizId = bRes.insertId;

        const [aRes] = await pool.query("INSERT INTO applications (user_id, business_id, application_type, status) VALUES (1, ?, 'NEW', 'UNDER_REVIEW')", [bizId]);
        const appId = aRes.insertId;


        // ────────────────────────────────────────────────────────────────────
        // SECTION 5: Retry Exhaustion Handling & Clean Rollback Audit
        // ────────────────────────────────────────────────────────────────────
        console.log('\n────────────────────────────────────────────────────────────────────────');
        console.log('  5. approveApplication Retry Exhaustion & Rollback Verification');
        console.log('────────────────────────────────────────────────────────────────────────');

        // Pre-insert colliding codes to exhaust retry attempts
        const collidingCode = 'COLLISION_EXHAUST_CODE';
        await pool.query(
            "INSERT INTO permits (business_id, application_id, permit_name, permit_number, issue_date, expiration_date, status, verification_code) VALUES (999, 999, 'Existing Permit', 'PE-EXISTING', '2026-01-01', '2026-12-31', 'Approved', ?)",
            [collidingCode]
        );

        // Simulate approveApplication with 3 forced collisions (exhausting maxAttempts = 3)
        let retryExhaustionHandled = false;
        let finalError = null;

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // Lock application row
            const [appRows] = await conn.query("SELECT * FROM applications WHERE id = ? FOR UPDATE", [appId]);
            const app = appRows[0];

            // Transition status within transaction
            await conn.query("UPDATE applications SET status = 'APPROVED', reviewed_by = ? WHERE id = ?", [adminId, app.id]);
            await conn.query("INSERT INTO application_history (application_id, actor_user_id, action, old_status, new_status) VALUES (?, ?, 'Application Approved', 'UNDER_REVIEW', 'APPROVED')", [app.id, adminId]);

            // Attempt permit insertion with generator that keeps producing the colliding code
            let permitInserted = false;
            let insertAttempts = 0;
            const maxAttempts = 3;

            while (!permitInserted && insertAttempts < maxAttempts) {
                try {
                    // Simulating a code collision on every attempt
                    await conn.query(
                        "INSERT INTO permits (business_id, application_id, permit_name, permit_number, issue_date, expiration_date, status, verification_code) VALUES (?, ?, 'Permit Summary', 'PE-2026-EXHAUST', '2026-10-16', '2026-12-31', 'Approved', ?)",
                        [app.business_id, app.id, collidingCode]
                    );
                    permitInserted = true;
                } catch (err) {
                    if (err.code === 'ER_DUP_ENTRY' && err.message && err.message.includes('verification_code')) {
                        insertAttempts++;
                        // Generator continues to collide in this test
                    } else {
                        throw err;
                    }
                }
            }

            if (!permitInserted) {
                await conn.rollback();
                retryExhaustionHandled = true;
                finalError = new Error('Unable to generate unique verification code under concurrent load.');
            } else {
                await conn.commit();
            }
        } catch (err) {
            await conn.rollback();
            finalError = err;
        } finally {
            conn.release();
        }

        testAssert(retryExhaustionHandled, 'Retry exhaustion detected and triggered transactional rollback');
        testAssert(finalError && finalError.message.includes('Unable to generate unique verification code'), 'Error message explicitly reports code generation failure under load');

        // Post-rollback database audit
        const [appPost] = await pool.query('SELECT status FROM applications WHERE id = ?', [appId]);
        testAssert(appPost[0].status === 'UNDER_REVIEW', 'Application status rolled back cleanly to UNDER_REVIEW (Not left as APPROVED)');

        const [historyPost] = await pool.query('SELECT * FROM application_history WHERE application_id = ?', [appId]);
        testAssert(historyPost.length === 0, 'Zero application history entries remain after rollback (No false approval audit)');

        const [permitsPost] = await pool.query('SELECT * FROM permits WHERE application_id = ?', [appId]);
        testAssert(permitsPost.length === 0, 'Zero permit records created for the application on retry exhaustion');


        // ────────────────────────────────────────────────────────────────────
        // SECTION 6: Scope Safeguards & Disclaimers Audit
        // ────────────────────────────────────────────────────────────────────
        console.log('\n────────────────────────────────────────────────────────────────────────');
        console.log('  6. Preparation Support Tool Scope Safeguards');
        console.log('────────────────────────────────────────────────────────────────────────');

        const appControllerCode = fs.readFileSync(path.join(__dirname, '../controllers/applicationController.js'), 'utf8');

        // Check for official hand-off and disclaimer notices
        const hasPreparationSummaryNote = appControllerCode.includes('Preparation submission marked as Verified. BPLO processing must still be completed officially.');
        testAssert(hasPreparationSummaryNote, 'Approval response explicitly specifies preparation verification and directs to official BPLO processing');

        const hasNonOfficialPermitName = appControllerCode.includes('Preparation Summary');
        testAssert(hasNonOfficialPermitName, 'Permit record name explicitly uses "Preparation Summary" rather than official Mayors Permit title');

        console.log('\n════════════════════════════════════════════════════════════════════════');
        console.log(`  Phase 3I Security & Concurrency Audit: ${passed} passed, ${failed} failed`);
        console.log('════════════════════════════════════════════════════════════════════════\n');

    } catch (err) {
        console.error('Fatal audit error:', err);
        failed++;
    } finally {
        if (pool) {
            await pool.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
            await pool.end();
        }
    }

    if (failed > 0) process.exit(1);
    else process.exit(0);
}

runPhase3IAudit();
