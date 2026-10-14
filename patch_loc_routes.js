const fs = require('fs');
const path = './backend/routes/locationRoutes.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('resolveLocationNames')) {
    content = content.replace('getBarangays\n} = require(', 'getBarangays,\n  resolveLocationNames\n} = require(');
    content = content.replace("router.get('/barangays', getBarangays);", "router.get('/barangays', getBarangays);\nrouter.get('/resolve', resolveLocationNames);");
    fs.writeFileSync(path, content);
    console.log('Added resolveLocationNames to locationRoutes.js');
}
