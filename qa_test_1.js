const API = 'http://localhost:5000/api';

async function runTest() {
    console.log("=== SCENARIO 1: Roxas, Oriental Mindoro ===");
    
    // Login to get token
    let token = '';
    try {
        const loginRes = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'kylegstartclass18@gmail.com', password: 'password123' })
        });
        const data = await loginRes.json();
        token = data.token;
        if (token) console.log("Login SUCCESS");
        else { console.log("Login FAILED", data); return; }
    } catch (e) {
        console.log("Login FAILED", e);
        return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    // 1. Resolve Location Test
    try {
        const resolveRes = await fetch(`${API}/locations/resolve?islandGroup=2&region=170000000&province=175200000&city=175212000&barangay=175212015`);
        console.log("Location Resolve SUCCESS:", await resolveRes.json());
    } catch(e) {
        console.log("Location Resolve FAILED", e.message);
    }

    // 2. Fetch Dashboard Stats
    try {
        const dashRes = await fetch(`${API}/dashboard/stats`, { headers });
        console.log("Dashboard Stats SUCCESS:", await dashRes.json());
    } catch(e) {
        console.log("Dashboard Stats FAILED", e.message);
    }
}
runTest();
