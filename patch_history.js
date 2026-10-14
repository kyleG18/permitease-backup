const fs = require('fs');
const file = 'frontend/src/pages/Assessment.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const newCode = `            const reqs = isNewFormat ? [...(parsed.official_assessment || []), ...(parsed.ai_assessment?.recommended_permits || [])] : (parsed?.recommended_permits || []);`.split('\n');

const before = lines.slice(0, 262);
const after = lines.slice(263);
const finalLines = [...before, ...newCode, ...after];

fs.writeFileSync(file, finalLines.join('\n'));
console.log('Successfully replaced line 263');
