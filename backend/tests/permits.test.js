const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const API = 'http://localhost:5000/api';

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
    if (condition) {
        console.log(`âœ… PASS: ${message}`);
        passed++;
    } else {
        console.error(`âŒ FAIL: ${message}`);
        failed++;
    }
};

const runTest = async () => {
    try {
        console.log('--- STARTING PERMIT GENERATION TESTS ---');
        
        // 1. Setup Users
        console.log('\\n[TEST SETUP] Creating test users and data...');
        const ownerEmail = `owner${Date.now()}@test.com`;
        const adminEmail = `admin${Date.now()}@test.com`;
        
        await db.query("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, 'password', 'business_owner')", ['Test Owner A', ownerEmail]);
        const [[ownerUser]] = await db.query("SELECT id FROM users WHERE email = ?", [ownerEmail]);
        const ownerId = ownerUser.id;

        await db.query("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, 'password', 'lgu_admin')", ['Test LGU Admin', adminEmail]);
        const [[adminUser]] = await db.query("SELECT id FROM users WHERE email = ?", [adminEmail]);
        
        const ownerEmailB = `ownerB${Date.now()}@test.com`;
        await db.query("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, 'password', 'business_owner')", ['Test Owner B', ownerEmailB]);
        const [[ownerUserB]] = await db.query("SELECT id FROM users WHERE email = ?", [ownerEmailB]);
        const ownerIdB = ownerUserB.id;

        await db.query("INSERT INTO businesses (user_id, business_name, business_type, address, industry_category) VALUES (?, 'Test Biz A', 'Retail', '123 Main St', 'Retail')", [ownerId]);
        const [[bizA]] = await db.query("SELECT id FROM businesses WHERE user_id = ?", [ownerId]);
        const businessId = bizA.id;

        const jwt = require('jsonwebtoken');
        const ownerToken = jwt.sign({ id: ownerId, role: 'business_owner' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
        const adminToken = jwt.sign({ id: adminUser.id, role: 'lgu_admin' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
        const owner2Token = jwt.sign({ id: ownerIdB, role: 'business_owner' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
        
        const ownerHeaders = { headers: { 'Authorization': `Bearer ${ownerToken}` } };
        const adminHeaders = { headers: { 'Authorization': `Bearer ${adminToken}` } };
        const owner2Headers = { headers: { 'Authorization': `Bearer ${owner2Token}` } };

        // 2. Create Application & Push to APPROVED
        console.log('\\n[TEST SETUP] Creating and approving application...');

        // Clean up prior permits for this business
        await db.query("DELETE FROM permits WHERE business_id = ?", [businessId]);
        await db.query("DELETE FROM applications WHERE business_id = ?", [businessId]);

        // Create
        let appRes = await axios.post(`${API}/applications`, { business_id: businessId, application_type: 'NEW' }, ownerHeaders);
        const appId = appRes.data.id;
        
        // Submit
        await axios.post(`${API}/applications/${appId}/submit`, {}, ownerHeaders);
        
        // Review
        await axios.post(`${API}/applications/admin/${appId}/start-review`, {}, adminHeaders);

        // Approve (This should trigger Permit generation)
        const approveRes = await axios.post(`${API}/applications/admin/${appId}/approve`, {}, adminHeaders);
        assert(approveRes.data.status === 'APPROVED', 'Application transitions to APPROVED');

        // 3. Verify Permit Record
        console.log('\\n[TEST] Verifying Permit Generation');
        const [permits] = await db.query('SELECT * FROM permits WHERE application_id = ?', [appId]);
        assert(permits.length === 1, 'Exactly one permit record generated');
        const permit = permits[0];
        
        assert(permit.verification_code != null, 'Verification code generated');
        assert(permit.verification_code.startsWith('BP-'), 'Verification code format is correct');
        assert(permit.pdf_path != null, 'PDF path is populated');

        // 4. Verify PDF Document exists
        const pdfFile = path.join(__dirname, '../uploads', permit.pdf_path);
        assert(fs.existsSync(pdfFile), 'PDF document exists on filesystem');

        // 5. Test Duplicate Prevention (Idempotency)
        console.log('\\n[TEST] Duplicate Prevention (Idempotency)');
        const duplicateApproveRes = await axios.post(`${API}/applications/admin/${appId}/approve`, {}, adminHeaders);
        assert(duplicateApproveRes.status === 200, 'Duplicate approval attempt handled gracefully');
        const [duplicatePermits] = await db.query('SELECT * FROM permits WHERE application_id = ?', [appId]);
        assert(duplicatePermits.length === 1, 'No duplicate permits created');

        // 6. Test Public Verification Endpoint
        console.log('\\n[TEST] Public Verification Endpoint');
        const verifyRes = await axios.get(`${API}/permits/verify/${permit.verification_code}`);
        assert(verifyRes.data.status === 'VALID' || verifyRes.data.status === 'EXPIRED', 'Verification returns VALID or EXPIRED status');
        assert(verifyRes.data.data.permit_number === permit.permit_number, 'Verification returns correct permit number');
        assert(!verifyRes.data.data.pdf_path, 'Verification does not expose sensitive data (e.g. pdf_path)');

        try {
            await axios.get(`${API}/permits/verify/INVALIDCODE123`);
            assert(false, 'Invalid verification code returned 200');
        } catch (e) {
            assert(e.response && e.response.status === 404, 'Invalid verification code returns 404 INVALID');
        }

        // 7. Test PDF Download Security
        console.log('\\n[TEST] PDF Download Security');
        const downloadRes = await axios.get(`${API}/permits/${permit.id}/download`, { ...ownerHeaders, responseType: 'stream' });
        assert(downloadRes.status === 200, 'Business Owner can download their own permit');
        
        try {
            await axios.get(`${API}/permits/${permit.id}/download`, owner2Headers);
            assert(false, 'Unauthorized owner accessed download endpoint');
        } catch (e) {
            assert(e.response && e.response.status === 403, 'Unauthorized owner blocked from downloading permit');
        }

        console.log('\\n--- TEST SUMMARY ---');
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        
        process.exit(failed > 0 ? 1 : 0);

    } catch (e) {
        console.error('Test Execution Error:', e.message);
        if (e.response) {
            console.error('Response Data:', e.response.data);
            console.error('Response Status:', e.response.status);
        }
        process.exit(1);
    }
};

runTest();
