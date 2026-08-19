const axios = require('axios');
const db = require('./config/db');

const API = 'http://localhost:5000/api';

async function runTest() {
    console.log('--- STARTING PERMIT APPLICATION WORKFLOW ACCEPTANCE TEST ---');
    let passed = 0;
    let failed = 0;

    const assert = (condition, message) => {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failed++;
        }
    };

    try {
        // Setup Users
        console.log('\\n[SETUP] Creating test users and data...');
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
        const bizIdA = bizA.id;
        
        await db.query("INSERT INTO businesses (user_id, business_name, business_type, address, industry_category) VALUES (?, 'Test Biz B', 'Food', '456 Side St', 'Food')", [ownerIdB]);
        const [[bizB]] = await db.query("SELECT id FROM businesses WHERE user_id = ?", [ownerIdB]);
        const bizIdB = bizB.id;

        const jwt = require('jsonwebtoken');
        const ownerToken = jwt.sign({ id: ownerId, role: 'business_owner' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
        const adminToken = jwt.sign({ id: adminUser.id, role: 'lgu_admin' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
        const ownerTokenB = jwt.sign({ id: ownerIdB, role: 'business_owner' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
        
        const ownerHeaders = { headers: { 'Authorization': `Bearer ${ownerToken}` } };
        const adminHeaders = { headers: { 'Authorization': `Bearer ${adminToken}` } };
        const ownerBHeaders = { headers: { 'Authorization': `Bearer ${ownerTokenB}` } };

        // Test 1: Business Owner creates a New Business Permit application. Expected: DRAFT.
        console.log('\\n[TEST 1] Create DRAFT Application');
        const createRes = await axios.post(`${API}/applications`, { business_id: bizIdA, application_type: 'NEW' }, ownerHeaders);
        const createdData = createRes.data;
        assert(createRes.status === 201 && createdData.status === 'DRAFT', 'Application created in DRAFT status');
        const appId = createdData.id;

        // Test 2: Business Owner leaves and returns to the application. Expected: Draft remains available.
        console.log('\\n[TEST 2] Retrieve DRAFT Application');
        const getRes = await axios.get(`${API}/applications/${appId}`, ownerHeaders);
        const getData = getRes.data;
        assert(getData.id === appId && getData.status === 'DRAFT', 'Draft retrieved successfully');

        // Test 3: Business Owner attempts to submit an incomplete application.
        console.log('\\n[TEST 3] Submit incomplete application');
        await db.query("UPDATE businesses SET address = '' WHERE id = ?", [bizIdA]);
        try {
            await axios.post(`${API}/applications/${appId}/submit`, {}, ownerHeaders);
            assert(false, 'Should have blocked submission of incomplete application');
        } catch (err) {
            assert(err.response && err.response.status === 400, 'Submission of incomplete application blocked');
        }
        await db.query("UPDATE businesses SET address = '123 Main St' WHERE id = ?", [bizIdA]); // Restore

        // Test 4: Business Owner completes the application and submits.
        console.log('\\n[TEST 4] Submit complete application');
        const submitRes = await axios.post(`${API}/applications/${appId}/submit`, {}, ownerHeaders);
        const submitData = submitRes.data;
        assert(submitRes.status === 200 && submitData.status === 'SUBMITTED', 'DRAFT -> SUBMITTED');
        assert(submitData.application_number && submitData.application_number.startsWith('BP-'), 'Unique BP-YYYY-NNNNN generated');

        // Test 5: LGU Admin logs in. Expected: Submitted application appears.
        console.log('\\n[TEST 5] LGU Admin views applications');
        const adminGetRes = await axios.get(`${API}/applications/admin/all`, adminHeaders);
        const adminGetData = adminGetRes.data;
        const foundApp = adminGetData.find(a => a.id === appId);
        assert(foundApp && foundApp.status === 'SUBMITTED', 'Admin sees submitted application');

        // Test 6: LGU Admin starts review. Expected: SUBMITTED -> UNDER_REVIEW
        console.log('\\n[TEST 6] LGU Admin starts review');
        const reviewRes = await axios.post(`${API}/applications/admin/${appId}/start-review`, {}, adminHeaders);
        const reviewData = reviewRes.data;
        assert(reviewRes.status === 200 && reviewData.status === 'UNDER_REVIEW', 'SUBMITTED -> UNDER_REVIEW');

        // Test 7: LGU Admin requests correction with a reason. Expected: UNDER_REVIEW -> NEEDS_CORRECTION
        console.log('\\n[TEST 7] Request Correction');
        const correctRes = await axios.post(`${API}/applications/admin/${appId}/request-correction`, { correction_notes: 'Missing ID copy.' }, adminHeaders);
        const correctData = correctRes.data;
        assert(correctRes.status === 200 && correctData.status === 'NEEDS_CORRECTION', 'UNDER_REVIEW -> NEEDS_CORRECTION');
        
        // Check if owner sees reason
        const getCorrectedRes = await axios.get(`${API}/applications/${appId}`, ownerHeaders);
        const getCorrectedData = getCorrectedRes.data;
        assert(getCorrectedData.correction_notes === 'Missing ID copy.', 'Correction reason stored and visible to Owner');

        // Test 8: Business Owner corrects the application and resubmits.
        console.log('\\n[TEST 8] Business Owner resubmits');
        const resubmitRes = await axios.post(`${API}/applications/${appId}/submit`, {}, ownerHeaders);
        const resubmitData = resubmitRes.data;
        assert(resubmitRes.status === 200 && resubmitData.status === 'SUBMITTED', 'NEEDS_CORRECTION -> SUBMITTED');
        assert(resubmitData.application_number === submitData.application_number, 'Same application number retained');

        // Test 9: LGU Admin reviews the corrected application. Expected: SUBMITTED -> UNDER_REVIEW
        console.log('\\n[TEST 9] Admin re-reviews');
        await axios.post(`${API}/applications/admin/${appId}/start-review`, {}, adminHeaders);
        const getReviewRes2 = await axios.get(`${API}/applications/${appId}`, adminHeaders);
        const getReviewData2 = getReviewRes2.data;
        assert(getReviewData2.status === 'UNDER_REVIEW', 'SUBMITTED -> UNDER_REVIEW (Again)');

        // Test 10: Test approval. Expected: UNDER_REVIEW -> APPROVED.
        console.log('\\n[TEST 10] Approve Application');
        const approveRes = await axios.post(`${API}/applications/admin/${appId}/approve`, {}, adminHeaders);
        const approveData = approveRes.data;
        assert(approveRes.status === 200 && approveData.status === 'APPROVED', 'UNDER_REVIEW -> APPROVED');

        // Test 11: Test rejection using another test application.
        console.log('\\n[TEST 11] Reject Application (Create new app for rejection)');
        const c2Res = await axios.post(`${API}/applications`, { business_id: bizIdB, application_type: 'NEW' }, ownerBHeaders);
        const app2Id = c2Res.data.id;
        await axios.post(`${API}/applications/${app2Id}/submit`, {}, ownerBHeaders);
        await axios.post(`${API}/applications/admin/${app2Id}/start-review`, {}, adminHeaders);
        
        // Reject without reason (should fail)
        try {
            await axios.post(`${API}/applications/admin/${app2Id}/reject`, {}, adminHeaders);
            assert(false, 'Should have blocked rejection without a reason');
        } catch (err) {
            assert(err.response && err.response.status === 400, 'Rejection blocked without a reason');
        }
        
        // Reject with reason
        const rejectRes = await axios.post(`${API}/applications/admin/${app2Id}/reject`, { rejection_reason: 'Non-compliant.' }, adminHeaders);
        const rejectData = rejectRes.data;
        assert(rejectRes.status === 200 && rejectData.status === 'REJECTED', 'UNDER_REVIEW -> REJECTED');
        
        const getRejectRes = await axios.get(`${API}/applications/${app2Id}`, ownerBHeaders);
        const getRejectData = getRejectRes.data;
        assert(getRejectData.rejection_reason === 'Non-compliant.', 'Rejection reason stored and visible to Owner');

        // Test 12: Security test.
        console.log('\\n[TEST 12] RBAC / Security Tests');
        try {
            await axios.get(`${API}/applications/${appId}`, ownerBHeaders);
            assert(false, 'Owner B accessed Owner A application');
        } catch (err) {
            assert(err.response && err.response.status === 403, 'Owner B cannot access Owner A application');
        }
        
        try {
            await axios.get(`${API}/applications/admin/all`, ownerHeaders);
            assert(false, 'Business Owner accessed Admin route');
        } catch (err) {
            assert(err.response && (err.response.status === 403 || err.response.status === 401), 'Business Owner cannot access Admin /all route');
        }
        
        try {
            await axios.post(`${API}/applications/admin/${appId}/approve`, {}, ownerHeaders);
            assert(false, 'Business Owner accessed admin approve route');
        } catch (err) {
            assert(err.response && (err.response.status === 403 || err.response.status === 401), 'Business Owner cannot call approve action');
        }
        
        try {
            await axios.post(`${API}/applications/${app2Id}/submit`, {}, ownerHeaders);
            assert(false, 'Owner A submitted Owner B application');
        } catch (err) {
            assert(err.response && err.response.status === 403, 'Owner A cannot submit Owner B application');
        }

        // Test 13: Verify application history.
        console.log('\\n[TEST 13] Verify application history');
        const histRes = await axios.get(`${API}/applications/${appId}/history`, adminHeaders);
        const histData = histRes.data;
        const actions = histData.map(h => h.action);
        const expectedActions = ['Application Created', 'Application Submitted', 'Review Started', 'Correction Requested', 'Application Resubmitted', 'Review Started', 'Application Approved'];
        assert(actions.join(',') === expectedActions.join(','), 'All status transitions recorded correctly in history');

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
}

runTest();
