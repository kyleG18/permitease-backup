const fs = require('fs');
const path = './services/aiService.js';
let content = fs.readFileSync(path, 'utf8');

// The PSGC code for Roxas, Oriental Mindoro is '175212000' (from my DB query earlier)

const checkLguBlock = `
const targetLguId = '175212000'; // Municipality of Roxas, Oriental Mindoro
const isSupportedLgu = business.city_municipality_id === targetLguId;
`;

// Inject into generateStructuredAssessment
content = content.replace(
  'const generateStructuredAssessment = async (businessDescription, availablePermits) => {',
  `const generateStructuredAssessment = async (business, availablePermits) => {
    const businessDescription = typeof business === 'string' ? JSON.parse(business) : business;
    ${checkLguBlock}`
);

// We need to pass business object instead of stringified businessDescription to generateStructuredAssessment
// wait, the controller already passes businessDescription as a string sometimes, let's fix the controller later or handle it here.

// But wait, the easiest way is to modify the prompt inside generateStructuredAssessment
content = content.replace(
  /Take into account the full business context, including:[\s\S]*?BPLO\./,
  `Take into account the full business context, including:
- Ownership Type: \${businessDescription.ownership_type}
- Primary Products/Services: \${businessDescription.primary_products}
- Complete Address: \${businessDescription.address}
- Specific Location IDs: (Province: \${businessDescription.province_id}, City: \${businessDescription.city_municipality_id})
- Conditional Business Characteristics: \${businessDescription.business_characteristics || 'None provided'}

IMPORTANT LOCATION RULE: 
If the city_municipality_id is NOT '175212000' (Municipality of Roxas, Oriental Mindoro), YOU MUST output an empty array for recommended_permits and include a clear message in your reasoning: "PermitEase currently provides detailed permit preparation and estimation features for the Municipality of Roxas, Oriental Mindoro. Your location has been saved, but LGU-specific permit assessment is not currently configured for this location." DO NOT invent or assume requirements for unsupported LGUs.`
);

// Inject into generateFeeEstimate
content = content.replace(
  'const generateFeeEstimate = async (business, configuredRules) => {',
  `const generateFeeEstimate = async (business, configuredRules) => {
    ${checkLguBlock}`
);

content = content.replace(
  /1\. Analyze the business profile:[\s\S]*?\n\n/i,
  `1. Analyze the business profile.
  
IMPORTANT LOCATION RULE:
If the business city_municipality_id is NOT '175212000' (Municipality of Roxas, Oriental Mindoro), YOU MUST return empty arrays for taxes and regulatory_fees, total_estimated_amount = 0, and the summary must state: "PermitEase currently provides detailed permit preparation and estimation features for the Municipality of Roxas, Oriental Mindoro. Your location has been saved, but detailed LGU-specific tax and fee estimation is not currently configured for this location." DO NOT fabricate tax or fee amounts for unsupported LGUs.

`
);

fs.writeFileSync(path, content);
console.log('Patched aiService.js');
