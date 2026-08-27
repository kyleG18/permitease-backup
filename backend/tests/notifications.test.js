const axios = require('axios');
const db = require('../config/db');
require('dotenv').config();

const API = 'http://localhost:5000/api';
// Admin application actions are under /api/applications/admin/... NOT /api/admin/applications/...
const APP_ADMIN = `${API}/applications/admin`;
// process-renewal-reminders is under /api/admin/...
const ADMIN_API = `${API}/admin`;

let userToken = '';
let userId = '';
let adminToken = '';
let businessId = '';
let appId = '';
let permitId = '';

const delay = ms => new Promise(res => setTimeout(res, ms));

const setupTests = async () => {
    console.log('\n[TEST SETUP] Creating test users and data...');
    try {
        const uRes = await axios.post(`${API}/auth/register`, {
            full_name: 'Notification Test User',
            email: `notiftest_${Date.now()}@test.com`,
            password: 'password123',
            confirmPassword: 'password123'
        });
        userToken = uRes.data.token;
        userId = uRes.data._id; // register returns _id not id

        // Login system_admin (has access to both admin routes and application admin routes)
        const aRes = await axios.post(`${API}/auth/login`, {
            email: 'admin@bizcheckpermit.gov.ph',
            password: 'admin123'
        });
        adminToken = aRes.data.token;

        const bRes = await axios.post(`${API}/businesses`, {
            business_name: 'Notification Bakery',
            business_type: 'Food & Beverage',
            industry_category: 'Retail',
            address: '123 Test St',
            employees: 5,
            business_status: 'New Application',
            date_established: '2020-01-01'
        }, { headers: { Authorization: `Bearer ${userToken}` } });
        businessId = bRes.data.id;

        // createDraft is POST /api/applications/ (not /draft)
        const appRes = await axios.post(`${API}/applications`, {
            business_id: businessId,
            application_type: 'NEW'
        }, { headers: { Authorization: `Bearer ${userToken}` } });
        appId = appRes.data.id;

    } catch (e) {
        console.error('Setup failed:', e.response ? e.response.data : e.message);
        process.exit(1);
    }
};

const assert = (condition, message) => {
    if (!condition) {
        console.error(`âŒ FAIL: ${message}`);
        throw new Error(message);
    }
    console.log(`âœ… PASS: ${message}`);
};

const checkNotification = async (type) => {
    const res = await axios.get(`${API}/notifications`, { headers: { Authorization: `Bearer ${userToken}` } });
    return res.data.find(n => n.type === type);
};

const runTests = async () => {
    let passed = 0;
    let failed = 0;

    const test = async (name, fn) => {
        try {
            await fn();
            passed++;
        } catch (e) {
            failed++;
            console.error(e.message);
        }
    };

    console.log('--- STARTING NOTIFICATION SYSTEM TESTS ---\n');
    await setupTests();

    const userHeaders = { headers: { Authorization: `Bearer ${userToken}` } };
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    await test('Application Submit Notification', async () => {
        await axios.post(`${API}/applications/${appId}/submit`, {}, userHeaders);
        await delay(500);
        const notif = await checkNotification('APPLICATION_SUBMITTED');
        assert(notif, 'Notification created for application submit');
        assert(notif.related_application_id === appId, 'Correct related application ID');
    });

    await test('Application Under Review Notification', async () => {
        await axios.post(`${APP_ADMIN}/${appId}/start-review`, {}, adminHeaders);
        await delay(500);
        const notif = await checkNotification('APPLICATION_UNDER_REVIEW');
        assert(notif, 'Notification created for under review');
    });

    await test('Correction Requested Notification', async () => {
        await axios.post(`${APP_ADMIN}/${appId}/request-correction`, { correction_notes: 'Fix address' }, adminHeaders);
        await delay(500);
        const notif = await checkNotification('CORRECTION_REQUESTED');
        assert(notif, 'Notification created for correction request');
        assert(notif.message.includes('Fix address'), 'Message includes actual LGU notes');
    });

    await test('Application Approved / Permit Issued Notification', async () => {
        // Resubmit
        await axios.post(`${API}/applications/${appId}/submit`, {}, userHeaders);
        // Review
        await axios.post(`${APP_ADMIN}/${appId}/start-review`, {}, adminHeaders);
        // Approve
        await axios.post(`${APP_ADMIN}/${appId}/approve`, {}, adminHeaders);
        await delay(500);

        const appNotif = await checkNotification('APPLICATION_APPROVED');
        assert(appNotif, 'Notification created for approval');

        const permitNotif = await checkNotification('PERMIT_ISSUED');
        assert(permitNotif, 'Notification created for permit issuance');
        
        permitId = permitNotif.related_permit_id;
        assert(permitId, 'Permit ID included in notification');
    });

    await test('Duplicate Notification Protection (Renewal Reminders)', async () => {
        // Get the actual user_id from the permit record (safer than from register response)
        const [permitRows] = await db.query('SELECT p.*, b.user_id FROM permits p JOIN businesses b ON p.business_id = b.id WHERE p.id = ?', [permitId]);
        const actualUserId = permitRows[0].user_id;

        // Manually adjust the permit expiration to trigger 60-day reminder
        await db.query(`UPDATE permits SET expiration_date = DATE_ADD(CURDATE(), INTERVAL 60 DAY) WHERE id = ?`, [permitId]);
        
        // Trigger manual processor via admin
        await axios.post(`${ADMIN_API}/process-renewal-reminders`, {}, adminHeaders);
        
        const notif = await checkNotification('RENEWAL_REMINDER');
        assert(notif, '60-day renewal reminder notification created');
        
        // Trigger again to test duplicate protection
        const processRes = await axios.post(`${ADMIN_API}/process-renewal-reminders`, {}, adminHeaders);
        assert(processRes.data.skipped > 0, 'Duplicate reminder was skipped (idempotent)');
        
        // Verify only ONE 60-day reminder exists for this permit
        const [rows] = await db.query(`SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND type = 'RENEWAL_REMINDER'`, [actualUserId]);
        assert(rows[0].count === 1, 'Only exactly one 60-day reminder notification exists');
    });

    await test('Expired Permit Notification', async () => {
        // Set to expired
        await db.query(`UPDATE permits SET expiration_date = DATE_SUB(CURDATE(), INTERVAL 5 DAY) WHERE id = ?`, [permitId]);
        
        await axios.post(`${ADMIN_API}/process-renewal-reminders`, {}, adminHeaders);
        const notif = await checkNotification('PERMIT_EXPIRED');
        assert(notif, 'Permit expired notification created');
    });

    await test('Notification Center / Unread Count', async () => {
        const resCount = await axios.get(`${API}/notifications/unread-count`, userHeaders);
        assert(resCount.data.count >= 6, 'Unread count is correct');
        
        const res = await axios.get(`${API}/notifications`, userHeaders);
        assert(res.data.length >= 6, 'All notifications retrieved');
        
        const notifId = res.data[0].id;
        await axios.put(`${API}/notifications/${notifId}/read`, {}, userHeaders);
        
        const resCount2 = await axios.get(`${API}/notifications/unread-count`, userHeaders);
        assert(resCount2.data.count === resCount.data.count - 1, 'Mark as read decrements count');
        
        await axios.put(`${API}/notifications/read-all`, {}, userHeaders);
        const resCount3 = await axios.get(`${API}/notifications/unread-count`, userHeaders);
        assert(resCount3.data.count === 0, 'Mark all as read sets count to 0');
    });

    console.log(`\n--- TEST SUMMARY ---`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
};

runTests();
