const fs = require('fs');
const path = './backend/controllers/dashboardController.js';
let c = fs.readFileSync(path, 'utf8');
// Remove the stray extra closing brace after the return block
c = c.replace(
    "            });\n        }\n        }\n\n        // ============================================================\n        // BUSINESS OWNER",
    "            });\n        }\n\n        // ============================================================\n        // BUSINESS OWNER"
);
fs.writeFileSync(path, c);
console.log('Removed stray brace');
