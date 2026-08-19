const axios = require('axios');
const db = require('./config/db');
require('dotenv').config();

const API = 'http://localhost:5000/api';

const assert = (condition, message) => {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        throw new Error(message);
    }
    console.log(`✅ PASS: ${message}`);
};

async function runTests() {
    console.log('--- STARTING ONBOARDING API ACCEPTANCE TESTS ---');

    try {
        // Setup Users
        const ownerEmail = `onboard_owner_${Date.now()}@test.com`;
        
        // 1. Register new user
        const regRes = await axios.post(`${API}/auth/register`, {
            full_name: 'Test Onboard Owner',
            email: ownerEmail,
            password: 'password123',
            confirmPassword: 'password123',
            contact_number: '1234567890'
        });
        
        const userToken = regRes.data.token;
        const ownerHeaders = { headers: { 'Authorization': `Bearer ${userToken}` } };

        // 2. Fetch businesses (should be empty)
        const bizRes1 = await axios.get(`${API}/businesses`, ownerHeaders);
        assert(bizRes1.data.length === 0, 'New user has no businesses (Not Onboarded).');

        // 3. Create business (simulating onboarding submission)
        const newBizData = {
            business_name: 'Onboard Test Biz',
            business_type: 'Retail',
            industry_category: 'Convenience Store',
            business_status: 'New Application',
            address: '123 Onboard St',
            capitalization: '500000',
            gross_sales: '',
            floor_area: '50',
            employees: '3'
        };

        const createRes = await axios.post(`${API}/businesses`, newBizData, ownerHeaders);
        assert(createRes.status === 201, 'Business successfully created via existing API.');
        const bizId = createRes.data.id;
        assert(bizId != null, 'Business ID returned.');

        // 4. Fetch businesses again (should have 1)
        const bizRes2 = await axios.get(`${API}/businesses`, ownerHeaders);
        assert(bizRes2.data.length === 1, 'User now has 1 business (Onboarded).');

        // 5. Test Readiness immediately after
        const readyRes = await axios.get(`${API}/readiness/${bizId}?application_type=NEW`, ownerHeaders);
        assert(readyRes.status === 200, 'Readiness API works immediately after business creation.');
        assert(readyRes.data.overall_state !== undefined, 'Readiness returns overall_state.');

        console.log('\n--- TEST SUMMARY ---');
        console.log('Passed: 5');
        console.log('Failed: 0');
        
    } catch (error) {
        console.error('TEST FAILED:', error.response?.data || error.message);
        process.exit(1);
    }
}

runTests();
